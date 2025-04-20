import { Loan, AdditionalCharge, StepUpConfig } from "@shared/schema";
import { AmortizationEntry, LoanSummary, StepUpPreviewEntry } from "@/types";

/**
 * Calculate the EMI (Equated Monthly Installment) for a loan
 * 
 * Formula: EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
 * Where:
 * P = Principal loan amount
 * R = Monthly interest rate (annual rate / 12 / 100)
 * N = Loan tenure in months
 */
export const calculateEMI = (principal: number, interestRate: number, durationMonths: number): number => {
  const monthlyRate = interestRate / 12 / 100;
  
  if (monthlyRate === 0) {
    // For 0% interest loans, simply divide principal by duration
    return principal / durationMonths;
  }
  
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) / 
              (Math.pow(1 + monthlyRate, durationMonths) - 1);
  
  return Math.round(emi);
};

/**
 * Calculate total interest over the loan period
 */
export const calculateTotalInterest = (principal: number, emi: number, durationMonths: number): number => {
  return (emi * durationMonths) - principal;
};

/**
 * Generate amortization schedule for a loan
 */
export const generateAmortizationSchedule = (
  principal: number, 
  interestRate: number, 
  durationMonths: number, 
  stepUpConfig?: StepUpConfig
): AmortizationEntry[] => {
  const monthlyRate = interestRate / 12 / 100;
  let remainingBalance = principal;
  const schedule: AmortizationEntry[] = [];
  
  // Start with the base EMI
  let currentEmi = calculateEMI(principal, interestRate, durationMonths);
  
  for (let month = 1; month <= durationMonths; month++) {
    // Check if we need to apply step-up EMI increase
    if (stepUpConfig?.enabled && stepUpConfig.frequency && stepUpConfig.increasePercentage) {
      let increaseFrequencyMonths = 12; // Default to yearly
      
      // Convert frequency string to months
      if (stepUpConfig.frequency === "Every 2 Years") {
        increaseFrequencyMonths = 24;
      } else if (stepUpConfig.frequency === "Every 5 Years") {
        increaseFrequencyMonths = 60;
      }
      
      // Apply increase if we're at a frequency boundary (and not the first payment)
      if (month > 1 && month % increaseFrequencyMonths === 1) {
        currentEmi = currentEmi * (1 + (stepUpConfig.increasePercentage / 100));
      }
    }
    
    // Calculate interest and principal components for this month
    const interestForMonth = remainingBalance * monthlyRate;
    let principalForMonth = currentEmi - interestForMonth;
    
    // Handle the last payment to match exactly with the remaining balance
    if (month === durationMonths || principalForMonth > remainingBalance) {
      principalForMonth = remainingBalance;
      currentEmi = principalForMonth + interestForMonth;
    }
    
    // Update remaining balance
    remainingBalance -= principalForMonth;
    
    // Add to schedule
    schedule.push({
      month,
      payment: Math.round(currentEmi),
      principal: Math.round(principalForMonth),
      interest: Math.round(interestForMonth),
      balance: Math.max(0, Math.round(remainingBalance)) // Ensure balance doesn't go negative
    });
  }
  
  return schedule;
};

/**
 * Calculate additional charges for a loan
 */
export const calculateTotalAdditionalCharges = (
  charges: AdditionalCharge[] = [], 
  durationMonths: number
): number => {
  return charges.reduce((total, charge) => {
    if (charge.type === "one-time") {
      return total + charge.amount;
    } else if (charge.type === "recurring") {
      if (charge.frequency === "monthly") {
        return total + (charge.amount * durationMonths);
      } else if (charge.frequency === "yearly") {
        return total + (charge.amount * Math.ceil(durationMonths / 12));
      }
    }
    return total + charge.amount;
  }, 0);
};

/**
 * Calculate loan progress percentage based on start date and duration
 */
export const calculateLoanProgress = (startDate: string, durationMonths: number): number => {
  const start = new Date(startDate);
  const current = new Date();
  
  // Calculate months elapsed
  const monthsElapsed = 
    (current.getFullYear() - start.getFullYear()) * 12 + 
    (current.getMonth() - start.getMonth());
  
  if (monthsElapsed <= 0) return 0;
  if (monthsElapsed >= durationMonths) return 100;
  
  return (monthsElapsed / durationMonths) * 100;
};

/**
 * Get a full loan summary with all calculated values
 */
export const getLoanSummary = (loan: Loan): LoanSummary => {
  const emi = calculateEMI(loan.principal, loan.interestRate, loan.durationMonths);
  const totalInterest = calculateTotalInterest(loan.principal, emi, loan.durationMonths);
  const totalPayment = loan.principal + totalInterest;
  const progress = calculateLoanProgress(loan.startDate, loan.durationMonths);
  
  return {
    emi,
    totalInterest,
    totalPayment,
    progress
  };
};

/**
 * Generate step-up EMI preview
 */
export const generateStepUpPreview = (
  principal: number,
  interestRate: number,
  durationMonths: number,
  stepUpConfig: StepUpConfig
): StepUpPreviewEntry[] => {
  const preview: StepUpPreviewEntry[] = [];
  
  if (!stepUpConfig.enabled || !stepUpConfig.frequency || !stepUpConfig.increasePercentage) {
    // Return base EMI without step-up if not enabled
    const baseEmi = calculateEMI(principal, interestRate, durationMonths);
    preview.push({
      yearRange: `1-${Math.ceil(durationMonths/12)}`,
      monthlyPayment: baseEmi,
      increase: null
    });
    return preview;
  }
  
  // Calculate frequency in years
  let frequencyYears = 1; // Default for 'Yearly'
  if (stepUpConfig.frequency === "Every 2 Years") {
    frequencyYears = 2;
  } else if (stepUpConfig.frequency === "Every 5 Years") {
    frequencyYears = 5;
  }
  
  // Calculate duration in years (rounded up)
  const durationYears = Math.ceil(durationMonths / 12);
  
  // Base EMI
  let currentEmi = calculateEMI(principal, interestRate, durationMonths);
  
  // Generate preview entries
  for (let startYear = 1; startYear <= durationYears; startYear += frequencyYears) {
    const endYear = Math.min(startYear + frequencyYears - 1, durationYears);
    
    preview.push({
      yearRange: startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`,
      monthlyPayment: Math.round(currentEmi),
      increase: startYear === 1 ? null : stepUpConfig.increasePercentage
    });
    
    // Apply step-up for next period
    currentEmi = currentEmi * (1 + (stepUpConfig.increasePercentage / 100));
  }
  
  return preview;
};

/**
 * Compare two loans and calculate the differences
 */
export const compareLoanDetails = (loan1: Loan, loan2: Loan): ComparisonResult => {
  const summary1 = getLoanSummary(loan1);
  const summary2 = getLoanSummary(loan2);
  
  const principalDifference = loan1.principal - loan2.principal;
  const interestRateDifference = loan1.interestRate - loan2.interestRate;
  const durationDifference = loan1.durationMonths - loan2.durationMonths;
  const emiDifference = summary1.emi - summary2.emi;
  const totalInterestDifference = summary1.totalInterest - summary2.totalInterest;
  const totalPaymentDifference = summary1.totalPayment - summary2.totalPayment;
  
  // Calculate interest to principal ratio
  const ratio1 = (summary1.totalInterest / loan1.principal) * 100;
  const ratio2 = (summary2.totalInterest / loan2.principal) * 100;
  const interestToPrincipalRatioDifference = ratio1 - ratio2;
  
  return {
    principalDifference,
    interestRateDifference,
    durationDifference,
    emiDifference,
    totalInterestDifference,
    totalPaymentDifference,
    interestToPrincipalRatioDifference
  };
};

// Interface to match the return type
interface ComparisonResult {
  principalDifference: number;
  interestRateDifference: number;
  durationDifference: number;
  emiDifference: number;
  totalInterestDifference: number;
  totalPaymentDifference: number;
  interestToPrincipalRatioDifference: number;
}
