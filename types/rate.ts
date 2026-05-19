export interface Rate {
  currency: string
  name: string
  symbol: string
  flag: string
  market_rate: number
  our_rate: number
  spread_percent: number
  payout: string
  speed: string
  source: string
  recorded_at: string
}

export type RatesResponse = Rate[]
