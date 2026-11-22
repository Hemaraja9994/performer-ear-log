/* Noise-dose estimate for performers. This is an awareness estimate, not a measurement.
   The allowance follows the equal-energy (3 dB) principle used by ISO 1999 and the
   WHO–ITU safe-listening standard, scaled to a daily allowance. */

export interface Role { label: string; db: number }
// Typical A-weighted level at the performer's own ears (approximate, dBA).
export const ROLES: Role[] = [
  { label: "Chenda, thavil or dhol", db: 108 },
  { label: "Band drums or drum kit", db: 104 },
  { label: "Nadaswaram, trumpet or other loud wind", db: 100 },
  { label: "DJ, sound engineer or speaker crew", db: 100 },
  { label: "Singer or player near loud speakers", db: 95 },
  { label: "Mridangam, tabla or acoustic ensemble", db: 90 },
  { label: "Teacher in a percussion class", db: 92 }
];

export interface Session { id: string; date: string; hours: number; kind: string; role: string; db: number; prot: number; ring: boolean; muff: boolean }

/** Hours at a given level that use up one full daily allowance. */
export const allowedHours = (level: number): number => 40 * Math.pow(10, (80 - level) / 10);

/** Fraction of the allowance used by one session (1.0 = a full day's safe dose). */
export const sessionDose = (s: Pick<Session, "hours" | "db" | "prot">): number => s.hours / allowedHours(s.db - s.prot);

const DAY = 864e5;
export const withinDays = (sessions: Session[], n: number, now = Date.now()): Session[] =>
  sessions.filter(e => (now - new Date(e.date).getTime()) / DAY < n);

export interface WeekSummary { fraction: number; pct: number; level: "ok" | "mid" | "high"; sessions: number; hours: number; symptomSessions: number }

export function weekSummary(sessions: Session[], now = Date.now()): WeekSummary {
  const w = withinDays(sessions, 7, now);
  const fraction = w.reduce((s, e) => s + sessionDose(e), 0);
  const level = fraction >= 1 ? "high" : fraction >= 0.75 ? "mid" : "ok";
  return { fraction, pct: Math.round(fraction * 100), level, sessions: w.length,
    hours: Math.round(w.reduce((s, e) => s + e.hours, 0) * 10) / 10,
    symptomSessions: withinDays(sessions, 30, now).filter(e => e.ring || e.muff).length };
}

export const monthsSince = (iso: string, now = Date.now()): number => (now - new Date(iso).getTime()) / (30.44 * DAY);
