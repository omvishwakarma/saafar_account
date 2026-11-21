import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "Safar Books", template: "%s · Safar Books" },
  description: "Multi-currency accounting for a travel company. Invoices, hotel vouchers, receipts, and ledgers in Kuwaiti Dinar.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} font-sans text-ink antialiased`}>{children}</body>
    </html>
  );
}
