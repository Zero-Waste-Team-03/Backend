const TAGS = /<[^>]+>/g;

function replaceControlChars(value: string): string {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');
}

export function sanitizeNotificationText(
  value: string,
  maxLength: number,
): string {
  const normalized = replaceControlChars(value)
    .replace(TAGS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trim();
}
