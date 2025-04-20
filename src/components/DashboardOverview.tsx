import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { Loan } from '@shared/schema';
import { LoanSummary } from '@/types';
import Chart from 'chart.js/auto';

interface DashboardOverviewProps {
  loans: Loan[];
  statistics: {
    totalLoans: number;
    totalOutstanding: number;
    monthlyPayments: number;
  };
  getLoanSummary: (loan: Loan) => LoanSummary;
}

export default function DashboardOverview({ 
  loans, 
  statistics,
  getLoanSummary 
}: DashboardOverviewProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Initialize and update chart when loan data changes
  useEffect(() => {
    if (chartRef.current && loans.length > 0) {
      // Cleanup previous chart instance
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Prepare data for the chart
      const chartLabels = loans.map(loan => loan.name);
      const chartData = loans.map(loan => loan.principal);
      const backgroundColors = [
        'rgba(37, 99, 235, 0.7)',
        'rgba(34, 197, 94, 0.7)',
        'rgba(79, 70, 229, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(245, 158, 11, 0.7)'
      ];

      // Create a new chart
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: chartLabels,
            datasets: [{
              data: chartData,
              backgroundColor: backgroundColors.slice(0, loans.length),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
              }
            }
          }
        });
      }
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [loans]);

  // Calculate the new loan amount in this month
  const newLoansThisMonth = loans.filter(loan => {
    const startDate = new Date(loan.startDate);
    const now = new Date();
    return startDate.getMonth() === now.getMonth() && 
           startDate.getFullYear() === now.getFullYear();
  }).length;

  // Calculate the increase in monthly payments with new loans
  const newLoansMonthlyPayment = newLoansThisMonth > 0 
    ? loans
        .filter(loan => {
          const startDate = new Date(loan.startDate);
          const now = new Date();
          return startDate.getMonth() === now.getMonth() && 
                 startDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, loan) => sum + getLoanSummary(loan).emi, 0)
    : 0;

  return (
    <section className="mb-8">
      <Card className="card-shadow">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:border-r md:border-gray-200 md:pr-6">
              <h2 className="text-sm text-gray-500 font-medium mb-1">Total Loans</h2>
              <p className="text-3xl font-semibold font-mono">{statistics.totalLoans}</p>
              <div className="mt-2 flex items-center text-sm">
                {newLoansThisMonth > 0 ? (
                  <span className="text-success-500 flex items-center">
                    <i className="ri-arrow-right-up-line mr-1"></i> 
                    {newLoansThisMonth} new this month
                  </span>
                ) : (
                  <span className="text-gray-500">No new loans this month</span>
                )}
              </div>
            </div>

            <div className="md:border-r md:border-gray-200 md:pr-6">
              <h2 className="text-sm text-gray-500 font-medium mb-1">Total Outstanding</h2>
              <p className="text-3xl font-semibold font-mono">
                {formatCurrency(statistics.totalOutstanding)}
              </p>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">Across all loans</span>
              </div>
            </div>

            <div>
              <h2 className="text-sm text-gray-500 font-medium mb-1">Monthly Payments</h2>
              <p className="text-3xl font-semibold font-mono">
                {formatCurrency(statistics.monthlyPayments)}
              </p>
              <div className="mt-2 flex items-center text-sm">
                {newLoansMonthlyPayment > 0 ? (
                  <span className="text-danger-500 flex items-center">
                    <i className="ri-arrow-right-up-line mr-1"></i> 
                    {formatCurrency(newLoansMonthlyPayment)} increase with new loan
                  </span>
                ) : (
                  <span className="text-gray-500">No change in monthly payments</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm text-gray-500 font-medium mb-4">Loan Distribution</h3>
            <div className="h-64">
              {loans.length > 0 ? (
                <canvas ref={chartRef} id="loanDistributionChart"></canvas>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-gray-500">Add loans to see distribution</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
