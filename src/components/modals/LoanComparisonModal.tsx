import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDuration, formatPercentage } from '@/utils/formatters';
import { compareLoanDetails } from '@/utils/loanCalculator';
import { Loan } from '@shared/schema';
import { LoanSummary } from '@/types';
import Chart from 'chart.js/auto';

interface LoanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLoanIds: string[];
  loans: Loan[];
  getLoanSummary: (loan: Loan) => LoanSummary;
  onRemoveLoan: (id: string) => void;
}

export default function LoanComparisonModal({
  isOpen,
  onClose,
  selectedLoanIds,
  loans,
  getLoanSummary,
  onRemoveLoan
}: LoanComparisonModalProps) {
  // Chart refs
  const paymentComparisonChartRef = useRef<HTMLCanvasElement | null>(null);
  const interestComparisonChartRef = useRef<HTMLCanvasElement | null>(null);
  
  // Chart instances for cleanup
  const paymentComparisonChartInstance = useRef<Chart | null>(null);
  const interestComparisonChartInstance = useRef<Chart | null>(null);

  // Get selected loans based on IDs
  const selectedLoans = loans.filter(loan => selectedLoanIds.includes(loan.id));
  
  // Initialize comparison charts when modal opens and selected loans change
  useEffect(() => {
    if (isOpen && selectedLoans.length >= 2) {
      initializeComparisonCharts();
    }
    
    // Cleanup charts on unmount
    return () => {
      if (paymentComparisonChartInstance.current) {
        paymentComparisonChartInstance.current.destroy();
      }
      if (interestComparisonChartInstance.current) {
        interestComparisonChartInstance.current.destroy();
      }
    };
  }, [isOpen, selectedLoans]);
  
  // Initialize the comparison charts
  const initializeComparisonCharts = () => {
    if (selectedLoans.length < 2) return;
    
    // Prepare data for the charts
    const labels = selectedLoans.map(loan => loan.name);
    const loanSummaries = selectedLoans.map(loan => getLoanSummary(loan));
    
    // Monthly payment comparison chart
    if (paymentComparisonChartRef.current) {
      // Cleanup previous chart
      if (paymentComparisonChartInstance.current) {
        paymentComparisonChartInstance.current.destroy();
      }
      
      const ctx = paymentComparisonChartRef.current.getContext('2d');
      if (ctx) {
        paymentComparisonChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Monthly Payment', 'Total Interest'],
            datasets: selectedLoans.map((loan, index) => {
              const summary = getLoanSummary(loan);
              const colors = [
                'rgba(37, 99, 235, 0.7)',
                'rgba(34, 197, 94, 0.7)',
                'rgba(79, 70, 229, 0.7)'
              ];
              
              return {
                label: loan.name,
                data: [summary.emi, summary.totalInterest],
                backgroundColor: colors[index % colors.length]
              };
            })
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    }
    
    // Interest vs Principal chart
    if (interestComparisonChartRef.current) {
      // Cleanup previous chart
      if (interestComparisonChartInstance.current) {
        interestComparisonChartInstance.current.destroy();
      }
      
      const ctx = interestComparisonChartRef.current.getContext('2d');
      if (ctx) {
        interestComparisonChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Principal',
                data: selectedLoans.map(loan => loan.principal),
                backgroundColor: 'rgba(37, 99, 235, 0.7)'
              },
              {
                label: 'Interest',
                data: loanSummaries.map(summary => summary.totalInterest),
                backgroundColor: 'rgba(239, 68, 68, 0.7)'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                stacked: false,
              },
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    }
  };
  
  // Calculate comparison metrics if we have at least 2 loans
  const comparisonMetrics = selectedLoans.length >= 2 
    ? compareLoanDetails(selectedLoans[0], selectedLoans[1])
    : null;
  
  // Formatting comparison metrics with proper labels
  const formatComparisonMetric = (value: number, type: string): JSX.Element => {
    let formattedValue = '';
    let colorClass = '';
    
    switch (type) {
      case 'principal':
      case 'emi':
      case 'totalInterest':
      case 'totalPayment':
        formattedValue = formatCurrency(Math.abs(value));
        colorClass = value > 0 ? 'text-gray-500' : 'text-success-500';
        return <span className={colorClass}>{formattedValue} {value > 0 ? 'higher' : 'lower'}</span>;
        
      case 'interestRate':
      case 'interestToPrincipalRatio':
        formattedValue = formatPercentage(Math.abs(value));
        colorClass = value > 0 ? 'text-danger-500' : 'text-success-500';
        return <span className={colorClass}>{formattedValue} {value > 0 ? 'higher' : 'lower'}</span>;
        
      case 'duration':
        formattedValue = formatDuration(Math.abs(value));
        colorClass = 'text-gray-500';
        return <span className={colorClass}>{formattedValue} {value > 0 ? 'longer' : 'shorter'}</span>;
        
      default:
        return <span className="text-gray-500">{value}</span>;
    }
  };
  
  if (selectedLoans.length < 2) {
    return null; // Don't render if not enough loans selected
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loan Comparison</DialogTitle>
        </DialogHeader>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Selected Loans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedLoans.map((loan, index) => (
              <div key={loan.id} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{loan.name}</h4>
                    <p className="text-gray-500 text-sm">{loan.type}</p>
                  </div>
                  {index === 0 ? (
                    <span className="bg-primary-50 text-primary-800 text-xs font-medium px-2 py-1 rounded">Primary</span>
                  ) : (
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => onRemoveLoan(loan.id)}
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {comparisonMetrics && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">Comparison Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider w-1/4">Metrics</th>
                      {selectedLoans.map(loan => (
                        <th key={loan.id} className="py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          {loan.name}
                        </th>
                      ))}
                      <th className="py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 font-mono">
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Principal Amount</td>
                      {selectedLoans.map(loan => (
                        <td key={loan.id} className="py-4 text-sm text-gray-500">
                          {formatCurrency(loan.principal)}
                        </td>
                      ))}
                      <td className="py-4 text-sm text-gray-500">
                        {formatComparisonMetric(comparisonMetrics.principalDifference, 'principal')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Interest Rate</td>
                      {selectedLoans.map(loan => (
                        <td key={loan.id} className="py-4 text-sm text-gray-500">
                          {formatPercentage(loan.interestRate)}
                        </td>
                      ))}
                      <td className="py-4 text-sm">
                        {formatComparisonMetric(comparisonMetrics.interestRateDifference, 'interestRate')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Loan Term</td>
                      {selectedLoans.map(loan => (
                        <td key={loan.id} className="py-4 text-sm text-gray-500">
                          {formatDuration(loan.durationMonths)}
                        </td>
                      ))}
                      <td className="py-4 text-sm">
                        {formatComparisonMetric(comparisonMetrics.durationDifference, 'duration')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Monthly EMI</td>
                      {selectedLoans.map(loan => (
                        <td key={loan.id} className="py-4 text-sm text-gray-500">
                          {formatCurrency(getLoanSummary(loan).emi)}
                        </td>
                      ))}
                      <td className="py-4 text-sm">
                        {formatComparisonMetric(comparisonMetrics.emiDifference, 'emi')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Total Interest</td>
                      {selectedLoans.map(loan => (
                        <td key={loan.id} className="py-4 text-sm text-gray-500">
                          {formatCurrency(getLoanSummary(loan).totalInterest)}
                        </td>
                      ))}
                      <td className="py-4 text-sm">
                        {formatComparisonMetric(comparisonMetrics.totalInterestDifference, 'totalInterest')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Total Payment</td>
                      {selectedLoans.map(loan => (
                        <td key={loan.id} className="py-4 text-sm text-gray-500">
                          {formatCurrency(getLoanSummary(loan).totalPayment)}
                        </td>
                      ))}
                      <td className="py-4 text-sm">
                        {formatComparisonMetric(comparisonMetrics.totalPaymentDifference, 'totalPayment')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 text-sm font-medium text-gray-900">Interest to Principal Ratio</td>
                      {selectedLoans.map(loan => {
                        const summary = getLoanSummary(loan);
                        const ratio = (summary.totalInterest / loan.principal) * 100;
                        return (
                          <td key={loan.id} className="py-4 text-sm text-gray-500">
                            {formatPercentage(ratio, 1)}
                          </td>
                        );
                      })}
                      <td className="py-4 text-sm">
                        {formatComparisonMetric(comparisonMetrics.interestToPrincipalRatioDifference, 'interestToPrincipalRatio')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Visualization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Payment Comparison</h4>
                  <div className="h-64 bg-gray-50 p-3 rounded-md">
                    <canvas ref={paymentComparisonChartRef} id="paymentComparisonChart"></canvas>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Total Interest vs Principal</h4>
                  <div className="h-64 bg-gray-50 p-3 rounded-md">
                    <canvas ref={interestComparisonChartRef} id="interestComparisonChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
