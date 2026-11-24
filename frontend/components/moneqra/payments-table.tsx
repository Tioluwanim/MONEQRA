import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MoneyInput } from "@/lib/money";
import type { PaymentState } from "./types";
import { PaymentRow } from "./payment-row";

export type PaymentListItem = {
  id: string;
  reference: string;
  amount: MoneyInput;
  state: PaymentState;
  lastProviderCheck: string;
  checkFailed?: boolean;
};

export function PaymentsTable({ payments }: { payments: PaymentListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider reference</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Last provider check</TableHead>
          <TableHead>Retry</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <PaymentRow key={payment.id} {...payment} reference={payment.reference} />
        ))}
      </TableBody>
    </Table>
  );
}
