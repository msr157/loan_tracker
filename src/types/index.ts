import { Loan, AdditionalCharge, StepUpConfig, LoanType } from "@shared/schema";

// Calculated Loan Summary
export interface LoanSummary {
  emi: number;
  totalInterest: number;
  totalPayment: number;
  progress: number; // Percentage of loan completed
}

// Amortization schedule entry
export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// For loan comparison
export interface ComparisonResult {
  principalDifference: number;
  interestRateDifference: number;
  durationDifference: number;
  emiDifference: number;
  totalInterestDifference: number;
  totalPaymentDifference: number;
  interestToPrincipalRatioDifference: number;
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
  tension?: number;
}

// Step-up EMI preview entry
export interface StepUpPreviewEntry {
  yearRange: string;
  monthlyPayment: number;
  increase: number | null;
}

// Context types
export interface LoansContextType {
  loans: Loan[];
  addLoan: (loan: Omit<Loan, "id" | "createdAt" | "updatedAt">) => void;
  updateLoan: (loan: Loan) => void;
  deleteLoan: (id: string) => void;
  getLoanSummary: (loan: Loan) => LoanSummary;
  getAmortizationSchedule: (loan: Loan) => AmortizationEntry[];
  selectedLoans: string[];
  toggleLoanSelection: (id: string) => void;
  clearLoanSelection: () => void;
}
