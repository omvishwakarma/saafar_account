import { MOVE_META } from "@/lib/company";
import type { MoveType } from "@/lib/types";
import { listMoves } from "@/lib/queries";
import Link from "next/link";
import { Button, Filters, Money, PageHeader, Panel, Status, When } from "@/components/ui";

const types: MoveType[] = ["out_invoice", "out_refund", "in_invoice", "in_refund"];

export default async function MovesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; filter?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const type = types.includes(sp.type as MoveType) ? (sp.type as MoveType) : "out_invoice";
  const filter = sp.filter || "all";
  const q = sp.q || "";
  const data = await listMoves(type, filter, q);
  const meta = MOVE_META[data.moveType];
  return (
    <div>
      <PageHeader
        eyebrow="Sales & purchase"
        title={meta.title}
        sub="Drafts stay off the reports until you confirm them. Amounts in other currencies are converted to KWD at the document rate."
        action={<Button href={`/moves/new?type=${data.moveType}`}>New {meta.singular.toLowerCase()}</Button>}
      />
      <Filters path="/moves" extra={{ type: data.moveType }} current={filter} counts={data.counts} query={q} />
      <Panel>
        {data.rows.length === 0 ? (
          <div className="px-6 py-12 text-sm text-muted">Nothing in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="books min-w-[860px]">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>{meta.party}</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th className="num">Untaxed</th>
                  <th className="num">Total</th>
                  <th className="num">Open</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/moves/${row.id}`} className="font-semibold hover:text-brass">{row.number}</Link>
                      {row.origin && <div className="text-xs text-muted">{row.origin}</div>}
                    </td>
                    <td>{row.partner}</td>
                    <td><When value={row.invoiceDate} /></td>
                    <td className={row.late ? "text-red-800" : ""}><When value={row.dueDate} /></td>
                    <td className="num">{row.status === "draft" ? "—" : <Money amount={row.untaxed} currency={row.currency} />}</td>
                    <td className="num">{row.status === "draft" ? "—" : <Money amount={row.total} currency={row.currency} />}</td>
                    <td className="num">{row.status === "draft" ? "—" : <Money amount={row.residual} currency={row.currency} />}</td>
                    <td><Status value={row.status} late={row.late} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
