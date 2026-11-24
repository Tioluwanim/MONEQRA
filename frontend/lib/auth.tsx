"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type DemoRole = "viewer" | "operator" | "approver" | "admin";

export const demoCredentials: Record<DemoRole, string> = {
  viewer: "demo-viewer-key",
  operator: "demo-operator-key",
  approver: "demo-approver-key",
  admin: "demo-admin-key",
};

interface AuthContextValue {
  role: DemoRole;
  credential: string;
  orgId: string;
  login: (role: DemoRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const orgId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DemoRole>("approver");
  const [credential, setCredential] = useState(demoCredentials.approver);

  const login = useCallback(async (nextRole: DemoRole) => {
    setCredential(demoCredentials[nextRole]);
    setRole(nextRole);
  }, []);

  const logout = useCallback(() => {
    setCredential("");
    setRole("viewer");
  }, []);

  const value = useMemo(() => ({ role, credential, orgId, login, logout }), [role, credential, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
