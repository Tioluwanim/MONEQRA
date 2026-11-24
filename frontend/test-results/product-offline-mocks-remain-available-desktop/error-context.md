# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product.spec.ts >> offline mocks remain available
- Location: e2e\product.spec.ts:10:1

# Error details

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "MONEQRA" [ref=e5] [cursor=pointer]:
          - /url: /
        - navigation "Product screens" [ref=e6]:
          - link "Overview" [ref=e7] [cursor=pointer]:
            - /url: /overview
          - link "Dependency" [ref=e8] [cursor=pointer]:
            - /url: /dependency
          - link "Evidence" [ref=e9] [cursor=pointer]:
            - /url: /evidence
          - link "Decisions" [ref=e10] [cursor=pointer]:
            - /url: /decisions
        - generic [ref=e11]:
          - generic [ref=e12]: Demo role
          - combobox "Demo role" [ref=e13]:
            - option "Viewer"
            - option "Operator"
            - option "Approver" [selected]
            - option "Admin"
          - generic [ref=e14]: SIMULATION
    - status [ref=e15]: Network unavailable. Showing only already loaded data.
    - main [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]:
          - paragraph [ref=e19]: EVIDENCE / IMPACT
          - heading "Payments and liquidity" [level=1] [ref=e20]
        - generic [ref=e21]: SIMULATION
      - generic [ref=e22]:
        - generic [ref=e23]: State
        - combobox "State" [ref=e24]:
          - option "All" [selected]
          - option "created"
          - option "pending"
          - option "unknown"
          - option "succeeded"
          - option "settled"
          - option "failed"
          - option "reversed"
      - alert [ref=e25]:
        - strong [ref=e26]: Payments unavailable
        - text: Failed to fetch
      - alert [ref=e27]:
        - strong [ref=e28]: Liquidity unavailable
        - text: Failed to fetch
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]
  - alert [ref=e38]
```