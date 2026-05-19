import { AxiosError } from "axios"

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Record<string, unknown> | undefined
    if (!data) return "Network error. Please check your connection."

    // 422 validation errors: { errors: { field: ['message'] } }
    if (data.errors && typeof data.errors === "object") {
      const errors = data.errors as Record<string, string[]>
      const first = Object.values(errors)[0]
      if (Array.isArray(first) && typeof first[0] === "string") return first[0]
    }

    // Auth / general errors: { message: 'string' }
    if (typeof data.message === "string") return data.message
  }

  return "An unexpected error occurred."
}
