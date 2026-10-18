/** 330 → "5h 30m" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** 84.5 → "84,50 €" */
export function euros(value: number): string {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/** "22:00:00" → "22:00" */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** "22:00 – 02:00" with a (+1) marker when the range crosses midnight */
export function timeRange(start: string, end: string): string {
  const s = hhmm(start);
  const e = hhmm(end);
  return `${s} – ${e}${e <= s ? ' (+1)' : ''}`;
}
