# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product.spec.ts >> four product routes keep simulation label and expose shell
- Location: e2e\product.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/overview", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("four product routes keep simulation label and expose shell", async ({ page }) => {
  4  |   for (const route of ["/overview", "/dependency", "/evidence", "/decisions"]) {
> 5  |     await page.goto(route);
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  6  |     await expect(page.getByText("SIMULATION").first()).toBeVisible();
  7  |   }
  8  | });
  9  | 
  10 | test("offline mocks remain available", async ({ page }) => {
  11 |   await page.addInitScript(() => {
  12 |     Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  13 |   });
  14 |   await page.goto("/evidence");
  15 |   await expect(page.getByRole("main")).toBeVisible();
  16 | });
  17 | 
```