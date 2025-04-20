import { useState, useEffect } from 'react';
import { Loan } from '@shared/schema';
import { getLoanSummary } from '@/utils/loanCalculator';

// Simulated responses for loan-related questions
const simulatedResponses = {
  greetings: [
    "Hello! I'm your AI loan assistant. How can I help you today?",
    "Hi there! Ready to help with your loan questions.",
    "Welcome! I'm here to assist with your loan management needs."
  ],
  
  loanInfo: (loans: Loan[]) => {
    if (loans.length === 0) return "You don't have any loans added yet. Would you like to know how to add a loan?";
    
    const loansInfo = loans.map(loan => {
      const summary = getLoanSummary(loan);
      return `${loan.name} (${loan.type}): Principal ${formatCurrency(loan.principal)}, Interest rate ${loan.interestRate}%, Duration ${loan.durationMonths} months, EMI ${formatCurrency(summary.emi)}.`;
    }).join('\n\n');
    
    return `Here's information about your loans:\n\n${loansInfo}`;
  },
  
  bestRate: (loans: Loan[]) => {
    if (loans.length === 0) return "You don't have any loans to compare rates.";
    
    const lowestRateLoan = [...loans].sort((a, b) => a.interestRate - b.interestRate)[0];
    return `The loan with the lowest interest rate is "${lowestRateLoan.name}" with a rate of ${lowestRateLoan.interestRate}%.`;
  },
  
  highestPayment: (loans: Loan[]) => {
    if (loans.length === 0) return "You don't have any loans to analyze payments.";
    
    const loanSummaries = loans.map(loan => ({
      loan,
      summary: getLoanSummary(loan)
    }));
    
    const highestEmiLoan = [...loanSummaries].sort((a, b) => b.summary.emi - a.summary.emi)[0];
    return `The loan with the highest monthly payment (EMI) is "${highestEmiLoan.loan.name}" with an EMI of ${formatCurrency(highestEmiLoan.summary.emi)}.`;
  },
  
  totalOutstanding: (loans: Loan[]) => {
    if (loans.length === 0) return "You don't have any loans to calculate total outstanding amount.";
    
    const totalOutstanding = loans.reduce((sum, loan) => {
      const summary = getLoanSummary(loan);
      const progressFraction = summary.progress / 100;
      const remainingBalance = summary.totalPayment * (1 - progressFraction);
      return sum + remainingBalance;
    }, 0);
    
    return `Your total outstanding amount across all loans is ${formatCurrency(totalOutstanding)}.`;
  }
};

// Helper formatting function
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function useChat() {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate model loading
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setLoadingProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsModelLoading(false);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Function to generate a response
  const generateResponse = async (
    userMessage: string,
    context: string = ''
  ): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Parse the context string to get loan data if available
      let loans: Loan[] = [];
      try {
        if (context.includes('loan')) {
          const match = context.match(/The user has (\d+) loan/);
          if (match && match[1] !== '0') {
            // Extract loan information from context
            const loanInfos = context.match(/[^;]+(?=;|$)/g) || [];
            if (loanInfos.length > 1) {
              // Simplified parsing - in a real implementation, this would be more robust
              loans = JSON.parse(localStorage.getItem('loan-tracker-loans') || '[]');
            }
          }
        }
      } catch (e) {
        console.error('Error parsing loan context:', e);
      }
      
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Process the user message and generate a response
      const message = userMessage.toLowerCase();
      
      if (message.includes('list') && message.includes('loan')) {
        return simulatedResponses.loanInfo(loans);
      } 
      else if (message.includes('lowest') && message.includes('rate')) {
        return simulatedResponses.bestRate(loans);
      }
      else if (message.includes('highest') && (message.includes('payment') || message.includes('emi'))) {
        return simulatedResponses.highestPayment(loans);
      }
      else if (message.includes('total') && message.includes('outstanding')) {
        return simulatedResponses.totalOutstanding(loans);
      }
      else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        return simulatedResponses.greetings[Math.floor(Math.random() * simulatedResponses.greetings.length)];
      }
      else {
        // Default fallback response
        return "I'm here to help with your loan-related questions. You can ask me about your loans, compare rates, calculate payments, or get advice on loan management. What would you like to know?";
      }
    } catch (err) {
      console.error('Error generating response:', err);
      setError('Failed to generate a response. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateResponse,
    isModelLoading,
    isLoading,
    loadingProgress,
    error,
  };
}