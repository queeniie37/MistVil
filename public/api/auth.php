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
        http_response_code(409);
        echo json_encode(array('error' => 'This email is already registered.'));
        exit;
    }
    $username = isset($body['username']) ? trim($body['username']) : '';
    if ($username === '') {
        http_response_code(400);
        echo json_encode(array('error' => 'Username is required.'));
        exit;
    }
    $user = array(
        'id' => isset($body['id']) && is_string($body['id']) ? $body['id'] : ('user-' . time() . '-' . substr(md5(uniqid('', true)), 0, 6)),
        'username' => $username,
        'email' => $email,
        'role' => 'MEMBER',
        'xp' => 0,
        'level' => 1,
        'avatar' => isset($body['avatar']) ? $body['avatar'] : '',
        'bio' => isset($body['bio']) ? $body['bio'] : '',
        'passwordHash' => $hash,
        'createdAt' => gmdate('c'),
    );
    $users[] = $user;
    if (!save_users($USERS_FILE, $users)) {
        http_response_code(500);
        echo json_encode(array('error' => 'Could not save the account. Please try again.'));
        exit;
    }
    echo json_encode(array('user' => public_user($user)));
    exit;
}

if ($action === 'login') {
    if ($idx === -1 || !isset($users[$idx]['passwordHash']) || !hash_equals((string)$users[$idx]['passwordHash'], $hash)) {
        http_response_code(401);
        echo json_encode(array('error' => 'Incorrect email or password.'));
        exit;
    }
    echo json_encode(array('user' => public_user($users[$idx])));
    exit;
}

if ($action === 'update') {
    if ($idx === -1 || !isset($users[$idx]['passwordHash']) || !hash_equals((string)$users[$idx]['passwordHash'], $hash)) {
        http_response_code(401);
        echo json_encode(array('error' => 'Not authorized to update this account.'));
        exit;
    }
    $updates = isset($body['updates']) && is_array($body['updates']) ? $body['updates'] : array();
    // Only profile-display fields can be changed here — never role, email, or
    // the credential hash.
    $allowed = array('username', 'avatar', 'bio', 'banner', 'discord', 'telegram', 'paypalEmail', 'supportLink', 'socialLinks', 'customStatus');
    foreach ($allowed as $f) {
        if (array_key_exists($f, $updates)) $users[$idx][$f] = $updates[$f];
    }
    if (!save_users($USERS_FILE, $users)) {
        http_response_code(500);
        echo json_encode(array('error' => 'Could not save profile changes.'));
        exit;
    }
    echo json_encode(array('user' => public_user($users[$idx])));
    exit;
}

http_response_code(400);
echo json_encode(array('error' => 'Unknown action'));
