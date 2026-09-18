import "server-only"

export type ApiErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"

export function apiError(
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: ApiErrorCode,
  message: string,
) {
  return Response.json({ error: message, code }, { status })
}

export function logServerError(operation: string, error: unknown) {
  const errorName = error instanceof Error ? error.name : "UnknownError"
  console.error(`${operation} failed`, { errorName })
}
