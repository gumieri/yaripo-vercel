const API_BASE = process.env.NEXT_PUBLIC_APP_URL || ""

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })

  const json = await res.json()

  if (!json.success) {
    throw new ApiError(
      json.error?.code || "UNKNOWN",
      json.error?.message || "Request failed",
      res.status,
    )
  }

  return json.data
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
    this.name = "ApiError"
  }
}
