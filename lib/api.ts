"use client"

import axios from "axios"
import Cookies from "js-cookie"
import { toast } from "sonner"
import { COOKIE_NAME } from "@/lib/constants"

export { COOKIE_NAME }

const apiUrl = process.env.NEXT_PUBLIC_API_URL
if (!apiUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not defined. Add it to your .env.local (development) or set it in your deployment environment."
  )
}

const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

// Attach Bearer token from cookie on every request
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(COOKIE_NAME)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: clear auth and redirect to login. On 429: surface rate-limit toast.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove(COOKIE_NAME)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    } else if (error.response?.status === 429) {
      toast.error("Too many requests. Please wait a moment.")
    }
    return Promise.reject(error)
  }
)

export default apiClient
