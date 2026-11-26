import { test, expect } from "@playwright/test";

test("five product routes keep simulation label and expose shell", async ({ page }) => {
  for (const route of ["/overview", "/dependency", "/evidence", "/bills", "/decisions"]) {
    await page.goto(route);
    await expect(page.getByText(/Simulation · demo data/i).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Product screens" })).toBeVisible();
  }
});

test("offline mocks remain available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  });
  await page.goto("/evidence");
  await expect(page.getByRole("main")).toBeVisible();
});

test("landing connects the story, demo and real workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("From payment incident to business impact.");
  await expect(page.getByRole("link", { name: /Open the workspace/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Try the guided demo/i }).first()).toBeVisible();

  for (const id of ["product", "how-it-works", "dependency", "financial", "bills", "decision", "governance"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.getByText(/All data is simulated/i).first()).toBeVisible();
});

test("the guided demo runs its interactive branches and records approval", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1, name: /payment provider slows down/i })).toBeVisible();

  await page.getByRole("button", { name: "Step 2: Payments" }).click();
  await page.getByRole("checkbox", { name: /inconclusive answer/i }).check();
  await page.getByRole("button", { name: /Check with provider/i }).click();
  await expect(page.getByText(/still not confirmed and are not counted/i)).toBeVisible();

  await page.getByRole("button", { name: "Step 3: Switching" }).click();
  await page.getByRole("button", { name: "Separate systems" }).click();
  await expect(page.getByText("Safe to switch").first()).toBeVisible();

  await page.getByRole("button", { name: "Step 4: Your money" }).click();
  await page.getByRole("slider", { name: /Assumed recovery rate/i }).fill("10000");
  await expect(page.getByText("₦250,000").first()).toBeVisible();
  await expect(page.getByText(/never counted as confirmed cash/i)).toBeVisible();

  await page.getByRole("button", { name: "Step 5: Decision" }).click();
  await expect(page.getByText(/Route new checkouts to Provider B/i)).toBeVisible();
  const approveButton = page.getByRole("button", { name: /^Approve$/i });
  await expect(approveButton).toBeDisabled();
  await page.getByRole("combobox", { name: /Demo role/i }).selectOption("approver");
  await approveButton.click();
  await expect(page.getByText(/Approved and recorded/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the workspace/i }).last()).toHaveAttribute("href", "/overview");
});

test("key routes have no horizontal overflow at the configured viewport", async ({ page }) => {
  for (const route of ["/", "/demo", "/overview", "/dependency", "/evidence", "/bills", "/decisions"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${route} overflowed by ${overflow}px`).toBeLessThanOrEqual(2);
  }
});

test("bills flow: request, a different person approves, then it is marked done", async ({ page }) => {
  await page.goto("/bills");
  await page.getByRole("combobox", { name: /Demo role/i }).selectOption("operator");
  const list = page.getByRole("list", { name: /bills in due-date order/i });
  await expect(list.getByText("At risk").first()).toBeVisible();
  await list.getByRole("button", { name: /Pay in two parts/i }).click();
  await expect(page.getByText("Waiting for approval")).toBeVisible();

  await page.getByRole("combobox", { name: /Demo role/i }).selectOption("approver");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Approved, not done yet")).toBeVisible();

  await page.getByLabel(/What happened when you did it/i).fill("Supplier agreed to part payment");
  await page.getByRole("button", { name: /Mark as done/i }).click();
  await expect(page.getByText("Outcome: Supplier agreed to part payment")).toBeVisible();
});
