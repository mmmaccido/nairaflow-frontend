import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email({ error: "Please enter a valid email address." }),
  password: z.string().min(8, { error: "Password must be at least 8 characters." }),
})

export const registerSchema = z
  .object({
    firstName: z.string().min(1, { error: "First name is required." }).trim(),
    lastName: z.string().min(1, { error: "Last name is required." }).trim(),
    email: z.string().email({ error: "Please enter a valid email address." }).trim(),
    phone: z
      .string()
      .regex(/^\+234\d{10}$/, {
        error: "Phone must be a Nigerian number (+234 followed by 10 digits).",
      }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters." })
      .regex(/[A-Z]/, { error: "Password must contain at least one uppercase letter." })
      .regex(/[0-9]/, { error: "Password must contain at least one number." })
      .regex(/[^a-zA-Z0-9]/, { error: "Password must contain at least one special character." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export const sendMoneySchema = z.object({
  ngnAmount: z
    .number({ error: "Amount must be a number." })
    .min(1000, { error: "Minimum transfer amount is ₦1,000." })
    .max(5_000_000, { error: "Maximum transfer amount is ₦5,000,000." }),
  targetCurrency: z.string().min(1, { error: "Please select a currency." }),
  deliveryType: z.string().min(1, { error: "Please select a delivery method." }),
  recipientId: z.string().uuid({ error: "Please select a recipient." }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type SendMoneyInput = z.infer<typeof sendMoneySchema>
