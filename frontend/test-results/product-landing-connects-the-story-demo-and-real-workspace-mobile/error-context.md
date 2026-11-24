# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product.spec.ts >> landing connects the story, demo and real workspace
- Location: e2e\product.spec.ts:19:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('heading', { level: 1 })
Expected substring: "From payment incident to business impact"
Received string:    "Frompaymentincidenttobusinessimpact."
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('heading', { level: 1 }) with timeout 5000ms
  - waiting for getByRole('heading', { level: 1 })
    12 × locator resolved to <h1 id="hero-title" class="font-heading">…</h1>
       - unexpected value "Frompaymentincidenttobusinessimpact."

```

```yaml
- heading "From payment incident to business impact." [level=1]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("four product routes keep simulation label and expose shell", async ({ page }) => {
  4  |   for (const route of ["/overview", "/dependency", "/evidence", "/decisions"]) {
  5  |     await page.goto(route);
  6  |     await expect(page.getByText("SIMULATION").first()).toBeVisible();
  7  |     await expect(page.getByRole("navigation", { name: "Product screens" })).toBeVisible();
  8  |   }
  9  | });
  10 | 
  11 | test("offline mocks remain available", async ({ page }) => {
  12 |   await page.addInitScript(() => {
  13 |     Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  14 |   });
  15 |   await page.goto("/evidence");
  16 |   await expect(page.getByRole("main")).toBeVisible();
  17 | });
  18 | 
  19 | test("landing connects the story, demo and real workspace", async ({ page }) => {
  20 |   await page.goto("/");
> 21 |   await expect(page.getByRole("heading", { level: 1 })).toContainText("From payment incident to business impact");
     |                                                         ^ Error: expect(locator).toContainText(expected) failed
  22 |   await expect(page.getByRole("link", { name: /Enter Workspace/i }).first()).toBeVisible();
  23 |   await expect(page.getByRole("link", { name: /Open Interactive Demo/i })).toBeVisible();
  24 | 
  25 |   for (const id of ["product", "how-it-works", "dependency", "financial", "decision", "governance"]) {
  26 |     await expect(page.locator(`#${id}`)).toHaveCount(1);
  27 |   }
  28 |   await expect(page.getByText(/All data is simulated/i).first()).toBeVisible();
  29 | });
  30 | 
  31 | test("the guided demo runs its interactive branches and records approval", async ({ page }) => {
  32 |   await page.goto("/demo");
  33 |   await expect(page.getByRole("heading", { level: 1, name: /Ade Stores/i })).toBeVisible();
  34 | 
  35 |   // Evidence: an inconclusive provider check never confirms the unknown funds.
  36 |   await page.getByRole("button", { name: "Stage 2: Transactions" }).click();
  37 |   await page.getByRole("checkbox", { name: /inconclusive provider response/i }).check();
  38 |   await page.getByRole("button", { name: /Run check/i }).click();
  39 |   await expect(page.getByText("Provider check inconclusive")).toBeVisible();
  40 |   await expect(page.getByText(/Retry blocked · unknown · check failed/i).first()).toBeVisible();
  41 | 
  42 |   // Dependency: an independent branch changes the recommendation.
  43 |   await page.getByRole("button", { name: "Stage 3: Dependency" }).click();
  44 |   await page.getByRole("button", { name: "independent", exact: true }).click();
  45 |   await expect(page.getByText("INDEPENDENT").first()).toBeVisible();
  46 | 
  47 |   // Finance: full recovery produces the contract position, still labelled an assumption.
  48 |   await page.getByRole("button", { name: "Stage 4: Financial" }).click();
  49 |   await page.getByRole("slider", { name: /Assumed recovery rate/i }).fill("10000");
  50 |   await expect(page.getByText("₦250,000").first()).toBeVisible();
  51 |   await expect(page.getByText(/never counted as confirmed cash/i)).toBeVisible();
  52 | 
  53 |   // Decision and approval: the branch changes the action; only approver can decide.
  54 |   await page.getByRole("button", { name: "Stage 5: Decision" }).click();
  55 |   await expect(page.getByText(/Route new checkouts to Provider B/i)).toBeVisible();
  56 | 
  57 |   await page.getByRole("button", { name: "Stage 6: Approval" }).click();
  58 |   const approveButton = page.getByRole("button", { name: /^Approve$/i });
  59 |   await expect(approveButton).toBeDisabled();
  60 |   await page.getByRole("combobox", { name: /Demo role/i }).selectOption("approver");
  61 |   await approveButton.click();
  62 |   await expect(page.getByText(/Decision approve recorded/i)).toBeVisible();
  63 | 
  64 |   await page.getByRole("button", { name: "Stage 7: Report" }).click();
  65 |   await expect(page.getByRole("link", { name: /Enter Workspace/i }).last()).toHaveAttribute("href", "/overview");
  66 |   await expect(page.getByText(/recorded by approver/i)).toBeVisible();
  67 | });
  68 | 
  69 | test("key routes have no horizontal overflow at the configured viewport", async ({ page }) => {
  70 |   for (const route of ["/", "/demo", "/overview", "/dependency", "/evidence", "/decisions"]) {
  71 |     await page.goto(route);
  72 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  73 |     expect(overflow, `${route} overflowed by ${overflow}px`).toBeLessThanOrEqual(2);
  74 |   }
  75 | });
  76 | 
```