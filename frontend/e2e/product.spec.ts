import { test, expect } from "@playwright/test";

test("four product routes keep simulation label and expose shell", async ({ page }) => {
  for (const route of ["/overview", "/dependency", "/evidence", "/decisions"]) {
    await page.goto(route);
    await expect(page.getByText("SIMULATION").first()).toBeVisible();
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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From payment incident to business impact");
  await expect(page.getByRole("link", { name: /Enter Workspace/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Interactive Demo/i })).toBeVisible();

  for (const id of ["product", "how-it-works", "dependency", "financial", "decision", "governance"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.getByText(/All data is simulated/i).first()).toBeVisible();
});

test("the guided demo runs its interactive branches and records approval", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1, name: /Ade Stores/i })).toBeVisible();

  // Evidence: an inconclusive provider check never confirms the unknown funds.
  await page.getByRole("button", { name: "Stage 2: Transactions" }).click();
  await page.getByRole("checkbox", { name: /inconclusive provider response/i }).check();
  await page.getByRole("button", { name: /Run check/i }).click();
  await expect(page.getByText("Provider check inconclusive")).toBeVisible();
  await expect(page.getByText(/Retry blocked · unknown · check failed/i).first()).toBeVisible();

  // Dependency: an independent branch changes the recommendation.
  await page.getByRole("button", { name: "Stage 3: Dependency" }).click();
  await page.getByRole("button", { name: "independent", exact: true }).click();
  await expect(page.getByText("INDEPENDENT").first()).toBeVisible();

  // Finance: full recovery produces the contract position, still labelled an assumption.
  await page.getByRole("button", { name: "Stage 4: Financial" }).click();
  await page.getByRole("slider", { name: /Assumed recovery rate/i }).fill("10000");
  await expect(page.getByText("₦250,000").first()).toBeVisible();
  await expect(page.getByText(/never counted as confirmed cash/i)).toBeVisible();

  // Decision and approval: the branch changes the action; only approver can decide.
  await page.getByRole("button", { name: "Stage 5: Decision" }).click();
  await expect(page.getByText(/Route new checkouts to Provider B/i)).toBeVisible();

  await page.getByRole("button", { name: "Stage 6: Approval" }).click();
  const approveButton = page.getByRole("button", { name: /^Approve$/i });
  await expect(approveButton).toBeDisabled();
  await page.getByRole("combobox", { name: /Demo role/i }).selectOption("approver");
  await approveButton.click();
  await expect(page.getByText(/Decision approve recorded/i)).toBeVisible();

  await page.getByRole("button", { name: "Stage 7: Report" }).click();
  await expect(page.getByRole("link", { name: /Enter Workspace/i }).last()).toHaveAttribute("href", "/overview");
  await expect(page.getByText(/recorded by approver/i)).toBeVisible();
});

test("key routes have no horizontal overflow at the configured viewport", async ({ page }) => {
  for (const route of ["/", "/demo", "/overview", "/dependency", "/evidence", "/decisions"]) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${route} overflowed by ${overflow}px`).toBeLessThanOrEqual(2);
  }
});
