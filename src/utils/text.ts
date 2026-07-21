// Chapter text arrives from many sources: typed directly, or pasted from
// Word / web pages / other novel sites. Pasted rich text carries structural
// HTML ("<div>", "<br>", "&nbsp;"…) that the reader used to print as LITERAL
// text between the sentences. Convert that markup into real line breaks and
// plain characters so a chapter always reads exactly like the editor showed
// it. Inline tags the editor understands (<b>/<i>/<u>/<img>) pass through
// untouched — the reader's sanitizer handles them.
//
// Fidelity rule: the translator's line layout is preserved EXACTLY — the
// blank lines they see in the editor (including ones they added or removed
// by hand) are what readers get. Automatic spacing happens only once, when
// the chapter text is first pasted into the empty editor (see
// spreadPlainTextLines), and stays fully editable afterwards.

const INLINE_KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'IMG', 'A']);

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// DOM-faithful conversion: every visual line in the contenteditable editor
// (a <div>/<p> block, a <br>) becomes exactly one text line; an empty block
// (<div><br></div>) becomes exactly one empty line.
function htmlToLines(html: string): string {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const lines: string[] = [];
  let cur = '';
  const endLine = () => {
    lines.push(cur);
    cur = '';
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      cur += escapeText((node.textContent || '').replace(/\u00a0/g, ' '));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName;

    if (tag === 'BR') {
      endLine();
      return;
    }
    if (INLINE_KEEP.has(tag)) {
      cur += (el as HTMLElement).outerHTML;
      return;
    }
    if (tag === 'DIV' || tag === 'P') {
      if (cur !== '') endLine();
      const before = lines.length;
      el.childNodes.forEach(walk);
      // A block is one visual line: close it unless its content already
      // closed itself (e.g. <div><br></div> = exactly one empty line).
      if (cur !== '' || lines.length === before) endLine();
      // Pasted rich text separates real paragraphs with <p>; keep that
      // breathing room as one blank line.
      if (tag === 'P') lines.push('');
      return;
    }
    // Unknown wrappers (span, font, …) carry no layout meaning — keep only
    // their contents.
    el.childNodes.forEach(walk);
  };

  body.childNodes.forEach(walk);
  if (cur !== '') endLine();

  // Trim leading/trailing empty lines and per-line edge spaces, but keep
  // every interior blank line exactly as authored.
  const trimmed = lines.map((l) => l.replace(/^[ \t]+|[ \t]+$/g, ''));
  while (trimmed.length && trimmed[0] === '') trimmed.shift();
  while (trimmed.length && trimmed[trimmed.length - 1] === '') trimmed.pop();
  return trimmed.join('\n');
}

export function normalizeChapterText(raw: string): string {
  if (!raw) return '';
  const text = raw.replace(/\r\n?/g, '\n');
  // Plain text (typed or already normalized): keep the line layout as-is.
  if (!/<\/?(div|p|br|span)\b|&(nbsp|amp|lt|gt|quot|#39);/i.test(text)) return text;

  if (typeof DOMParser !== 'undefined') {
    try {
      return htmlToLines(text);
    } catch {
      /* fall through to the regex approximation */
    }
  }

  // Regex approximation for environments without a DOM parser.
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// First-attach formatting for the add-chapter editor: spread pasted text so
// every non-empty line is followed by one visible blank line. Returns HTML
// for a contenteditable editor (<div>line</div><div><br></div>…). Applied
// ONLY when pasting into an empty editor — afterwards the translator's own
// edits (adding or removing blank lines) are what gets saved and shown.
export function spreadPlainTextLines(text: string): string {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map((l) => `<div>${escapeText(l)}</div>`).join('<div><br></div>');
}

// Turn a novel's English title into a clean, URL-friendly slug so links read
// like "/novel/the-beginning-after-the-end" instead of an opaque id. Strips
// accents/punctuation, lowercases, and joins words with single hyphens.
// Returns '' when the title has no latin characters (caller falls back to id).
export function slugifyTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // drop combining accents
    .toLowerCase()
    .replace(/['"’`]/g, '')          // drop apostrophes/quotes entirely
    .replace(/[^a-z0-9]+/g, '-')     // everything else becomes a separator
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .slice(0, 80);                   // keep URLs reasonably short
}

// Standard English footer copy. The footer text lives in the shared database.
export const EN_FOOTER_DESCRIPTION = 'A leading platform for translating, suggesting, and reading light novels, fantasy, and dark web novels — with top accuracy, protection standards, and a premium visual aesthetic.';
export const EN_FOOTER_SUPPORT = 'Via the official Discord ticket below';
export const EN_FOOTER_COMMUNITY = 'Join our great novel family to get chapter notifications the moment they drop, live before everyone else!';

// MistVil is an English-only platform. Some databases were seeded with Arabic
// footer defaults, so any stored footer value that is empty OR contains Arabic
// script falls back to the standard English copy — the footer always reads in
// English regardless of what is stored, with no database migration needed.
// (Matching Arabic script directly, rather than exact legacy strings, is
// robust to invisible-character or diacritic differences in the stored text.)
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function normalizeFooterText(value: string | undefined, english: string): string {
  const v = (value || '').trim();
  return (!v || ARABIC_SCRIPT.test(v)) ? english : value!;
}

// Word-based, case-insensitive search matching for the site's search boxes.
// The query is split into words and a record matches when EVERY word appears
// somewhere in its searchable text — in any order. So "beginning end", "END
// beginning", or "The Beginning" all find "The Beginning After The End".
export function matchesSearchWords(query: string, fields: (string | undefined)[]): boolean {
  const words = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fields.filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}

// Renders stored chapter text inside a contenteditable editor: images display
// as actual images (instead of their long base64 <img …> markup) and b/i/u
// formatting is live. Everything else stays escaped so nothing but those
// whitelisted tags can ever execute inside the editor.
export function chapterTextToEditorHtml(text: string): string {
  const isSafeImgSrc = (src: string) => {
    const v = src.trim().toLowerCase();
    return v.startsWith('data:image/') || v.startsWith('https://') || v.startsWith('http://') || v.startsWith('/');
  };
  const restoreLine = (line: string): string => {
    let out = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>');
    out = out.replace(/&lt;img\s+src="([^"]+)"\s*(?:\/)?&gt;/gi, (m, src) =>
      isSafeImgSrc(src) ? `<img src="${src}" />` : m);
    return out;
  };
  return (text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => {
      const r = restoreLine(l);
      return `<div>${r || '<br>'}</div>`;
    })
    .join('');
}
