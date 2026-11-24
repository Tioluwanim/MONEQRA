# Ade Stores demo script

Run the frontend at `http://localhost:3000` and the backend on `http://localhost:8000`.

1. Open `/overview`. Verify `SIMULATION` is visible and the active incident is shown.
2. Open `/dependency`. Load the shared branch. Two routes should end on the shared upstream switch and show `SHARED`.
3. Open `/evidence`. Confirm 12 unknown payments are listed. Their retry controls must remain blocked.
4. Open `/decisions`. Use the contract-provided liquidity values:
   - Opening: 150,000 naira.
   - Settled: 840,000 naira.
   - Unknown: 360,000 naira, excluded from cash.
   - Obligation: 1,100,000 naira.
   - No recovery: -110,000 naira.
   - Assumed recovery: +106,000 naira, labelled an assumption.
   - Full recovery: +250,000 naira.
5. Shared branch: the recommendation withholds reroute and offers an extension request.
6. Reject or approve only while logged in as approver or admin.
7. Open `/decisions` again and confirm the decision hash in the audit log.
8. Independent branch: load the independent branch and verify that only one route is affected.

Backend commands:

```powershell
Set-Location C:\Users\User\Documents\MONEQRA\backend
$env:MONEQRA_SIMULATION_MODE="true"
uvicorn app.main:app --reload --port 8000
```
