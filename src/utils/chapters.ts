// Chapter ordering.
//
// A chapter's number must ALWAYS be compared numerically so the list reads
// 80 → 100 → 200 → 1000 (the highest number is always last), never
// lexicographically ("1000" < "80") and never by upload time — a chapter 100
// added after chapter 1000 still belongs before it.
//
// The value can arrive as a real number, as a numeric string (older uploads or
// imported data), or only under the legacy `chapterNumber` field, so normalize
// it once here and use these helpers everywhere chapters are sorted or looked
// up. Anything unparseable sorts as 0 instead of poisoning the comparison with
// NaN (which would leave the whole list in an arbitrary order).
export function chapterNum(c: any): number {
  const raw = c?.number ?? c?.chapterNumber;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// Ascending by chapter number: lowest first, highest (newest) last.
export function byChapterNumberAsc(a: any, b: any): number {
  return chapterNum(a) - chapterNum(b);
}

// True when a chapter carries the given number, tolerating string/number
// mismatches (URL parsing yields a number; stored data may hold a string).
export function isChapterNumber(c: any, num: number | string): boolean {
  const target = Number(num);
  return Number.isFinite(target) && chapterNum(c) === target;
}
