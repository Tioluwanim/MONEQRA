import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SharedFailureScene, AnimatedBeam } from "@/components/motion/story-scenes";
import { LiquidityScene, PinnedStepFlow } from "@/components/motion/pinned-story";
import { ApprovalMoment } from "@/components/motion/approval-moment";
import { PaymentStream } from "@/components/motion/graphics";

afterEach(() => cleanup());

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("Motion story and guard behavior", () => {
  it("renders shared and independent static verdict fallback", () => {
    mockReducedMotion(true);
    const shared = render(<SharedFailureScene shared />);
    expect(screen.getByText("SHARED")).toBeVisible();
    shared.unmount();
    render(<SharedFailureScene shared={false} />);
    expect(screen.getByText("INDEPENDENT")).toBeVisible();
  });

  it("renders liquidity numbers exactly and never adds unknown money", () => {
    mockReducedMotion(true);
    render(<LiquidityScene opening={84000000} settled={36000000} unknown={21600000} obligation={11000000} scenarios={[{ label: "Worst", kobo: -11000000 }, { label: "Full", kobo: 25000000 }]} />);
    expect(screen.getByText("₦840,000")).toBeVisible();
    expect(screen.getByText(/Unknown: ₦216,000 — excluded/)).toBeVisible();
    expect(screen.getByText("-₦110,000")).toBeVisible();
  });

  it("renders approval and reject final states", () => {
    mockReducedMotion(true);
    const approved = render(<ApprovalMoment action="approve" />);
    expect(screen.getByText("SIGNED")).toBeVisible();
    approved.unmount();
    render(<ApprovalMoment action="reject" />);
    expect(screen.getByText("REJECTED")).toBeVisible();
  });

  it("uses a static beam under reduced motion", () => {
    mockReducedMotion(true);
    render(<AnimatedBeam />);
    expect(document.querySelector("animateMotion")).not.toBeInTheDocument();
  });

  it("swaps PaymentStream out of canvas on low tier or reduced motion", () => {
    mockReducedMotion(true);
    render(<PaymentStream state="incident" />);
    expect(screen.getByLabelText("Payment stream: incident")).toBeVisible();
  });

  it("renders pinned flow in static final-safe form", () => {
    mockReducedMotion(true);
    render(<PinnedStepFlow />);
    expect(screen.getByText("1. Detect")).toBeVisible();
    expect(screen.getByText("6. Approve")).toBeVisible();
  });
});
