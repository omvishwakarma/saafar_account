import { NextRequest, NextResponse } from "next/server";
import { todayISO } from "@/lib/money";
import { buildPartnerLedgerPdf, buildPartnerLedgerXlsx } from "@/lib/partner-ledger-file";
import { reportPartner } from "@/lib/queries";

function fileName(partner: string, asOf: string, ext: string) {
  const stem = `${partner} ledger ${asOf}`.replace(/[^\w.\- ]+/g, "").trim();
  return `${stem}.${ext}`;
}

export async function GET(request: NextRequest) {
  const partner = request.nextUrl.searchParams.get("partner") || "";
  const asOf = request.nextUrl.searchParams.get("asOf") || todayISO();
  const format = request.nextUrl.searchParams.get("format");
  const report = await reportPartner(partner, asOf);
  if (!report.partner) {
    return NextResponse.json({ error: "Choose a partner" }, { status: 400 });
  }
  const file = {
    partnerName: report.partner.name,
    asOf,
    sections: report.sections,
  };
  if (format === "pdf") {
    const bytes = buildPartnerLedgerPdf(file);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName(file.partnerName, asOf, "pdf")}"`,
      },
    });
  }
  if (format === "xlsx") {
    const bytes = await buildPartnerLedgerXlsx(file);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName(file.partnerName, asOf, "xlsx")}"`,
      },
    });
  }
  return NextResponse.json({ error: "Choose pdf or xlsx" }, { status: 400 });
}
