import { notFound } from "next/navigation";
import { VoucherForm } from "@/components/VoucherForm";
import { PageHeader } from "@/components/ui";
import { getVoucher, masters } from "@/lib/queries";

export default async function EditVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [voucher, data] = await Promise.all([getVoucher(id), masters()]);
  if (!voucher) notFound();
  const posted = voucher.status !== "draft";
  return (
    <div>
      <PageHeader
        eyebrow={voucher.number}
        title={posted ? "Edit voucher" : "Draft voucher"}
        sub={posted ? "Saving replaces the customer invoice and the supplier bill. A receipt already allocated to either one has to be cleared first." : "Confirming posts the customer invoice and the supplier bill."}
      />
      <VoucherForm
        posted={posted}
        customers={data.partners.filter((partner) => partner.role === "customer" || partner.role === "both")}
        suppliers={data.partners.filter((partner) => partner.role === "vendor" || partner.role === "both")}
        currencies={data.currencies}
        initial={{
          id: voucher.id,
          date: voucher.date,
          paxName: voucher.paxName,
          supplierId: voucher.supplier.id,
          customerId: voucher.customer.id,
          service: voucher.service,
          city: voucher.city,
          consultant: voucher.consultant,
          payMode: voucher.payMode,
          supplierRef: voucher.supplierRef,
          customerRef: voucher.customerRef,
          checkIn: voucher.checkIn,
          checkOut: voucher.checkOut,
          nights: voucher.nights,
          adults: voucher.adults,
          children: voucher.children,
          infants: voucher.infants,
          meal: voucher.meal,
          roomType: voucher.roomType,
          roomCategory: voucher.roomCategory,
          roomView: voucher.roomView,
          details: voucher.details,
          supplierFc: voucher.supplierFc,
          supplierCurrency: voucher.supplierCurrency,
          supRoe: voucher.supRoe,
          customerFc: voucher.customerFc,
          customerCurrency: voucher.customerCurrency,
          custRoe: voucher.custRoe,
          serviceFee: voucher.serviceFee,
          commPercent: voucher.commPercent,
          isReceived: voucher.isReceived,
          remarks: voucher.remarks,
        }}
      />
    </div>
  );
}
