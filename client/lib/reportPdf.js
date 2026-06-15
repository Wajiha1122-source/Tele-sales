import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { titleize } from "./api";

const violet = [46, 7, 80];
const purple = [109, 40, 217];
const pale = [245, 243, 255];

const formatDate = (value) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
  day: "2-digit", month: "short", year: "numeric"
});
const formatDateTime = (value) => new Date(value).toLocaleString("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
});
const clean = (value) => value === null || value === undefined || value === "" ? "-" : String(value);

export function downloadReportPdf(report, rangeLabel) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  const drawHeader = () => {
    doc.setFillColor(...violet);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setFillColor(168, 85, 247);
    doc.roundedRect(margin, 5.5, 14, 14, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("I&C", margin + 7, 14.2, { align: "center" });
    doc.setFontSize(16);
    doc.text("Irshad & Company", margin + 19, 11.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(221, 214, 254);
    doc.text("SALES OPERATIONS AND PERFORMANCE REPORT", margin + 19, 17);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(rangeLabel, pageWidth - margin, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(221, 214, 254);
    doc.text(`Generated ${formatDateTime(report.generatedAt)}`, pageWidth - margin, 16, { align: "right" });
  };

  const addTable = (title, head, body, columnStyles = {}) => {
    let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 35;
    if (y + 24 > pageHeight - 14) {
      doc.addPage();
      drawHeader();
      y = 35;
    }
    doc.setTextColor(...violet);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, y);
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body: body.length ? body : [[{ content: "No records in this period.", colSpan: head.length, styles: { halign: "center" } }]],
      margin: { left: margin, right: margin, top: 30, bottom: 13 },
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 2, textColor: [55, 48, 65], lineColor: [237, 233, 254], lineWidth: .2, overflow: "linebreak" },
      headStyles: { fillColor: pale, textColor: purple, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 250, 255] },
      columnStyles,
      didDrawPage: ({ pageNumber }) => {
        if (pageNumber > 1) drawHeader();
      }
    });
  };

  drawHeader();
  doc.setTextColor(...violet);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Consolidated Sales Activity Report", margin, 36);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.text(`Prepared by ${report.generatedBy.name} (${titleize(report.generatedBy.role)})`, margin, 42);

  const metrics = [
    ["Daily reports", report.summary.reports], ["Quick activities", report.summary.activities],
    ["New leads", report.summary.leads], ["Calls reported", report.summary.calls],
    ["Contacts reached", report.summary.contacts], ["Interested", report.summary.interested],
    ["Meetings", report.summary.meetings], ["Converted", report.summary.converted]
  ];
  metrics.forEach(([label, value], index) => {
    const width = (pageWidth - margin * 2 - 14) / 8;
    const x = margin + index * (width + 2);
    doc.setFillColor(...pale);
    doc.roundedRect(x, 48, width, 20, 2, 2, "F");
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(String(value || 0), x + 3, 57);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(5.6);
    doc.text(label.toUpperCase(), x + 3, 63);
  });

  autoTable(doc, {
    startY: 75,
    head: [["Executive", "Reports", "Activities", "Leads", "Calls"]],
    body: report.executiveSummary.map((person) => [person.name, person.reports, person.activities, person.leads, person.calls]),
    margin: { left: margin, right: margin, bottom: 13 },
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2.3, lineColor: [237, 233, 254], lineWidth: .2 },
    headStyles: { fillColor: violet, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 247, 255] }
  });

  addTable("Daily Reports",
    ["Date", "Executive", "Calls", "Contacts", "Interested", "Meetings", "Activities", "Remarks"],
    report.dailyReports.map((row) => [formatDate(row.date), row.executive_name, row.total_calls, row.contacts_reached, row.interested_count, row.meetings_scheduled, row.activity_count, clean(row.remarks)]),
    { 7: { cellWidth: 48 } }
  );
  addTable("Quick Activities",
    ["Date", "Time", "Executive", "Company", "Contact", "Activity", "Result", "Remarks"],
    report.activities.map((row) => [formatDate(row.date), row.time.slice(0, 5), row.executive_name, row.company_name, row.contact_person, titleize(row.activity_type), titleize(row.result), clean(row.remarks)]),
    { 3: { cellWidth: 34 }, 4: { cellWidth: 30 }, 7: { cellWidth: 45 } }
  );
  addTable("Leads Created",
    ["Created", "Executive", "Company", "Contact", "Phone", "City", "Industry", "Status", "Source"],
    report.leads.map((row) => [formatDate(row.created_at), row.executive_name, row.company_name, row.contact_person, clean(row.phone), clean(row.city), clean(row.industry), titleize(row.status), clean(row.lead_source)]),
    { 2: { cellWidth: 32 }, 3: { cellWidth: 28 }, 8: { cellWidth: 25 } }
  );

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(221, 214, 254);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text("Confidential internal report - Irshad & Company", margin, pageHeight - 4.5);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 4.5, { align: "right" });
  }
  doc.save(`Irshad-Company-Sales-Report-${report.range.startDate}_to_${report.range.endDate}.pdf`);
}
