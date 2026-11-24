import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MoneyValue } from "@/components/moneqra/money-value";
import { VerdictBadge } from "@/components/moneqra/verdict-badge";
import { PaymentRow, RetryBlockedTag } from "@/components/moneqra/payment-row";
import { ApprovalBar } from "@/components/moneqra/recommendation-card";
import { RoleSwitcher } from "@/components/moneqra/role-switcher";

afterEach(() => cleanup());

describe("MONEQRA domain components", () => {
  it("renders four distinct money materials", () => {
    for (const state of ["confirmed", "pending", "unknown", "estimated"] as const) {
      render(<MoneyValue kobo={110000000} state={state} />);
    }
    expect(screen.getAllByText("₦1,100,000")).toHaveLength(4);
    expect(screen.getAllByText(/Confirmed|Pending|Unknown|Assumption/)).toHaveLength(4);
  });

  it("renders shared and unverifiable verdicts unmistakably", () => {
    render(<VerdictBadge verdict="shared" reason="Both routes use the same upstream switch." />);
    expect(screen.getByText("shared")).toBeVisible();
    expect(screen.getByText(/same upstream switch/)).toBeVisible();
  });

  it("blocks retry for unknown and separates failed checks", () => {
    render(
      <table><tbody>
        <PaymentRow
          reference="provider-ref"
          amount={3000000}
          state="unknown"
          lastProviderCheck="2026-11-19 16:30 UTC"
          checkFailed
        />
      </tbody></table>
    );
    expect(screen.getByText(/Retry blocked · unknown · check failed/)).toBeVisible();
  });

  it("does not disable approval for approvers", () => {
    render(<ApprovalBar role="approver" />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });

  it("disables approval for non-approvers", () => {
    render(<ApprovalBar role="viewer" />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("switches demo role", async () => {
    const user = userEvent.setup();
    let role: "viewer" | "operator" | "approver" | "admin" = "viewer";
    const { rerender } = render(
      <RoleSwitcher role={role} onChange={(next) => { role = next; }} />
    );
    await user.selectOptions(screen.getByRole("combobox"), "approver");
    rerender(<RoleSwitcher role="approver" onChange={() => undefined} />);
    expect(screen.getByRole("combobox")).toHaveValue("approver");
  });

  it("exports a retry tag for unknown payments", () => {
    render(<RetryBlockedTag />);
    expect(screen.getByText(/Retry blocked/)).toBeVisible();
  });
});
