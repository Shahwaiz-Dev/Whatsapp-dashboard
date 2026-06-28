/** Normalize phone to digits-only E.164-style string (no + prefix). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  return `+${phone}`;
}
