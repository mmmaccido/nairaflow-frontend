export interface BankDetails {
  // US
  accountNumber?: string
  routingNumber?: string
  // CA
  transitNumber?: string
  institutionNumber?: string
  // GB
  sortCode?: string
  // AU
  bsb?: string
  // GH
  provider?: string
  mobileNumber?: string
  // NG cash
  recipientName?: string
  phone?: string
  address?: string
  city?: string
  // EU/TR SEPA
  iban?: string
  bic?: string
  // generic
  [key: string]: string | undefined
}

export interface Recipient {
  id: string
  user_id: string
  first_name: string
  last_name: string
  country_code: string
  currency: string
  delivery_type: string
  bank_details: BankDetails
  deleted_at: string | null
  created_at: string
  updated_at: string
}
