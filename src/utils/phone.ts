/**
 * Normalize a Nigerian phone number to the international format without the leading +.
 * Accepts 08012345678, +2348012345678, 2348012345678.
 * Returns the normalized form 2348012345678.
 */
export function normalizeNigerianPhone(input: string): string {
  if (!input) return input;
  const trimmed = input.trim().replace(/\s+/g, '');

  if (trimmed.startsWith('+234')) {
    return '234' + trimmed.slice(4);
  }
  if (trimmed.startsWith('234')) {
    return trimmed;
  }
  if (trimmed.startsWith('0')) {
    return '234' + trimmed.slice(1);
  }
  return trimmed;
}

/** Format a normalized phone (234...) for display: +234 801 234 5678 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizeNigerianPhone(phone);
  if (normalized.startsWith('234') && normalized.length === 13) {
    return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
  }
  return phone;
}

/** Check whether a phone number looks like a valid Nigerian number. */
export function isValidNigerianPhone(input: string): boolean {
  const normalized = normalizeNigerianPhone(input);
  // 234 followed by 10 digits
  return /^234\d{10}$/.test(normalized);
}
