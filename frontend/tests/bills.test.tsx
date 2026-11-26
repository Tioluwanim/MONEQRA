import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { server } from "@/mocks/server";
import BillsPage from "@/app/bills/page";
import { AuthProvider } from "@/lib/auth";

vi.mock("next/navigation", () => ({ usePathname: () => "/bills" }));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => cleanup());
afterAll(() => server.close());

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider><BillsPage /></AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Your bills", () => {
  it("shows each bill against money you have, with plain labels", async () => {
    renderPage();
    const list = await screen.findByRole("list", { name: /bills in due-date order/i });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("Only if waiting payments arrive")).toBeInTheDocument();
    expect(within(rows[1]).getByText("At risk")).toBeInTheDocument();
    expect(screen.getByText(/never counted as yours/i)).toBeInTheDocument();
  });

  it("changing the guess changes the coverage", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("list", { name: /bills in due-date order/i });
    await user.click(screen.getByRole("button", { name: "None arrive" }));
    await waitFor(() => {
      const rows = within(screen.getByRole("list", { name: /bills in due-date order/i })).getAllByRole("listitem");
      expect(within(rows[0]).getByText("At risk")).toBeInTheDocument();
    });
  });

  it("the person who requested cannot approve their own request", async () => {
    const user = userEvent.setup();
    renderPage(); // default role is approver
    const list = await screen.findByRole("list", { name: /bills in due-date order/i });
    await user.click(within(list).getAllByRole("button", { name: /pay in two parts|ask for more time/i })[0]);
    const approve = await screen.findByRole("button", { name: "Approve" });
    expect(approve).toBeDisabled();
    expect(screen.getByText(/someone else has to approve it/i)).toBeInTheDocument();
  });
});
