import { test, expect } from "@playwright/test";

test("four product routes keep simulation label and expose shell", async ({ page }) => {
  for (const route of ["/overview", "/dependency", "/evidence", "/decisions"]) {
    await page.goto(route);
    await expect(page.getByText("SIMULATION").first()).toBeVisible();
  }
});

test("offline mocks remain available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  });
  await page.goto("/evidence");
  await expect(page.getByRole("main")).toBeVisible();
});
