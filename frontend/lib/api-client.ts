import { z } from "zod";
import { apiUrl } from "./api";
import { ensureMocksStarted } from "./mock-ready";

export interface ApiErrorShape {
  error: { code: string; message: string; details?: Record<string, unknown> };
  request_id: string;
}

export class MoneqraApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(status: number, message: string, code?: string, requestId?: string) {
    super(message);
    this.name = "MoneqraApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  credential: string,
  signal?: AbortSignal,
  init?: RequestInit,
) {
  if (!credential) throw new MoneqraApiError(401, "Authentication required");
  await ensureMocksStarted();

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    signal,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${credential}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({
      error: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }),
      request_id: z.string(),
    }).safeParse(data);
    if (parsed.success) {
      throw new MoneqraApiError(response.status, parsed.data.error.message, parsed.data.error.code, parsed.data.request_id);
    }
    throw new MoneqraApiError(response.status, `Request failed (${response.status})`);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new MoneqraApiError(
      422,
      `Malformed API response: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
      "INVALID_REQUEST",
    );
  }
  return parsed.data;
}
