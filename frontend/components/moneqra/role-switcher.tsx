"use client";

import { roleLabels } from "@/lib/labels";
import type { DemoRole } from "./types";

export function RoleSwitcher({
  role,
  onChange,
}: {
  role: DemoRole;
  onChange: (role: DemoRole) => void;
}) {
  return (
    <label className="inline-flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--text)]">Demo role</span>
      <select
        value={role}
        onChange={(event) => onChange(event.target.value as DemoRole)}
        className="field w-auto min-w-44"
      >
        {(Object.keys(roleLabels) as DemoRole[]).map((value) => (
          <option key={value} value={value}>{roleLabels[value].label}</option>
        ))}
      </select>
      <span className="text-xs text-[var(--text-muted)]">{roleLabels[role].hint}</span>
    </label>
  );
}
