import { describe, expect, it } from "vitest";
import { allowedHours, monthsSince, sessionDose, weekSummary, withinDays, type Session } from "./noise";

const s = (over: Partial<Session>): Session => ({ id: "1", date: "2026-11-20", hours: 2, kind: "Rehearsal", role: "x", db: 100, prot: 0, ring: false, muff: false, ...over });

describe("allowance", () => {
  it("is 40 h at 80 dB and halves every 10 dB (equal energy)", () => {
    expect(allowedHours(80)).toBe(40);
    expect(allowedHours(90)).toBeCloseTo(4, 6);
    expect(allowedHours(100)).toBeCloseTo(0.4, 6);
  });
  it("hearing protection raises the allowance", () => expect(sessionDose(s({ hours: 0.4, db: 100, prot: 20 }))).toBeCloseTo(0.4 / allowedHours(80), 6));
});

describe("weekly dose", () => {
  const now = new Date("2026-11-22T12:00:00Z").getTime();
  it("adds sessions from the last 7 days only", () => {
    const list = [s({ date: "2026-11-21", hours: 0.4, db: 100 }), s({ id: "2", date: "2026-11-01", hours: 10, db: 100 })];
    expect(withinDays(list, 7, now).length).toBe(1);
    expect(weekSummary(list, now).pct).toBe(100);
  });
  it("flags over-allowance and symptom sessions", () => {
    const list = [s({ date: "2026-11-20", hours: 1, db: 104, ring: true }), s({ id: "2", date: "2026-11-21", hours: 1, db: 104, muff: true })];
    const w = weekSummary(list, now);
    expect(w.level).toBe("high");
    expect(w.symptomSessions).toBe(2);
  });
  it("is ok when well under", () => expect(weekSummary([s({ hours: 1, db: 85 })], now).level).toBe("ok"));
});

describe("test-due reminder", () => {
  const now = new Date("2026-11-22T00:00:00Z").getTime();
  it("counts months since the last test", () => {
    expect(monthsSince("2025-11-01", now)).toBeGreaterThan(12);
    expect(monthsSince("2026-10-01", now)).toBeLessThan(12);
  });
});
