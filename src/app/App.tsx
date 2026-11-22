/* Performer Ear Log: record loud sessions, see how much of the weekly safe noise allowance
   they use, watch for ear symptoms, and keep a yearly hearing-test reminder. On-device. */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, CalendarCheck, ListMusic, Plus } from "lucide-react";
import { AppShell, type Section } from "@/shell/AppShell";
import { Button, Callout, Check, Field, Input, Panel, ResponsiveTable, Select } from "@/shell/ui";
import { References } from "@/shell/References";
import { usePersistent } from "@/shell/storage";
import { toast } from "@/shell/toast";
import { downloadCSV, fmtDate, todayISO, uid } from "@/shell/lib";
import { ROLES, monthsSince, sessionDose, weekSummary, type Session } from "./noise";
import refs from "./refs.json";

const PROT = [{ v: 0, label: "None" }, { v: 15, label: "Earplugs (~15 dB)" }, { v: 20, label: "Musician earplugs (~20 dB)" }, { v: 25, label: "Foam plugs (~25 dB)" }];
const DAY = 864e5;

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState("week");
  const [log, setLog] = usePersistent<Session[]>("pel-log", []);
  const [lastTest, setLastTest] = usePersistent<string>("pel-lasttest", "");
  const [form, setForm] = useState({ date: todayISO(), roleIdx: 0, kind: "Rehearsal", hours: "2", prot: 0, ring: false, muff: false });
  const [err, setErr] = useState("");

  const week = useMemo(() => weekSummary(log), [log]);
  const months = lastTest ? monthsSince(lastTest) : null;

  const sections: Section[] = [
    { id: "week", label: "This week", icon: Activity }, { id: "add", label: "Add session", icon: Plus },
    { id: "log", label: "Log", icon: ListMusic }, { id: "checks", label: "Checks", icon: CalendarCheck }
  ];
  const go = (id: string) => { setView(id); window.scrollTo({ top: 0 }); };

  const add = () => {
    const h = Number(form.hours);
    if (!(h > 0 && h <= 16)) { setErr("Enter hours between 0.25 and 16."); return; }
    setErr("");
    const role = ROLES[form.roleIdx];
    setLog(l => [...l, { id: uid(), date: form.date || todayISO(), hours: h, kind: form.kind, role: role.label, db: role.db, prot: form.prot, ring: form.ring, muff: form.muff }]);
    setForm(f => ({ ...f, ring: false, muff: false }));
    toast("Session added"); go("week");
  };
  const del = (id: string) => { setLog(l => l.filter(x => x.id !== id)); toast("Deleted"); };
  const csv = () => downloadCSV([["date", "session", "role", "level_dBA_estimate", "hours", "protection_dB", "allowance_percent", "ringing", "muffled"],
    ...log.map(e => [e.date, e.kind, e.role, e.db, e.hours, e.prot, Math.round(sessionDose(e) * 100), e.ring ? "yes" : "no", e.muff ? "yes" : "no"])], `performer-ear-log-${todayISO()}.csv`);

  const meterColor = week.level === "high" ? "var(--color-high)" : week.level === "mid" ? "var(--color-mid)" : "var(--color-ok)";

  return (
    <AppShell title={t("appName")} subtitle={t("appSub")} sections={sections} active={view} onSection={go}
      footer={<><p className="m-0">{t("disclaimer")}</p>
        <p className="m-0">Allowance based on the WHO–ITU safe-listening standard (80 dB(A), 40 h/week, equal-energy). Levels are typical estimates, not measurements.</p></>}>

      {view === "week" && (
        <div className="grid gap-5">
          <Panel title="This week's noise dose">
            <div className="flex flex-wrap items-end gap-6">
              <div><div className="text-5xl font-bold tabular-nums" style={{ color: meterColor }}>{week.pct}%</div>
                <p className="m-0 text-[0.85rem] text-muted">of the weekly safe allowance{week.fraction >= 2 ? ` — about ${Math.round(week.fraction)} weeks' worth` : ""}</p></div>
              <div className="min-w-48 flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-track"><div className="h-full rounded-full" style={{ width: `${Math.min(100, week.pct)}%`, background: meterColor }} /></div>
                <p className="m-0 mt-2 text-[0.95rem]">{week.sessions} session{week.sessions === 1 ? "" : "s"}, {week.hours} hours. {week.level === "high" ? "Over the allowance: plan quieter days and use protection at every session." : week.level === "mid" ? "Close to the allowance. Use protection and rest your ears." : "Within the allowance."}</p>
              </div>
            </div>
            {week.symptomSessions >= 2 && <Callout tone="high" title={`Ear symptoms after ${week.symptomSessions} sessions in the last 30 days`}>This is a warning sign of noise damage. Book a hearing test and use protection every time.</Callout>}
          </Panel>
          <References refs={refs} contextQuery={week.level === "high" ? "dose allowance exceeded protection" : week.symptomSessions >= 2 ? "tinnitus ringing muffled warning" : "safe listening allowance"} contextLabel="Relevant guidance" />
        </div>
      )}

      {view === "add" && (
        <Panel title="Add a session">
          <Field label="Date">{id => <Input id={id} type="date" value={form.date} max={todayISO()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />}</Field>
          <Field label="What were you doing?">{id => <Select id={id} value={form.roleIdx} onChange={e => setForm(f => ({ ...f, roleIdx: Number(e.target.value) }))}>{ROLES.map((r, i) => <option key={i} value={i}>{r.label} (~{r.db} dBA)</option>)}</Select>}</Field>
          <Field label="Kind of session">{id => <Select id={id} value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>{["Rehearsal", "Performance", "Procession", "Teaching", "Recording"].map(k => <option key={k}>{k}</option>)}</Select>}</Field>
          <Field label="Hours" hint="0.25 to 16">{id => <Input id={id} type="number" inputMode="decimal" min={0.25} max={16} step={0.25} value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />}</Field>
          <Field label="Hearing protection">{id => <Select id={id} value={form.prot} onChange={e => setForm(f => ({ ...f, prot: Number(e.target.value) }))}>{PROT.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}</Select>}</Field>
          <fieldset className="mt-3 border-0 p-0"><legend className="text-[0.92rem] font-bold">Ears afterwards</legend>
            <Check checked={form.ring} onChange={v => setForm(f => ({ ...f, ring: v }))}>Ringing (tinnitus)</Check>
            <Check checked={form.muff} onChange={v => setForm(f => ({ ...f, muff: v }))}>Muffled or blocked feeling</Check>
          </fieldset>
          {err && <p role="alert" className="m-0 mt-2 font-semibold text-high">{err}</p>}
          <div className="mt-4"><Button variant="primary" onClick={add}>Add session</Button></div>
        </Panel>
      )}

      {view === "log" && (
        <Panel title={`Sessions (${log.length})`} action={<Button size="sm" onClick={csv} disabled={!log.length}>Download CSV</Button>}>
          <ResponsiveTable rows={[...log].sort((a, b) => b.date.localeCompare(a.date))} rowKey={e => e.id} empty="No sessions yet."
            columns={[
              { header: "Date", cell: e => fmtDate(e.date) },
              { header: "Session", cell: e => <><span>{e.kind}</span><br /><span className="text-[0.82rem] text-muted">{e.role}</span></> },
              { header: "Hours", cell: e => e.hours, className: "tabular-nums" },
              { header: "Protection", cell: e => e.prot ? `${e.prot} dB` : "None" },
              { header: "Allowance", cell: e => `${Math.round(sessionDose(e) * 100)}%`, className: "tabular-nums" },
              { header: "Ears after", cell: e => [e.ring ? "Ringing" : "", e.muff ? "Muffled" : ""].filter(Boolean).join(", ") || "Fine" },
              { header: "", cell: e => <Button size="sm" variant="danger" onClick={() => del(e.id)}>Delete</Button> }]} />
        </Panel>
      )}

      {view === "checks" && (
        <div className="grid gap-5">
          <Panel title="Hearing test reminder">
            <Field label="Date of your last hearing test">{id => <Input id={id} type="date" value={lastTest} max={todayISO()} onChange={e => setLastTest(e.target.value)} />}</Field>
            {!lastTest ? <p className="m-0 mt-3 text-muted">Add the date of your last hearing test to get a reminder.</p>
              : months! > 12 ? <Callout tone="mid" title="Overdue">Your last test was over a year ago. Book a hearing test.</Callout>
                : <Callout tone="ok" title="Up to date">Next test due {fmtDate(new Date(new Date(lastTest).getTime() + 365 * DAY))}.</Callout>}
          </Panel>
          <References refs={refs} contextQuery="hearing test monitoring protection musician" contextLabel="Looking after your hearing" />
        </div>
      )}
    </AppShell>
  );
}
