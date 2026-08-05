<?php
/**
 * Server-side prerender for novel and chapter pages.
 *
 * The site is a single-page app: without this, every URL returns the same empty
 * shell and the real title/description/text only appear after the browser runs
 * JavaScript. Search engines then have to render the page before they can index
 * it, which is slow and unreliable — so a freshly published chapter could take
 * days to show up, or never rank at all.
 *
 * This script serves the SAME index.html (so the app still boots normally for
 * readers) but with the correct <title>, description, canonical, Open Graph and
 * schema.org data filled in, plus the actual chapter text inside #root. Crawlers
 * get complete, indexable content on the very first request; React clears the
 * placeholder and takes over for humans.
 */

$SITE = 'https://mistvil.online';
$DB_FILE = __DIR__ . '/mistvil_db.json';
$INDEX = dirname(__DIR__) . '/index.html';

if (!file_exists($INDEX)) {
    http_response_code(404);
    exit('index.html missing');
}
$html = file_get_contents($INDEX);

function slugify_title($raw) {
    if (!is_string($raw) || $raw === '') return '';
    $s = strtolower($raw);
    $s = preg_replace('/[\'"`]/u', '', $s);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    $s = trim($s, '-');
    return substr($s, 0, 80);
}
function chapter_number_of($c) {
    $n = isset($c['number']) ? $c['number'] : (isset($c['chapterNumber']) ? $c['chapterNumber'] : null);
    return is_numeric($n) ? (int)$n : null;
}
// Chapter bodies embed base64 images; strip tags entirely so the prerendered
// page stays small and text-only.
function plain_text($raw, $limit = 6000) {
    if (!is_string($raw)) return '';
    $t = preg_replace('/<img[^>]*>/i', '', $raw);
    $t = preg_replace('/<[^>]+>/', ' ', $t);
    $t = html_entity_decode($t, ENT_QUOTES, 'UTF-8');
    $t = preg_replace('/\s+/u', ' ', $t);
    $t = trim($t);
    if (function_exists('mb_substr')) {
        if (mb_strlen($t, 'UTF-8') > $limit) $t = mb_substr($t, 0, $limit, 'UTF-8') . '…';
    } elseif (strlen($t) > $limit) {
        $t = substr($t, 0, $limit) . '…';
    }
    return $t;
}
function clip($t, $limit) {
    if (function_exists('mb_substr')) {
        return mb_strlen($t, 'UTF-8') > $limit ? mb_substr($t, 0, $limit, 'UTF-8') . '…' : $t;
    }
    return strlen($t) > $limit ? substr($t, 0, $limit) . '…' : $t;
}
function esc($t) {
    return htmlspecialchars((string)$t, ENT_QUOTES, 'UTF-8');
}

// A JSON-LD block is written INSIDE a <script> element, so the encoder must
// never emit a literal "</script>" — a novel title or author name containing
// one would close the tag early and everything after it would run as page
// script. JSON_HEX_TAG escapes the angle brackets into their unicode form,
// which is still valid JSON that search engines parse normally.
// (JSON_UNESCAPED_SLASHES is deliberately NOT used here.)
function json_ld_encode($data) {
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS);
}

// preg_replace() reads $1 / \1 in the REPLACEMENT string as backreferences, so
// a novel title containing "$1" (or a stray backslash) came out mangled in the
// <title> and description that search engines show. Escape both characters so
// the replacement is always taken literally.
function rep_literal($s) {
    return str_replace(array('\\', '$'), array('\\\\', '\$'), $s);
}

// Novels a search engine is allowed to see. Cancelled ones are gone and
// pending ones are not approved yet — neither should be advertised anywhere.
function public_novels($db) {
    $out = array();
    if (!is_array($db) || !isset($db['novels']) || !is_array($db['novels'])) return $out;
    foreach ($db['novels'] as $n) {
        if (!is_array($n)) continue;
        $st = isset($n['status']) ? $n['status'] : '';
        if ($st === 'CANCELLED' || $st === 'PENDING') continue;
        $out[] = $n;
    }
    return $out;
}

// Every published chapter, grouped by novel and ordered by chapter number.
// Built in ONE pass: the listing pages need the chapter list of every novel
// at once, and re-scanning the whole chapters array per novel turned that
// into a quadratic walk over the entire database on the busiest page.
function published_chapters_by_novel($db) {
    $out = array();
    if (!is_array($db) || !isset($db['chapters']) || !is_array($db['chapters'])) return $out;
    $now = time();
    foreach ($db['chapters'] as $c) {
        if (!is_array($c) || empty($c['novelId'])) continue;
        if (!empty($c['deleted'])) continue;
        // Scheduled chapters are not public yet.
        if (!empty($c['publishAt'])) {
            $pt = strtotime($c['publishAt']);
            if ($pt !== false && $pt > $now) continue;
        }
        if (chapter_number_of($c) === null) continue;
        $out[$c['novelId']][] = $c;
    }
    foreach ($out as $k => $list) {
        usort($list, function ($a, $b) { return chapter_number_of($a) - chapter_number_of($b); });
        $out[$k] = $list;
    }
    return $out;
}

// A URL that resolves to nothing has to SAY so. Serving the app shell with a
// 200 turned every dead link — an old slug, a typo, a deleted novel — into a
// "soft 404", and search engines hold those against the whole site.
function not_found($siteName) {
    http_response_code(404);
    header('X-Robots-Tag: noindex');
    return array(
        'Page not found | ' . $siteName,
        'This page does not exist on ' . $siteName . '.',
        '<main><h1>Page not found</h1>'
        . '<p>The page you asked for is not on ' . esc($siteName) . '.</p>'
        . '<p><a href="/">Homepage</a> · <a href="/novel/explore">Explore the library</a></p></main>'
    );
}

// When a chapter went live, as a sortable timestamp.
function chapter_time($c) {
    foreach (array('publishAt', 'createdAt', 'updatedAt') as $k) {
        if (!empty($c[$k])) {
            $t = strtotime($c[$k]);
            if ($t !== false) return $t;
        }
    }
    return 0;
}

// ---- Which screen was requested? -----------------------------------------
$reqPath = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$segs = array_values(array_filter(explode('/', trim((string)$reqPath, '/')), 'strlen'));
// Expected shape: novel/<slug-or-page>[/<chapter-number>]
$slugOrPage = isset($segs[1]) ? rawurldecode($segs[1]) : '';
$chapterSeg = isset($segs[2]) && ctype_digit($segs[2]) ? (int)$segs[2] : null;

$siteName = 'MistVil';
$title = $siteName . ' | Premium Platform for Translated & Original Novels';
$description = 'Your premium platform to read, write, and translate exclusive fantasy novels and stories. Explore daily live chapters from translated Korean, Chinese, and Japanese novels, plus original works crafted to a high artistic standard.';
$canonical = $SITE . (string)$reqPath;
$bodyHtml = '';
$jsonLd = '';

$RESERVED = array('home','explore','suggestions','teams','notifications','profile','profile-edit','translator-panel','admin','ads','privacy-policy','terms-of-service','contact-us');

// Screens that belong to one visitor (or to staff) hold nothing a search
// engine should keep — no stable content, and some of it private.
$PRIVATE_SCREENS = array('notifications', 'profile', 'profile-edit', 'translator-panel', 'admin');

// ---- The shared database, loaded once ------------------------------------
$db = null;
if (file_exists($DB_FILE)) {
    $decoded = json_decode(file_get_contents($DB_FILE), true);
    if (is_array($decoded) && isset($decoded['novels']) && is_array($decoded['novels'])) {
        $db = $decoded;
    }
}
if ($db !== null && isset($db['site_name']) && is_string($db['site_name']) && trim($db['site_name']) !== '') {
    $siteName = trim($db['site_name']);
    // The default title was built from the placeholder name above, before the
    // database was read. Rebuild it, or the homepage goes out titled with a
    // name the owner already renamed.
    $title = $siteName . ' | Premium Platform for Translated & Original Novels';
}

// ---- Home page and fixed screens -----------------------------------------
// The site ROOT is the one URL every search engine starts from, and it used to
// be served as the bare single-page-app shell: right meta tags, but an empty
// <div id="root">. A crawler that does not run JavaScript saw a page with no
// words in it and no links out of it — nothing to index, and no route into the
// novels. The fixed screens had the same problem AND shared one identical
// title, which reads as a pile of duplicate pages.
if ($slugOrPage === '' || in_array($slugOrPage, $RESERVED, true)) {
    $isHome = ($slugOrPage === '' || $slugOrPage === 'home');
    $canonical = $isHome ? ($SITE . '/') : ($SITE . '/novel/' . rawurlencode($slugOrPage));

    $SCREENS = array(
        'explore' => array(
            'Explore the Library | ' . $siteName,
            'Browse every translated and original novel on ' . $siteName . ' — fantasy, action and mystery titles, with new chapters published daily.'),
        'suggestions' => array(
            'Suggest a Novel | ' . $siteName,
            'Suggest a novel for the ' . $siteName . ' team to translate, and see what other readers have asked for.'),
        'teams' => array(
            'Translation Teams | ' . $siteName,
            'The translation teams behind the novels on ' . $siteName . ', and the titles each one works on.'),
        'ads' => array(
            'Advertise on ' . $siteName,
            'Advertising options for reaching readers on ' . $siteName . '.'),
        'contact-us' => array(
            'Contact Us | ' . $siteName,
            'Get in touch with the ' . $siteName . ' team about a novel, a translation, or a partnership.'),
        'privacy-policy' => array(
            'Privacy Policy | ' . $siteName,
            'How ' . $siteName . ' handles the data of readers, writers and translators.'),
        'terms-of-service' => array(
            'Terms of Service | ' . $siteName,
            'The terms that apply to reading, writing and translating on ' . $siteName . '.'),
    );
    if (!$isHome && isset($SCREENS[$slugOrPage])) {
        $title = $SCREENS[$slugOrPage][0];
        $description = $SCREENS[$slugOrPage][1];
    }
    if (!$isHome && in_array($slugOrPage, $PRIVATE_SCREENS, true)) {
        header('X-Robots-Tag: noindex, follow');
    }

    // The catalogue itself. These links are how a crawler reaches every novel
    // and, through the novel pages, every chapter — so both the homepage and
    // the library carry the full list rather than a JavaScript placeholder.
    if ($isHome || $slugOrPage === 'explore') {
        $byNovel = published_chapters_by_novel($db);
        $cards = '';
        $listLd = array();
        $recent = array();
        $pos = 0;

        foreach (public_novels($db) as $n) {
            $titleEn = isset($n['titleEn']) ? $n['titleEn'] : '';
            $titleAr = isset($n['titleAr']) ? $n['titleAr'] : '';
            $display = $titleEn !== '' ? $titleEn : $titleAr;
            if ($display === '') continue;
            $slug = slugify_title($titleEn);
            if ($slug === '') $slug = isset($n['id']) ? $n['id'] : '';
            if ($slug === '') continue;

            $href = '/novel/' . rawurlencode($slug);
            $blurb = clip(plain_text(isset($n['description']) ? $n['description'] : '', 400), 200);
            $chapters = isset($n['id']) && isset($byNovel[$n['id']]) ? $byNovel[$n['id']] : array();
            $author = isset($n['author']) ? $n['author'] : '';

            $cards .= '<li><h3><a href="' . $href . '">' . esc($display) . '</a></h3>'
                . ($author !== '' ? '<p>' . esc($author) . '</p>' : '')
                . ($blurb !== '' ? '<p>' . esc($blurb) . '</p>' : '')
                . '<p>' . count($chapters) . ' chapters</p></li>';

            $pos++;
            $listLd[] = array('@type' => 'ListItem', 'position' => $pos,
                'url' => $SITE . $href, 'name' => $display);

            foreach ($chapters as $c) {
                $recent[] = array(chapter_time($c), chapter_number_of($c), $display, $slug,
                    isset($c['title']) ? $c['title'] : '');
            }
        }

        // Newest chapters first: a crawler that returns to the homepage sees
        // straight away that the site changed, and gets a direct link to the
        // chapters that changed it.
        usort($recent, function ($a, $b) { return $b[0] - $a[0]; });
        $recent = array_slice($recent, 0, 30);
        $latest = '';
        foreach ($recent as $r) {
            $label = $r[4] !== '' ? $r[4] : ('Chapter ' . $r[1]);
            $latest .= '<li><a href="/novel/' . rawurlencode($r[3]) . '/' . $r[1] . '">'
                . esc($r[2] . ' — ' . $label) . '</a></li>';
        }

        $heading = $isHome ? $siteName : 'Explore the Library';
        $bodyHtml = '<main>'
            . '<h1>' . esc($heading) . '</h1>'
            . '<p>' . esc($description) . '</p>'
            . '<section><h2>Novels (' . $pos . ')</h2><ul>' . $cards . '</ul></section>'
            . ($latest !== '' ? '<section><h2>Latest chapters</h2><ul>' . $latest . '</ul></section>' : '')
            . '</main>';

        $jsonLd = json_ld_encode(array(
            '@context' => 'https://schema.org',
            '@type' => 'CollectionPage',
            'name' => $title,
            'description' => $description,
            'url' => $canonical,
            'inLanguage' => 'en',
            'isPartOf' => array('@type' => 'WebSite', 'name' => $siteName, 'url' => $SITE . '/'),
            'mainEntity' => array('@type' => 'ItemList', 'numberOfItems' => $pos,
                'itemListElement' => $listLd),
        ));
    } else {
        // A fixed screen with no catalogue on it still needs words: a heading
        // and its own description beat an empty <div> for both readers on a
        // slow connection and crawlers that never run the script.
        $bodyHtml = '<main><h1>' . esc($title) . '</h1><p>' . esc($description) . '</p>'
            . '<p><a href="/">' . esc($siteName) . '</a> · '
            . '<a href="/novel/explore">Explore the library</a></p></main>';
    }
}

if ($slugOrPage !== '' && !in_array($slugOrPage, $RESERVED, true)) {
    if (is_array($db) && isset($db['novels']) && is_array($db['novels'])) {
        // Find the novel by its English-title slug (id as a fallback).
        $novel = null;
        foreach ($db['novels'] as $n) {
            if (!is_array($n)) continue;
            $s = slugify_title(isset($n['titleEn']) ? $n['titleEn'] : '');
            if ($s === $slugOrPage || (isset($n['id']) && $n['id'] === $slugOrPage)) { $novel = $n; break; }
        }
        if ($novel !== null) {
            $status = isset($novel['status']) ? $novel['status'] : '';
            $isPublic = ($status !== 'CANCELLED' && $status !== 'PENDING');
            $titleEn = isset($novel['titleEn']) ? $novel['titleEn'] : '';
            $titleAr = isset($novel['titleAr']) ? $novel['titleAr'] : '';
            $display = $titleEn !== '' ? $titleEn : $titleAr;
            $author = isset($novel['author']) ? $novel['author'] : '';
            $slug = slugify_title($titleEn);
            if ($slug === '') $slug = isset($novel['id']) ? $novel['id'] : $slugOrPage;

            if (!$isPublic) {
                header('X-Robots-Tag: noindex');
            }

            // Published chapters of this novel, ordered by number.
            $now = time();
            $chapters = array();
            if (isset($db['chapters']) && is_array($db['chapters'])) {
                foreach ($db['chapters'] as $c) {
                    if (!is_array($c) || !isset($c['novelId']) || $c['novelId'] !== $novel['id']) continue;
                    if (!empty($c['deleted'])) continue;
                    if (!empty($c['publishAt'])) {
                        $pt = strtotime($c['publishAt']);
                        if ($pt !== false && $pt > $now) continue;
                    }
                    if (chapter_number_of($c) === null) continue;
                    $chapters[] = $c;
                }
            }
            usort($chapters, function ($a, $b) { return chapter_number_of($a) - chapter_number_of($b); });

            if ($chapterSeg !== null) {
                // ---------- Chapter page ----------
                $chapter = null;
                foreach ($chapters as $c) { if (chapter_number_of($c) === $chapterSeg) { $chapter = $c; break; } }
                if ($chapter !== null) {
                    $chTitleRaw = isset($chapter['title']) ? $chapter['title'] : '';
                    $parts = explode(':', $chTitleRaw, 2);
                    $chSub = isset($parts[1]) ? trim($parts[1]) : '';
                    $title = 'Chapter ' . $chapterSeg . ($chSub !== '' ? ': ' . $chSub : '') . ' of ' . $display . ' | ' . $siteName;
                    $text = plain_text(isset($chapter['content']) ? $chapter['content'] : '');
                    $description = clip($text !== '' ? $text : ('Read chapter ' . $chapterSeg . ' of ' . $display . ' on ' . $siteName . '.'), 300);
                    $canonical = $SITE . '/novel/' . rawurlencode($slug) . '/' . $chapterSeg;

                    $published = isset($chapter['publishAt']) && $chapter['publishAt'] ? $chapter['publishAt'] : (isset($chapter['createdAt']) ? $chapter['createdAt'] : '');
                    $ld = array(
                        '@context' => 'https://schema.org',
                        '@type' => 'Article',
                        'headline' => clip($title, 110),
                        'articleSection' => 'Chapter ' . $chapterSeg,
                        'inLanguage' => 'en',
                        'url' => $canonical,
                        'isPartOf' => array('@type' => 'Book', 'name' => $display, 'url' => $SITE . '/novel/' . rawurlencode($slug)),
                        'publisher' => array('@type' => 'Organization', 'name' => $siteName),
                    );
                    if ($published) { $ld['datePublished'] = gmdate('c', strtotime($published)); }
                    if ($author !== '') { $ld['author'] = array('@type' => 'Person', 'name' => $author); }
                    $jsonLd = json_ld_encode($ld);

                    // Previous/next links give crawlers a path through every chapter.
                    $prev = null; $next = null;
                    foreach ($chapters as $c) {
                        $n2 = chapter_number_of($c);
                        if ($n2 < $chapterSeg) { $prev = $n2; }
                        if ($n2 > $chapterSeg && $next === null) { $next = $n2; }
                    }
                    $nav = '';
                    if ($prev !== null) $nav .= '<a href="/novel/' . rawurlencode($slug) . '/' . $prev . '">Previous chapter</a> ';
                    if ($next !== null) $nav .= '<a href="/novel/' . rawurlencode($slug) . '/' . $next . '">Next chapter</a>';

                    $bodyHtml =
                        '<article>' .
                        '<h1>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h1>' .
                        '<p><a href="/novel/' . rawurlencode($slug) . '">' . htmlspecialchars($display, ENT_QUOTES, 'UTF-8') . '</a>' .
                        ($author !== '' ? ' — ' . htmlspecialchars($author, ENT_QUOTES, 'UTF-8') : '') . '</p>' .
                        '<div>' . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . '</div>' .
                        '<nav>' . $nav . '</nav>' .
                        '</article>';
                } else {
                    list($title, $description, $bodyHtml) = not_found($siteName);
                }
            } else {
                // ---------- Novel page ----------
                $title = $display . ($titleAr !== '' && $titleAr !== $display ? ' (' . $titleAr . ')' : '') . ' | ' . $siteName;
                $desc = plain_text(isset($novel['description']) ? $novel['description'] : '', 400);
                $description = clip($desc !== '' ? $desc : ('Read ' . $display . ' online on ' . $siteName . ' — new chapters published regularly.'), 300);
                $canonical = $SITE . '/novel/' . rawurlencode($slug);

                $ld = array(
                    '@context' => 'https://schema.org',
                    '@type' => 'Book',
                    'name' => $display,
                    'inLanguage' => 'en',
                    'url' => $canonical,
                    'numberOfPages' => count($chapters),
                    'publisher' => array('@type' => 'Organization', 'name' => $siteName),
                );
                if ($titleAr !== '') $ld['alternateName'] = $titleAr;
                if ($author !== '') $ld['author'] = array('@type' => 'Person', 'name' => $author);
                if (!empty($novel['genres']) && is_array($novel['genres'])) $ld['genre'] = array_values($novel['genres']);
                if (!empty($novel['ratingCount'])) {
                    $ld['aggregateRating'] = array('@type' => 'AggregateRating',
                        'ratingValue' => isset($novel['rating']) ? $novel['rating'] : 0,
                        'ratingCount' => (int)$novel['ratingCount'], 'bestRating' => 5);
                }
                $jsonLd = json_ld_encode($ld);

                // Link every chapter so crawlers can reach them from the novel page.
                $links = '';
                $ordered = array_reverse($chapters);
                foreach ($ordered as $c) {
                    $n2 = chapter_number_of($c);
                    $ct = isset($c['title']) ? $c['title'] : ('Chapter ' . $n2);
                    $links .= '<li><a href="/novel/' . rawurlencode($slug) . '/' . $n2 . '">' . htmlspecialchars($ct, ENT_QUOTES, 'UTF-8') . '</a></li>';
                }
                $bodyHtml =
                    '<article>' .
                    '<h1>' . htmlspecialchars($display, ENT_QUOTES, 'UTF-8') . '</h1>' .
                    ($author !== '' ? '<p>' . htmlspecialchars($author, ENT_QUOTES, 'UTF-8') . '</p>' : '') .
                    '<p>' . htmlspecialchars($desc, ENT_QUOTES, 'UTF-8') . '</p>' .
                    '<h2>Chapters (' . count($chapters) . ')</h2><ul>' . $links . '</ul>' .
                    '</article>';
            }
        } else {
            list($title, $description, $bodyHtml) = not_found($siteName);
        }
    }
}

// ---- Inject into the shipped index.html ----------------------------------
$titleEsc = rep_literal(htmlspecialchars($title, ENT_QUOTES, 'UTF-8'));
$descEsc = rep_literal(htmlspecialchars($description, ENT_QUOTES, 'UTF-8'));
$canonEsc = rep_literal(htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8'));

$html = preg_replace('#<title>.*?</title>#is', '<title>' . $titleEsc . '</title>', $html, 1);
$html = preg_replace('#<meta\s+name="description"\s+content="[^"]*"\s*/?>#i', '<meta name="description" content="' . $descEsc . '" />', $html, 1);
$html = preg_replace('#<meta\s+property="og:title"\s+content="[^"]*"\s*/?>#i', '<meta property="og:title" content="' . $titleEsc . '" />', $html, 1);
$html = preg_replace('#<meta\s+property="og:description"\s+content="[^"]*"\s*/?>#i', '<meta property="og:description" content="' . $descEsc . '" />', $html, 1);
$html = preg_replace('#<meta\s+property="og:url"\s+content="[^"]*"\s*/?>#i', '<meta property="og:url" content="' . $canonEsc . '" />', $html, 1);
$html = preg_replace('#<meta\s+property="twitter:title"\s+content="[^"]*"\s*/?>#i', '<meta property="twitter:title" content="' . $titleEsc . '" />', $html, 1);
$html = preg_replace('#<meta\s+property="twitter:description"\s+content="[^"]*"\s*/?>#i', '<meta property="twitter:description" content="' . $descEsc . '" />', $html, 1);
$html = preg_replace('#<meta\s+property="twitter:url"\s+content="[^"]*"\s*/?>#i', '<meta property="twitter:url" content="' . $canonEsc . '" />', $html, 1);
$html = preg_replace('#<link\s+rel="canonical"[^>]*>#i', '<link rel="canonical" href="' . $canonEsc . '" />', $html, 1);

if ($jsonLd) {
    $html = str_replace('</head>', '  <script type="application/ld+json">' . $jsonLd . "</script>\n  </head>", $html);
}
if ($bodyHtml !== '') {
    // React clears #root on mount, so this is crawler-facing only.
    $html = preg_replace('#<div id="root">\s*</div>#i', '<div id="root">' . $bodyHtml . '</div>', $html, 1);
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
