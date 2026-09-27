/** Route segments arrive percent-encoded for non-ASCII slugs such as 聯絡我們. */
export function slugFromParams(segments: readonly string[]): string {
  return segments
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .join('/');
}
