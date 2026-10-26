/** True when TipTap/HTML content has no visible text. */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html || typeof html !== 'string') return true
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length === 0
}
