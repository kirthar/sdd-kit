// AI attribution lines (REQ-HOOK-1 Attribution, REQ-VAL-6): an AI assistant credited as co-author,
// or a "Generated with" footer naming one. The author's own signature and human co-authors are fine.
const ATTRIBUTION = [
  /^[ \t>]*co-authored-by:[^\n]*\b(claude|anthropic)\b[^\n]*/im,
  /^[^\w\n]*generated (with|by)\b[^\n]*\b(claude|anthropic)\b[^\n]*/im,
];

export function findAttribution(text) {
  for (const re of ATTRIBUTION) {
    const m = re.exec(text);
    if (m) return m[0].trim();
  }
  return null;
}
