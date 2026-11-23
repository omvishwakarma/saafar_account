import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { company } from "./company";
import { formatDate, formatMoney } from "./money";

type Line = {
  date: string;
  ref: string;
  guest: string;
  label: string;
  fcCode: string;
  fcAmount: number;
  debit: number;
  credit: number;
  balance: number;
};

export type PartnerLedgerFile = {
  partnerName: string;
  asOf: string;
  sections: { title: string; lines: Line[] }[];
};

function logoBuffer() {
  return fs.readFileSync(path.join(process.cwd(), "public", "alomma-logo.png"));
}

function subtitle(asOf: string) {
  return `Partner ledger as of ${formatDate(asOf)} · ${company.base}`;
}

function foreignCodes(lines: Line[]) {
  return [...new Set(lines.map((line) => line.fcCode).filter(Boolean))];
}

function headers(codes: string[]) {
  return ["Date", "Ref", "Guest", "Detail", ...codes, "Debit", "Credit", "Balance"];
}

function pdfRow(line: Line, codes: string[]) {
  return [
    formatDate(line.date),
    line.ref,
    line.guest,
    line.label,
    ...codes.map((code) => (line.fcCode === code && line.fcAmount ? formatMoney(line.fcAmount, code) : "")),
    line.debit ? formatMoney(line.debit) : "",
    line.credit ? formatMoney(line.credit) : "",
    formatMoney(line.balance),
  ];
}

export function buildPartnerLedgerPdf(report: PartnerLedgerFile) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const logo = logoBuffer();
  doc.addImage(`data:image/png;base64,${logo.toString("base64")}`, "PNG", 36, 22, 150, 87);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(28, 25, 21);
  doc.text(report.partnerName, 36, 132);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(109, 101, 91);
  doc.text(subtitle(report.asOf), 36, 150);

  let y = 174;
  if (report.sections.length === 0) {
    doc.text("No posted lines for this partner yet.", 36, y);
  }
  for (const section of report.sections) {
    const codes = foreignCodes(section.lines);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(109, 101, 91);
    if (y > 520) {
      doc.addPage();
      y = 40;
    }
    doc.text(section.title.toUpperCase(), 36, y);
    const right: Record<number, { halign: "right" }> = {};
    for (let index = 4; index < 4 + codes.length + 3; index += 1) right[index] = { halign: "right" };
    autoTable(doc, {
      startY: y + 8,
      margin: { left: 36, right: 36 },
      head: [headers(codes)],
      body: section.lines.map((line) => pdfRow(line, codes)),
      styles: { fontSize: 8, cellPadding: 4, textColor: [28, 25, 21], lineColor: [229, 220, 203], lineWidth: 0.4 },
      headStyles: { fillColor: [246, 241, 231], textColor: [109, 101, 91], fontStyle: "bold" },
      columnStyles: { 2: { cellWidth: 80 }, 3: { cellWidth: codes.length ? 150 : 210 }, ...right },
    });
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 22;
  }
  return Buffer.from(doc.output("arraybuffer"));
}

export async function buildPartnerLedgerXlsx(report: PartnerLedgerFile) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = company.product;
  const sheet = workbook.addWorksheet("Partner ledger", { views: [{ showGridLines: false }] });
  const imageId = workbook.addImage({ buffer: logoBuffer(), extension: "png" });
  sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 87 } });
  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 18;

  sheet.mergeCells("A5:G5");
  const title = sheet.getCell("A5");
  title.value = report.partnerName;
  title.font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF1C1915" } };

  sheet.mergeCells("A6:G6");
  const sub = sheet.getCell("A6");
  sub.value = subtitle(report.asOf);
  sub.font = { name: "Calibri", size: 11, color: { argb: "FF6D655B" } };

  const border = { style: "thin" as const, color: { argb: "FFE5DCCB" } };
  let rowIndex = 8;
  if (report.sections.length === 0) {
    sheet.getCell(rowIndex, 1).value = "No posted lines for this partner yet.";
  }
  for (const section of report.sections) {
    const codes = foreignCodes(section.lines);
    const cols = headers(codes);
    sheet.mergeCells(rowIndex, 1, rowIndex, cols.length);
    const sectionCell = sheet.getCell(rowIndex, 1);
    sectionCell.value = section.title.toUpperCase();
    sectionCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF6D655B" } };
    sectionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F1E7" } };
    rowIndex += 1;

    cols.forEach((label, index) => {
      const cell = sheet.getCell(rowIndex, index + 1);
      cell.value = label;
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF6D655B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F1E7" } };
      cell.border = { top: border, left: border, bottom: border, right: border };
      cell.alignment = { horizontal: index >= 4 ? "right" : "left" };
    });
    rowIndex += 1;

    for (const line of section.lines) {
      const values: (string | number | null)[] = [
        formatDate(line.date),
        line.ref,
        line.guest,
        line.label,
        ...codes.map((code) => (line.fcCode === code ? line.fcAmount || null : null)),
        line.debit || null,
        line.credit || null,
        line.balance,
      ];
      values.forEach((value, index) => {
        const cell = sheet.getCell(rowIndex, index + 1);
        cell.value = value;
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF1C1915" } };
        cell.border = { top: border, left: border, bottom: border, right: border };
        const foreignIndex = index >= 4 && index < 4 + codes.length;
        if (typeof value === "number") {
          cell.numFmt = foreignIndex ? "#,##0.00" : "#,##0.000;[Red]-#,##0.000";
          cell.alignment = { horizontal: "right" };
        } else if (index >= 4) {
          cell.alignment = { horizontal: "right" };
        }
      });
      rowIndex += 1;
    }
    rowIndex += 1;
  }

  sheet.columns = [
    { width: 16 },
    { width: 18 },
    { width: 24 },
    { width: 46 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
  ];
  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
