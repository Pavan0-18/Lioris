export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function apiError(
  message: string,
  code: string,
  status = 400,
): Response {
  return Response.json({ error: message, code }, { status });
}

export function apiErrorFromException(err: unknown): Response {
  const e = err as any;
  const code = e?.code ?? "INTERNAL_ERROR";
  const status = e?.status ?? 500;
  const message = e?.message ?? "An unexpected error occurred";
  if (status === 500) console.error("API error:", err);
  return apiError(message, code, status);
}
