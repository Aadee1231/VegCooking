// src/lib/date.ts
export function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sun,1=Mon,...
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  const res = new Date(d);
  res.setDate(d.getDate() + diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

export function addDays(d: Date, n: number) {
  const res = new Date(d);
  res.setDate(d.getDate() + n);
  return res;
}

export function fmtISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function niceDate(d: Date) {
  const formatted = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return formatted.replace(/,/g, "");
}
