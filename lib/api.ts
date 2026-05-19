"use client"

import axios from "axios"
import Cookies from "js-cookie"
import { COOKIE_NAME } from "@/lib/constants"

export { COOKIE_NAME }

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
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

// On 401: clear auth and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove(COOKIE_NAME)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
