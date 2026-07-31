<?php
/**
 * Cross-device account endpoint for MistVil (static / PHP hosting).
 *
 * Accounts live here — in mistvil_users.json, SEPARATE from the public
 * mistvil_db.json — so a reader can register on one device and sign in from
 * any other. Security:
 *   - Only a salted password HASH (computed in the browser) is ever stored or
 *     compared here; the plaintext password never reaches the server.
 *   - This file is the ONLY reader of mistvil_users.json. The public GET
 *     /api/db never returns it, and .htaccess denies direct access, so email
 *     addresses and hashes are never exposed to visitors.
 *   - Every response strips the passwordHash before returning the user.
 *
 * POST /api/auth  {action, ...}
 *   register {email, username, passwordHash, avatar?, bio?}  -> {user} | 409
 *   login    {email, passwordHash}                            -> {user} | 401
 *   update   {id, email, passwordHash, updates:{...}}         -> {user} | 401
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$USERS_FILE = __DIR__ . '/mistvil_users.json';

function load_users($file) {
    if (file_exists($file)) {
        $raw = file_get_contents($file);
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
    }
    return array();
}

function save_users($file, $data) {
    $json = json_encode(array_values($data), JSON_UNESCAPED_UNICODE);
    if ($json === false) return false;
    $tmp = $file . '.tmp.' . getmypid();
    if (file_put_contents($tmp, $json, LOCK_EX) === false) { @unlink($tmp); return false; }
    if (!rename($tmp, $file)) { @unlink($tmp); return false; }
    return true;
}

// Never leak the credential hash to the client.
function public_user($u) {
    unset($u['passwordHash']);
    return $u;
}

/**
 * ---------------------------------------------------------------------------
 * Account-endpoint safety rails
 * ---------------------------------------------------------------------------
 * register/login/update are all read-modify-write over one shared file, and
 * they are the only endpoint that touches credentials, so they need three
 * things the first version did not have:
 *
 *  1. A LOCK. Two people registering at the same instant both read the same
 *     user list, both pass the "email already taken" check, and the second
 *     save silently overwrites the first — the earlier account simply ceases
 *     to exist. Serialize the whole operation on a sidecar lock file.
 *
 *  2. INPUT LIMITS. Every field arrives from a browser. Without caps one
 *     request can push a multi-megabyte "bio" into the accounts file, which
 *     every later login then has to read and rewrite; a malformed address can
 *     also permanently occupy an email nobody can recover.
 *
 *  3. A BRUTE-FORCE BRAKE. The password hash is computed in the browser, so
 *     login is a plain hash comparison an attacker can hammer offline-fast.
 *     Throttle repeated failures per email+IP.
 */
function auth_lock($file) {
    $fh = @fopen($file . '.lock', 'c');
    if ($fh) { @flock($fh, LOCK_EX); }
    return $fh;
}
function auth_unlock($fh) {
    if ($fh) { @flock($fh, LOCK_UN); @fclose($fh); }
}

// Migration also comes through 'register': signing in with a legacy local
// account pushes it up so it works on every device. Its earned progress must
// survive that trip — hard-zeroing xp/level here would wipe the reading
// history of every member who predates the account server. Accept the values
// but clamp them to sane integers so they can't be inflated arbitrarily.
function auth_progress($raw, $min, $max) {
    $n = is_numeric($raw) ? (int)$raw : $min;
    if ($n < $min) $n = $min;
    if ($n > $max) $n = $max;
    return $n;
}

function valid_email($email) {
    return is_string($email)
        && strlen($email) <= 190
        && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Longest value accepted per field. Avatars and banners are base64 data URIs
// produced by the client-side image compressor, so they get a larger budget
// than text fields but are still bounded.
function auth_field_limit($field) {
    if ($field === 'avatar' || $field === 'banner') return 1500000;
    if ($field === 'bio') return 1000;
    if ($field === 'username') return 40;
    return 300;
}
function auth_clip($field, $value) {
    if (!is_string($value)) return $value;
    $max = auth_field_limit($field);
    if (function_exists('mb_substr') && mb_strlen($value, 'UTF-8') > $max) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    if (strlen($value) > $max) return substr($value, 0, $max);
    return $value;
}

// Failed-login throttle: at most AUTH_MAX_FAILS failures per email+IP inside
// AUTH_WINDOW seconds. Counters live in a small sidecar file and expire on
// their own, so nothing has to be cleaned up by hand.
define('AUTH_MAX_FAILS', 10);
define('AUTH_WINDOW', 900);

function throttle_file($usersFile) { return $usersFile . '.throttle.json'; }
function throttle_key($email) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0';
    return md5(strtolower((string)$email) . '|' . $ip);
}
function throttle_load($usersFile) {
    $f = throttle_file($usersFile);
    if (!file_exists($f)) return array();
    $d = json_decode(@file_get_contents($f), true);
    if (!is_array($d)) return array();
    $now = time();
    foreach ($d as $k => $v) {
        if (!is_array($v) || !isset($v['at']) || ($now - (int)$v['at']) > AUTH_WINDOW) unset($d[$k]);
    }
    return $d;
}
function throttle_blocked($usersFile, $email) {
    $d = throttle_load($usersFile);
    $k = throttle_key($email);
    return isset($d[$k]) && (int)$d[$k]['n'] >= AUTH_MAX_FAILS;
}
function throttle_fail($usersFile, $email) {
    $d = throttle_load($usersFile);
    $k = throttle_key($email);
    $n = isset($d[$k]) ? (int)$d[$k]['n'] + 1 : 1;
    $d[$k] = array('n' => $n, 'at' => time());
    @file_put_contents(throttle_file($usersFile), json_encode($d), LOCK_EX);
}
function throttle_clear($usersFile, $email) {
    $d = throttle_load($usersFile);
    unset($d[throttle_key($email)]);
    @file_put_contents(throttle_file($usersFile), json_encode($d), LOCK_EX);
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(array('error' => 'Method not allowed'));
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(array('error' => 'Invalid JSON payload'));
    exit;
}

$action = isset($body['action']) ? $body['action'] : '';
$email = isset($body['email']) ? strtolower(trim($body['email'])) : '';
$hash = isset($body['passwordHash']) ? (string)$body['passwordHash'] : '';

if ($email === '' || $hash === '') {
    http_response_code(400);
    echo json_encode(array('error' => 'Missing email or credentials'));
    exit;
}
// The owner account is verified in the browser and is never stored here.
if ($email === 'mistvil112@gmail.com') {
    http_response_code(403);
    echo json_encode(array('error' => 'This email is reserved for the platform owner'));
    exit;
}

if (!valid_email($email)) {
    http_response_code(400);
    echo json_encode(array('error' => 'Please enter a valid email address.'));
    exit;
}
// Too many recent failures from this email+IP: stop answering instead of
// letting an attacker keep guessing.
if (($action === 'login' || $action === 'update') && throttle_blocked($USERS_FILE, $email)) {
    http_response_code(429);
    echo json_encode(array('error' => 'Too many attempts. Please try again in a few minutes.'));
    exit;
}

// Hold the lock for the whole read-modify-write so two simultaneous requests
// can't both decide the email is free and then overwrite one another.
$lock = auth_lock($USERS_FILE);
$users = load_users($USERS_FILE);
$findIndexByEmail = function ($list, $email) {
    foreach ($list as $i => $u) {
        if (isset($u['email']) && strtolower($u['email']) === $email) return $i;
    }
    return -1;
};
$idx = $findIndexByEmail($users, $email);

if ($action === 'register') {
    if ($idx !== -1) {
        auth_unlock($lock);
        http_response_code(409);
        echo json_encode(array('error' => 'This email is already registered.'));
        exit;
    }
    $username = isset($body['username']) ? auth_clip('username', trim($body['username'])) : '';
    if ($username === '') {
        auth_unlock($lock);
        http_response_code(400);
        echo json_encode(array('error' => 'Username is required.'));
        exit;
    }
    // Two accounts sharing an id would collide everywhere the site looks a
    // member up by id (comments, profiles, badges), so a client-supplied id
    // is only honoured when it is genuinely unused.
    $wantedId = isset($body['id']) && is_string($body['id']) ? trim($body['id']) : '';
    if ($wantedId !== '') {
        foreach ($users as $u) {
            if (isset($u['id']) && $u['id'] === $wantedId) { $wantedId = ''; break; }
        }
    }
    $user = array(
        'id' => $wantedId !== '' ? $wantedId : ('user-' . time() . '-' . substr(md5(uniqid('', true)), 0, 6)),
        'username' => $username,
        'email' => $email,
        'role' => 'MEMBER',
        'xp' => auth_progress(isset($body['xp']) ? $body['xp'] : 0, 0, 100000000),
        'level' => auth_progress(isset($body['level']) ? $body['level'] : 1, 1, 1000),
        'avatar' => isset($body['avatar']) ? auth_clip('avatar', $body['avatar']) : '',
        'bio' => isset($body['bio']) ? auth_clip('bio', $body['bio']) : '',
        'passwordHash' => $hash,
        'createdAt' => gmdate('c'),
    );
    $users[] = $user;
    $saved = save_users($USERS_FILE, $users);
    auth_unlock($lock);
    if (!$saved) {
        http_response_code(500);
        echo json_encode(array('error' => 'Could not save the account. Please try again.'));
        exit;
    }
    echo json_encode(array('user' => public_user($user)));
    exit;
}

if ($action === 'login') {
    if ($idx === -1 || !isset($users[$idx]['passwordHash']) || !hash_equals((string)$users[$idx]['passwordHash'], $hash)) {
        auth_unlock($lock);
        throttle_fail($USERS_FILE, $email);
        http_response_code(401);
        echo json_encode(array('error' => 'Incorrect email or password.'));
        exit;
    }
    $out = public_user($users[$idx]);
    auth_unlock($lock);
    throttle_clear($USERS_FILE, $email);
    echo json_encode(array('user' => $out));
    exit;
}

if ($action === 'update') {
    if ($idx === -1 || !isset($users[$idx]['passwordHash']) || !hash_equals((string)$users[$idx]['passwordHash'], $hash)) {
        auth_unlock($lock);
        throttle_fail($USERS_FILE, $email);
        http_response_code(401);
        echo json_encode(array('error' => 'Not authorized to update this account.'));
        exit;
    }
    throttle_clear($USERS_FILE, $email);
    $updates = isset($body['updates']) && is_array($body['updates']) ? $body['updates'] : array();
    // Only profile-display fields can be changed here — never role, email, or
    // the credential hash.
    $allowed = array('username', 'avatar', 'bio', 'banner', 'discord', 'telegram', 'paypalEmail', 'supportLink', 'socialLinks', 'customStatus');
    foreach ($allowed as $f) {
        if (array_key_exists($f, $updates)) $users[$idx][$f] = auth_clip($f, $updates[$f]);
    }
    $saved = save_users($USERS_FILE, $users);
    $out = public_user($users[$idx]);
    auth_unlock($lock);
    if (!$saved) {
        http_response_code(500);
        echo json_encode(array('error' => 'Could not save profile changes.'));
        exit;
    }
    echo json_encode(array('user' => $out));
    exit;
}

auth_unlock($lock);
http_response_code(400);
echo json_encode(array('error' => 'Unknown action'));
