export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: "USER" | "ADMIN" | "AGENT"
  kyc_status: "PENDING" | "APPROVED" | "REJECTED"
  kyc_tier: 0 | 1 | 2
  bvn_verified: boolean
  two_factor_enabled: boolean
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  token: string
  user: User
}
