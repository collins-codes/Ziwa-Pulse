const KENYAN_MOBILE = /^(?:0[17]\d{8}|\+?254[17]\d{8})$/;

export function normalizeKenyanPhone(value) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!KENYAN_MOBILE.test(compact)) return null;

  const digits = compact.replace(/\D/g, "");
  return digits.startsWith("0")
    ? `+254${digits.slice(1)}`
    : `+${digits}`;
}

export function maskKenyanPhone(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("254") || digits.length !== 12) return "+254 ••• ••• •••";
  const national = digits.slice(3);
  return `+254 ${national[0]}•• ••• ${national.slice(-3)}`;
}
