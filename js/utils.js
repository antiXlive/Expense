// utils.js
export function uuidv4() {
  // RFC4122 v4 compliant
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function fmtCurrency(n) {
  if (n == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits:2 }).format(n);
}

export function fmtDateISO(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.toISOString().slice(0,10);
}

export function clamp(v,min,max){ return Math.min(max,Math.max(min,v)); }
