import { useState, useEffect, useMemo } from 'react';
import { Loan } from '@shared/schema';
import { 
  getLoanSummary as calculateLoanSummary, 
  generateAmortizationSchedule
} from '@/utils/loanCalculator';
import { LoanSummary, AmortizationEntry } from '@/types';

// Local storage key
const LOANS_STORAGE_KEY = 'loan-tracker-loans';
const SELECTED_LOANS_KEY = 'loan-tracker-selected-loans';

/**
 * Custom hook to manage loan data with localStorage persistence
 */
export const useLoans = () => {
  // Load loans from localStorage
  const [loans, setLoans] = useState<Loan[]>(() => {
    const storedLoans = localStorage.getItem(LOANS_STORAGE_KEY);
    return storedLoans ? JSON.parse(storedLoans) : [];
  });

  // Load selected loans from localStorage
  const [selectedLoans, setSelectedLoans] = useState<string[]>(() => {
    const storedSelected = localStorage.getItem(SELECTED_LOANS_KEY);
    return storedSelected ? JSON.parse(storedSelected) : [];
  });

  // Update localStorage when loans change
  useEffect(() => {
    localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
  }, [loans]);

  // Update localStorage when selected loans change
  useEffect(() => {
    localStorage.setItem(SELECTED_LOANS_KEY, JSON.stringify(selectedLoans));
  }, [selectedLoans]);

  // Add a new loan
  const addLoan = (loanData: Omit<Loan, "id" | "createdAt" | "updatedAt">) => {
    const newLoan: Loan = {
      ...loanData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setLoans(prevLoans => [...prevLoans, newLoan]);
    return newLoan;
  };

  // Update an existing loan
  const updateLoan = (updatedLoan: Loan) => {
    setLoans(prevLoans => 
      prevLoans.map(loan => 
        loan.id === updatedLoan.id 
          ? { ...updatedLoan, updatedAt: new Date().toISOString() } 
          : loan
      )
    );
  };

  // Delete a loan
  const deleteLoan = (id: string) => {
    setLoans(prevLoans => prevLoans.filter(loan => loan.id !== id));
    
    // Also remove from selected loans if present
    if (selectedLoans.includes(id)) {
      setSelectedLoans(prev => prev.filter(loanId => loanId !== id));
    }
  };

  // Toggle loan selection for comparison
  const toggleLoanSelection = (id: string) => {
    setSelectedLoans(prev => {
      if (prev.includes(id)) {
        return prev.filter(loanId => loanId !== id);
      } else {
        // Limit to max 3 selections
        const newSelection = [...prev, id];
        if (newSelection.length > 3) {
          newSelection.shift(); // Remove the oldest selection
        }
        return newSelection;
      }
    });
  };

  // Clear all loan selections
  const clearLoanSelection = () => {
    setSelectedLoans([]);
  };

  // Get loan summary with calculated metrics
  const getLoanSummary = (loan: Loan): LoanSummary => {
    return calculateLoanSummary(loan);
  };

  // Get amortization schedule for a loan
  const getAmortizationSchedule = (loan: Loan): AmortizationEntry[] => {
    return generateAmortizationSchedule(
      loan.principal,
      loan.interestRate,
      loan.durationMonths,
      loan.stepUpConfig
    );
  };

  // Calculate and memoize aggregate statistics
  const statistics = useMemo(() => {
    const totalLoans = loans.length;
    
    const totalOutstanding = loans.reduce((sum, loan) => {
      const summary = getLoanSummary(loan);
      const progressFraction = summary.progress / 100;
      const remainingBalance = summary.totalPayment * (1 - progressFraction);
      return sum + remainingBalance;
    }, 0);
    
    const monthlyPayments = loans.reduce((sum, loan) => {
      const summary = getLoanSummary(loan);
      return sum + summary.emi;
    }, 0);
    
    return {
      totalLoans,
      totalOutstanding,
      monthlyPayments
    };
  }, [loans]);

  return {
    loans,
    addLoan,
    updateLoan,
    deleteLoan,
    getLoanSummary,
    getAmortizationSchedule,
    selectedLoans,
    toggleLoanSelection,
    clearLoanSelection,
    statistics
  };
};

export default useLoans;
