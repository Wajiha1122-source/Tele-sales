"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, FileBarChart, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import Shell from "../../components/Shell";
import Reveal from "../../components/Reveal";
import { Button, Notice, Status } from "../../components/ui";
import { useSession } from "../../hooks/useSession";
import { api, titleize } from "../../lib/api";
import { downloadReportPdf } from "../../lib/reportPdf";

const isoDate = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const todayRange = () => {
  const today = new Date();
  return { startDate: isoDate(today), endDate: isoDate(today), label: "Today" };
};

const presetRange = (preset) => {
  const today = new Date();
  const start = new Date(today);
  if (preset === "weekly") {
    const day = today.getDay() || 7;
    start.setDate(today.getDate() - day + 1);
  }
  if (preset === "monthly") start.setDate(1);
  return {
    startDate: isoDate(start),
    endDate: isoDate(today),
    label: preset === "weekly" ? "This week" : "This month"
  };
};

const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
  day: "2-digit", month: "short", year: "numeric"
});
const formatDateTime = (value) => new Date(value).toLocaleString("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
});

function ReportTable({ title, count, columns, rows, empty }) {
  return <section className="report-section">
    <div className="report-section-heading"><div><span>Detailed records</span><h2>{title}</h2></div><strong>{count}</strong></div>
    <div className="report-table-wrap"><table className="report-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>
      {rows.length ? rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] || "-"}</td>)}</tr>) : <tr><td colSpan={columns.length} className="report-empty">{empty}</td></tr>}
    </tbody></table></div>
  </section>;
}

export default function ReportCenterPage() {
  const user = useSession();
  const initial = useMemo(todayRange, []);
  const [range, setRange] = useState(initial);
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (nextRange) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await api(`/reports/generate?startDate=${nextRange.startDate}&endDate=${nextRange.endDate}`);
      setReport(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && ["MANAGER", "CEO"].includes(user.role)) generate(initial);
  }, [user, generate, initial]);

  if (!user) return null;
  if (!["MANAGER", "CEO"].includes(user.role)) {
    return <Shell user={user}><Notice message="Report generation is available only to Managers and the CEO." error /></Shell>;
  }

  const applyPreset = (name) => {
    const next = name === "today" ? todayRange() : presetRange(name);
    setRange(next);
    generate(next);
  };
  const rangeLabel = report ? `${formatDate(report.range.startDate)} to ${formatDate(report.range.endDate)}` : "";
  const summary = report?.summary || {};

  const reportColumns = [
    { key: "date", label: "Date", render: (row) => formatDate(row.date.slice(0, 10)) },
    { key: "executive_name", label: "Executive" },
    { key: "total_calls", label: "Calls" },
    { key: "contacts_reached", label: "Contacts" },
    { key: "interested_count", label: "Interested" },
    { key: "meetings_scheduled", label: "Meetings" },
    { key: "activity_count", label: "Activities" },
    { key: "remarks", label: "Remarks" }
  ];
  const activityColumns = [
    { key: "date", label: "Date", render: (row) => formatDate(row.date.slice(0, 10)) },
    { key: "time", label: "Time", render: (row) => row.time.slice(0, 5) },
    { key: "executive_name", label: "Executive" },
    { key: "company_name", label: "Company" },
    { key: "contact_person", label: "Contact" },
    { key: "activity_type", label: "Activity", render: (row) => titleize(row.activity_type) },
    { key: "result", label: "Result", render: (row) => titleize(row.result) },
    { key: "remarks", label: "Remarks" }
  ];
  const leadColumns = [
    { key: "created_at", label: "Created", render: (row) => formatDate(row.created_at.slice(0, 10)) },
    { key: "executive_name", label: "Executive" },
    { key: "company_name", label: "Company" },
    { key: "contact_person", label: "Contact" },
    { key: "phone", label: "Phone" },
    { key: "city", label: "City" },
    { key: "industry", label: "Industry" },
    { key: "status", label: "Status", render: (row) => <Status value={row.status} /> },
    { key: "lead_source", label: "Source" }
  ];

  return <Shell user={user}>
    <div className="report-screen-controls">
      <Reveal variant="clip"><header className="premium-dark relative mb-5 overflow-hidden rounded-[2rem] p-7 text-white md:p-9">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-fuchsia-400/15 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.2em] text-fuchsia-200"><FileBarChart size={15} />Reporting studio</div><h1 className="text-4xl font-black tracking-[-.04em] md:text-6xl">Generate a complete sales report.</h1><p className="mt-4 max-w-2xl text-violet-100/60">Daily reports, quick activities, and leads combined into one premium, print-ready document.</p></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] p-4"><ShieldCheck className="text-fuchsia-300" /><div><div className="text-xs uppercase tracking-wider text-violet-200/50">Authorized access</div><div className="font-bold">{user.role}</div></div></div>
        </div>
      </header></Reveal>

      <Reveal><section className="card mb-6">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-end">
          <div><label>Quick ranges</label><div className="flex flex-wrap gap-2">{[["today", "Today"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([value, label]) => <button key={value} type="button" onClick={() => applyPreset(value)} className="btn-secondary">{label}</button>)}</div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label>Start date</label><input type="date" value={range.startDate} onChange={(event) => setRange({ ...range, startDate: event.target.value, label: "Custom range" })} /></div><div><label>End date</label><input type="date" value={range.endDate} onChange={(event) => setRange({ ...range, endDate: event.target.value, label: "Custom range" })} /></div></div>
          <div className="flex flex-wrap gap-2">
            <Button loading={loading} onClick={() => generate(range)} className="btn-primary">
              <RefreshCw size={16} />Generate
            </Button>
            <button type="button" onClick={() => window.print()} disabled={!report} className="btn-secondary">
              <Printer size={16} />Print
            </button>
            <button
              type="button"
              onClick={() => downloadReportPdf(report, rangeLabel)}
              disabled={!report}
              className="btn-secondary"
            >
              <Download size={16} />Download PDF
            </button>
          </div>
        </div>
      </section></Reveal>
      <Notice message={message} error />
    </div>

    {report && <article className="premium-report">
      <header className="report-header">
        <div className="report-brand"><div className="report-logo">I&amp;C</div><div><h1>Irshad &amp; Company</h1><p>Sales Operations and Performance Report</p></div></div>
        <div className="report-meta"><div><span>Reporting period</span><strong>{rangeLabel}</strong></div><div><span>Generated</span><strong>{formatDateTime(report.generatedAt)}</strong></div><div><span>Prepared by</span><strong>{report.generatedBy.name} · {titleize(report.generatedBy.role)}</strong></div></div>
      </header>

      <section className="report-title-band"><div><span>{range.label || "Selected period"}</span><h2>Consolidated Sales Activity Report</h2><p>Daily reporting, customer activity, and lead acquisition records for the selected reporting period.</p></div><CalendarDays size={42} /></section>

      <section className="report-summary-grid">
        {[["Daily reports", summary.reports], ["Quick activities", summary.activities], ["New leads", summary.leads], ["Calls reported", summary.calls], ["Contacts reached", summary.contacts], ["Interested", summary.interested], ["Meetings", summary.meetings], ["Converted leads", summary.converted]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || 0}</strong></div>)}
      </section>

      <section className="report-section">
        <div className="report-section-heading"><div><span>Team overview</span><h2>Executive Performance Summary</h2></div><strong>{report.executiveSummary.length}</strong></div>
        <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Executive</th><th>Reports</th><th>Activities</th><th>Leads</th><th>Calls</th></tr></thead><tbody>{report.executiveSummary.map((person) => <tr key={person.name}><td className="font-bold">{person.name}</td><td>{person.reports}</td><td>{person.activities}</td><td>{person.leads}</td><td>{person.calls}</td></tr>)}</tbody></table></div>
      </section>

      <ReportTable title="Daily Reports" count={report.dailyReports.length} columns={reportColumns} rows={report.dailyReports} empty="No daily reports were submitted in this period." />
      <ReportTable title="Quick Activities" count={report.activities.length} columns={activityColumns} rows={report.activities} empty="No quick activities were recorded in this period." />
      <ReportTable title="Leads Created" count={report.leads.length} columns={leadColumns} rows={report.leads} empty="No leads were created in this period." />

      <footer className="report-footer"><div><strong>Irshad &amp; Company</strong><span>Confidential internal sales operations report</span></div><div>Generated {formatDateTime(report.generatedAt)}</div></footer>
    </article>}
  </Shell>;
}
