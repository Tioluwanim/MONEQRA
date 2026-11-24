import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { landingData } from "@/lib/landing-data";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MONEQRA cinematic landing", () => {
  const reducedMedia = (matches: boolean) => ({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  });

  it("renders the complete story and honest prototype label", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue(reducedMedia(true));
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent?.replace(/\s/g, "")).toMatch(/Frompaymentincidenttobusinessimpact/i);
    expect(screen.getAllByText(/SIMULATION/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/All data is simulated/i).length).toBeGreaterThan(0);
  });

  it("shows landing numbers exactly from the centralized integer-kobo data", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue(reducedMedia(true));
    render(<Home />);
    expect(landingData.openingAvailableKobo).toBe(15000000);
    expect(landingData.settledKobo).toBe(84000000);
    expect(landingData.unknownKobo).toBe(36000000);
    expect(landingData.obligationKobo).toBe(110000000);
    expect(landingData.scenarios.map((item) => item.positionKobo)).toEqual([-11000000, 10600000, 25000000]);
  });

  it("links demo CTAs to /demo and contains no forbidden claims", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue(reducedMedia(true));
    render(<Home />);
    expect(screen.getAllByRole("link", { name: "Demo" }).length).toBeGreaterThan(0);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/bank data/i);
    expect(text).not.toMatch(/no one else/i);
  });
});
