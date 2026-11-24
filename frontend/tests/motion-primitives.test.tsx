import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KineticHeadline } from "@/components/motion/kinetic-headline";
import { KoboTicker, ScrambleNumber } from "@/components/motion/scramble-number";
import { TypeLine } from "@/components/motion/type-line";
import { MarqueeRail } from "@/components/motion/marquee-rail";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("Stage 2 text and number primitives", () => {
  it("renders KineticHeadline content in the final state without JS motion", () => {
    mockReducedMotion(true);
    render(<KineticHeadline lines={["Payment", "under pressure"]}>Payment under pressure</KineticHeadline>);
    expect(screen.getByText("Payment")).toBeVisible();
    expect(screen.getByText("under pressure")).toBeVisible();
  });

  it("renders negative kobo exactly under reduced motion", () => {
    mockReducedMotion(true);
    render(<ScrambleNumber kobo={-11000000} />);
    expect(screen.getByText("-₦110,000")).toBeVisible();
  });

  it("renders KoboTicker exact positive and negative values", () => {
    mockReducedMotion(true);
    const { rerender } = render(<KoboTicker kobo={84000000} />);
    expect(screen.getByText("₦840,000")).toBeVisible();
    rerender(<KoboTicker kobo={-2500000} />);
    expect(screen.getByText("-₦25,000")).toBeVisible();
  });

  it("renders TypeLine final text immediately under reduced motion", () => {
    mockReducedMotion(true);
    render(<TypeLine text="Detect shared failure" />);
    expect(screen.getAllByText("Detect shared failure").length).toBeGreaterThan(0);
  });

  it("renders a static MarqueeRail under reduced motion", () => {
    mockReducedMotion(true);
    render(<MarqueeRail><span>ade-001</span><span>paystack</span></MarqueeRail>);
    expect(screen.getAllByText("ade-001")).toHaveLength(1);
    expect(screen.getAllByText("paystack")).toHaveLength(1);
  });
});
