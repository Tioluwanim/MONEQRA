"use client";

import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "./api";
import {
  auditSchema,
  liquiditySchema,
  paymentListSchema,
  recommendationListSchema,
} from "./schemas";

async function fetchValidated<T>(path: string, schema: { parse: (value: unknown) => T }): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return schema.parse(await response.json());
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => fetchValidated("/v1/payments", paymentListSchema),
  });
}

export function useFinancialImpact() {
  return useQuery({
    queryKey: ["financial-impact"],
    queryFn: () =>
      fetchValidated(
        "/v1/financial-impact?deadline=2026-11-19T17:00:00%2B01:00&recovery_probability_bps=6000",
        liquiditySchema,
      ),
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: () => fetchValidated("/v1/recommendations", recommendationListSchema),
  });
}

export function useAudit() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: () => fetchValidated("/v1/audit", auditSchema),
  });
}
