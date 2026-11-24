"use client";

import type { DemoRole } from "./types";

export function RoleSwitcher({
  role,
  onChange,
}: {
  role: DemoRole;
  onChange: (role: DemoRole) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>Demo role</span>
      <select
        value={role}
        onChange={(event) => onChange(event.target.value as DemoRole)}
        className="h-8 border border-[var(--ledger-rule-strong)] bg-[var(--paper-raised)] px-2"
      >
        <option value="viewer">Viewer</option>
        <option value="operator">Operator</option>
        <option value="approver">Approver</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  );
}
