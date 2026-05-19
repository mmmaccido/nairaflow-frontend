export enum TransactionStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export interface TransactionSummary {
  ngnAmount: number
  fee: number
  totalNGN: number
  targetAmount: number
  targetCurrency: string
  rate: number
  recipientName: string
  deliveryType: string
  rateLockExpiresAt: string
}

export interface Transaction {
  id: string
  user_id: string
  recipient_id: string | null
  agent_id: string | null
  ngn_amount: number
  target_currency: string
  target_amount: number
  usd_equivalent: number
  rate_ngn_to_target: number
  fee: number
  delivery_type: string
  status: TransactionStatus
  paystack_reference: string
  payout_provider: string | null
  payout_transfer_id: string | null
  rate_locked_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
  recipient?: {
    id: string
    first_name: string
    last_name: string
    country_code: string
    currency: string
    bank_details: Record<string, string>
  } | null
  agent?: {
    id: string
    city: string
    user: { first_name: string; last_name: string } | null
  } | null
}
