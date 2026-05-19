"use client"

import { create } from "zustand"
import Cookies from "js-cookie"
import apiClient from "@/lib/api"
import { COOKIE_NAME, COOKIE_EXPIRY_DAYS } from "@/lib/constants"
import type { User } from "@/types/user"

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    Cookies.set(COOKIE_NAME, token, { expires: COOKIE_EXPIRY_DAYS, sameSite: "Lax" })
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  clearAuth: () => {
    Cookies.remove(COOKIE_NAME)
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  initAuth: async () => {
    const token = Cookies.get(COOKIE_NAME)
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const response = await apiClient.get<User>("/user")
      set({ user: response.data, token, isAuthenticated: true, isLoading: false })
    } catch {
      Cookies.remove(COOKIE_NAME)
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
