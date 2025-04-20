import { z } from "zod";

// Define Loan schema
export const loanTypes = z.enum([
  "Home Loan",
  "Car Loan",
  "Personal Loan",
  "Education Loan",
  "Business Loan",
  "Other",
]);

export type LoanType = z.infer<typeof loanTypes>;

export const additionalChargeSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  type: z.enum(["one-time", "recurring"]),
  frequency: z.enum(["monthly", "yearly", "once"]).optional(),
  appliedAt: z.enum(["beginning", "end"]).optional(),
});

export type AdditionalCharge = z.infer<typeof additionalChargeSchema>;

export const stepUpConfigSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: z.enum(["Yearly", "Every 2 Years", "Every 5 Years"]).optional(),
  increasePercentage: z.number().min(0).max(100).optional(),
});

export type StepUpConfig = z.infer<typeof stepUpConfigSchema>;

export const loanSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: loanTypes,
  principal: z.number().positive(),
  interestRate: z.number().positive(),
  durationMonths: z.number().int().positive(),
  startDate: z.string(), // ISO string
  stepUpConfig: stepUpConfigSchema.optional(),
  additionalCharges: z.array(additionalChargeSchema).optional(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
});

export type Loan = z.infer<typeof loanSchema>;

// For form validation
export const insertLoanSchema = loanSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLoan = z.infer<typeof insertLoanSchema>;
