import { AxiosError } from "axios"

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    // No response received at all (offline, backend down, CORS preflight blocked)
    if (!error.response) return "Network error. Please check your connection."

    const data = error.response.data as Record<string, unknown> | null | undefined

    // 422 validation errors: { errors: { field: ['message'] } }
    if (data?.errors && typeof data.errors === "object") {
      const errors = data.errors as Record<string, string[]>
      const first = Object.values(errors)[0]
      if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    }

    // Auth / general errors: { message: 'string' }
    if (data && typeof data.message === "string") return data.message
  }

  return "An unexpected error occurred."
}
