import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoExperience } from "@/components/demo/demo-experience";
import { calculateLiquidity, clampBps, deriveDemoRecommendation } from "@/lib/demo-finance";

function reducedMotion() {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => reducedMotion());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Ade Stores demo finance", () => {
  it("keeps unknown funds out of confirmed cash and computes the exact integer positions", () => {
    const worst = calculateLiquidity(0);
    expect(worst.availableKobo).toBe(99000000n);
    expect(worst.worstCaseKobo).toBe(-11000000n);
    expect(worst.recoveryKobo).toBe(0n);

    const assumed = calculateLiquidity(6000);
    expect(assumed.recoveryKobo).toBe(21600000n);
    expect(assumed.scenarioKobo).toBe(10600000n);

    const full = calculateLiquidity(10000);
    expect(full.recoveryKobo).toBe(36000000n);
    expect(full.scenarioKobo).toBe(25000000n);
  });

  it("clamps recovery assumptions to 0–10,000 basis points", () => {
    expect(clampBps(-50)).toBe(0);
    expect(clampBps(20000)).toBe(10000);
    expect(clampBps(Number.NaN)).toBe(0);
  });

  it("changes the recommendation with the dependency verdict", () => {
    const position = calculateLiquidity(6000);
    expect(deriveDemoRecommendation("shared", position).action).toMatch(/withhold/i);
    expect(deriveDemoRecommendation("unverifiable", position).action).toMatch(/withhold/i);
    expect(deriveDemoRecommendation("independent", position).action).toMatch(/provider b/i);
  });
});

describe("guided demo experience", () => {
  it("walks through the steps and gates approval by role", async () => {
    const user = userEvent.setup();
    render(<DemoExperience />);

    expect(screen.getByRole("heading", { level: 1, name: /A payment provider slows down/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^Next: Payments/i }));
    expect(screen.getByRole("heading", { level: 1, name: /Which payments are confirmed/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Step 5: Decision/i }));
    expect(screen.getByRole("heading", { level: 1, name: /What should you do/i })).toBeVisible();

    const approveButton = screen.getByRole("button", { name: /^Approve$/i });
    expect(approveButton).toBeDisabled();
    await user.selectOptions(screen.getByRole("combobox", { name: /Demo role/i }), "approver");
    expect(approveButton).toBeEnabled();
    await user.click(approveButton);
    expect(screen.getByText(/Approved and recorded/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /Open the workspace/i })).toHaveAttribute("href", "/overview");
  });
});
