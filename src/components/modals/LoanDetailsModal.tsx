import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage, formatDuration } from '@/utils/formatters';
import { Loan } from '@shared/schema';
import { AmortizationEntry, LoanSummary } from '@/types';
import Chart from 'chart.js/auto';

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  getLoanSummary: (loan: Loan) => LoanSummary;
  getAmortizationSchedule: (loan: Loan) => AmortizationEntry[];
}

export default function LoanDetailsModal({
  isOpen,
  onClose,
  loan,
  getLoanSummary,
  getAmortizationSchedule
}: LoanDetailsModalProps) {
  // Track active tab
  const [activeTab, setActiveTab] = useState<'amortization' | 'schedule' | 'extra'>('amortization');
  
  // Chart refs
  const amortizationDetailChartRef = useRef<HTMLCanvasElement | null>(null);
  const interestPrincipalChartRef = useRef<HTMLCanvasElement | null>(null);
  
  // Chart instances for cleanup
  const amortizationDetailChartInstance = useRef<Chart | null>(null);
  const interestPrincipalChartInstance = useRef<Chart | null>(null);
  
  // Get loan summary and amortization schedule
  const loanSummary = getLoanSummary(loan);
  const amortizationSchedule = getAmortizationSchedule(loan);
  
  // Initialize charts when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCharts();
    }
    
    // Cleanup charts on unmount
    return () => {
      if (amortizationDetailChartInstance.current) {
        amortizationDetailChartInstance.current.destroy();
      }
      if (interestPrincipalChartInstance.current) {
        interestPrincipalChartInstance.current.destroy();
      }
    };
  }, [isOpen, loan]);
  
  // Initialize the charts
  const initializeCharts = () => {
    // Amortization detail chart
    if (amortizationDetailChartRef.current) {
      // Cleanup previous chart
      if (amortizationDetailChartInstance.current) {
        amortizationDetailChartInstance.current.destroy();
      }
      
      // Create data points for amortization chart
      const labels: string[] = [];
      const dataPoints: number[] = [];
      
      // Sample points from the amortization schedule
      const step = Math.max(1, Math.floor(amortizationSchedule.length / 10));
      for (let i = 0; i < amortizationSchedule.length; i += step) {
        const entry = amortizationSchedule[i];
        labels.push(`${Math.floor(entry.month / 12)}y${entry.month % 12 > 0 ? ` ${entry.month % 12}m` : ''}`);
        dataPoints.push(entry.balance);
      }
      
      // Add the final point
      if (amortizationSchedule.length > 0) {
        const lastEntry = amortizationSchedule[amortizationSchedule.length - 1];
        labels.push(`${Math.floor(lastEntry.month / 12)}y${lastEntry.month % 12 > 0 ? ` ${lastEntry.month % 12}m` : ''}`);
        dataPoints.push(0);
      }
      
      const ctx = amortizationDetailChartRef.current.getContext('2d');
      if (ctx) {
        amortizationDetailChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Loan Balance',
              data: dataPoints,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
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
    if (interestPrincipalChartRef.current) {
      // Cleanup previous chart
      if (interestPrincipalChartInstance.current) {
        interestPrincipalChartInstance.current.destroy();
      }
      
      // Create data for the chart - group by year
      const years = Math.ceil(loan.durationMonths / 12);
      const principalByYear: number[] = Array(years).fill(0);
      const interestByYear: number[] = Array(years).fill(0);
      const labels = Array(years).fill(0).map((_, i) => `Year ${i + 1}`);
      
      // Sum up principal and interest by year
      amortizationSchedule.forEach(entry => {
        const yearIndex = Math.floor((entry.month - 1) / 12);
        if (yearIndex < years) {
          principalByYear[yearIndex] += entry.principal;
          interestByYear[yearIndex] += entry.interest;
        }
      });
      
      const ctx = interestPrincipalChartRef.current.getContext('2d');
      if (ctx) {
        interestPrincipalChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Principal Payment',
                data: principalByYear,
                backgroundColor: 'rgba(37, 99, 235, 0.7)'
              },
              {
                label: 'Interest Payment',
                data: interestByYear,
                backgroundColor: 'rgba(239, 68, 68, 0.7)'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                stacked: true,
              },
              y: {
                stacked: true,
                beginAtZero: true
              }
            }
          }
        });
      }
    }
  };
  
  // Handle CSV download of amortization schedule
  const downloadAmortizationCSV = () => {
    // Create CSV content
    let csvContent = "Month,Payment,Principal,Interest,Balance\n";
    
    amortizationSchedule.forEach(entry => {
      csvContent += `${entry.month},${entry.payment},${entry.principal},${entry.interest},${entry.balance}\n`;
    });
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${loan.name.replace(/\s+/g, '_')}_amortization.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loan.name} Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm text-gray-500 font-medium mb-1">Principal Amount</h3>
            <p className="text-2xl font-semibold font-mono">{formatCurrency(loan.principal)}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm text-gray-500 font-medium mb-1">Interest Rate</h3>
            <p className="text-2xl font-semibold font-mono">{formatPercentage(loan.interestRate)}</p>
          </div>
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm text-gray-500 font-medium mb-1">Loan Term</h3>
            <p className="text-2xl font-semibold font-mono">{formatDuration(loan.durationMonths)}</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mb-6">
          <ul className="flex border-b border-gray-200 mb-4">
            <li className="mr-1">
              <button 
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'amortization' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('amortization')}
              >
                Amortization
              </button>
            </li>
            <li className="mr-1">
              <button 
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'schedule' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('schedule')}
              >
                Payment Schedule
              </button>
            </li>
            <li className="mr-1">
              <button 
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'extra' 
                    ? 'border-b-2 border-primary text-primary' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('extra')}
              >
                Extra Payments
              </button>
            </li>
          </ul>

          {/* Tab content */}
          {activeTab === 'amortization' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Amortization Chart</h4>
                  <div className="h-64 bg-gray-50 p-3 rounded-md">
                    <canvas ref={amortizationDetailChartRef} id="amortizationDetailChart"></canvas>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Interest vs Principal Payments</h4>
                  <div className="h-64 bg-gray-50 p-3 rounded-md">
                    <canvas ref={interestPrincipalChartRef} id="interestPrincipalChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'schedule' && (
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center justify-between">
                <span>Amortization Schedule</span>
                <div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-primary" 
                    onClick={downloadAmortizationCSV}
                  >
                    <i className="ri-download-line mr-1"></i> Download CSV
                  </Button>
                </div>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                      <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                      <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 font-mono text-sm">
                    {amortizationSchedule.slice(0, 5).map(entry => (
                      <tr key={`month-${entry.month}`}>
                        <td className="py-2">{entry.month}</td>
                        <td className="py-2">{formatCurrency(entry.payment)}</td>
                        <td className="py-2">{formatCurrency(entry.principal)}</td>
                        <td className="py-2">{formatCurrency(entry.interest)}</td>
                        <td className="py-2">{formatCurrency(entry.balance)}</td>
                      </tr>
                    ))}
                    {amortizationSchedule.length > 10 && (
                      <tr>
                        <td className="py-2 text-gray-500" colSpan={5}>
                          <div className="text-center">... {amortizationSchedule.length - 10} more entries</div>
                        </td>
                      </tr>
                    )}
                    {amortizationSchedule.slice(-5).map(entry => (
                      <tr key={`month-${entry.month}`}>
                        <td className="py-2">{entry.month}</td>
                        <td className="py-2">{formatCurrency(entry.payment)}</td>
                        <td className="py-2">{formatCurrency(entry.principal)}</td>
                        <td className="py-2">{formatCurrency(entry.interest)}</td>
                        <td className="py-2">{formatCurrency(entry.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'extra' && (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
              <div className="text-gray-500 mb-4">
                <i className="ri-money-dollar-circle-line text-4xl"></i>
              </div>
              <h3 className="text-lg font-medium mb-2">Extra Payments Calculator</h3>
              <p className="text-gray-500 mb-4">
                Coming soon! This feature will allow you to calculate the impact of making extra payments on your loan.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
