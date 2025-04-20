import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  formatCurrency,
  formatPercentage,
  formatDuration,
  formatProgress
} from '@/utils/formatters';
import { Loan } from '@shared/schema';
import { LoanSummary } from '@/types';

interface LoanCardProps {
  loan: Loan;
  loanSummary: LoanSummary;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onToggleSelection: () => void;
}

export default function LoanCard({
  loan,
  loanSummary,
  onViewDetails,
  onEdit,
  onDelete,
  isSelected,
  onToggleSelection
}: LoanCardProps) {
  // Get the icon for loan type
  const getLoanTypeIcon = (type: string) => {
    switch (type) {
      case 'Home Loan':
        return 'ri-home-4-line';
      case 'Car Loan':
        return 'ri-car-line';
      case 'Personal Loan':
        return 'ri-money-dollar-box-line';
      case 'Education Loan':
        return 'ri-book-open-line';
      case 'Business Loan':
        return 'ri-briefcase-line';
      default:
        return 'ri-money-dollar-box-line';
    }
  };
  
  // Determine border color based on loan type
  const getBorderColor = (type: string) => {
    switch (type) {
      case 'Home Loan':
        return 'border-primary';
      case 'Car Loan':
        return 'border-success-500';
      case 'Personal Loan':
        return 'border-secondary';
      case 'Education Loan':
        return 'border-amber-500';
      case 'Business Loan':
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };
  
  // Determine progress bar color based on loan type
  const getProgressColor = (type: string) => {
    switch (type) {
      case 'Home Loan':
        return 'bg-primary';
      case 'Car Loan':
        return 'bg-success-500';
      case 'Personal Loan':
        return 'bg-secondary';
      case 'Education Loan':
        return 'bg-amber-500';
      case 'Business Loan':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <Card 
      className={`card-shadow overflow-hidden border-t-4 ${getBorderColor(loan.type)}`}
      data-loan-id={loan.id}
      data-selected={isSelected}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg">{loan.name}</h3>
            <p className="text-gray-500 text-sm flex items-center gap-1">
              <i className={getLoanTypeIcon(loan.type)}></i> 
              <span>{loan.type}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onEdit}
              className="text-gray-500 hover:text-primary transition"
            >
              <i className="ri-edit-line text-lg"></i>
            </button>
            <button 
              onClick={onDelete}
              className="text-gray-500 hover:text-destructive transition"
            >
              <i className="ri-delete-bin-line text-lg"></i>
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Principal Amount</span>
            <span className="font-medium font-mono">{formatCurrency(loan.principal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Interest Rate</span>
            <span className="font-medium font-mono">{formatPercentage(loan.interestRate)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Duration</span>
            <span className="font-medium font-mono">{formatDuration(loan.durationMonths)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">EMI</span>
            <span className="font-medium font-mono">{formatCurrency(loanSummary.emi)}</span>
          </div>
          <div className="flex justify-between items-center font-medium">
            <span className="text-gray-700">Total Interest</span>
            <span className="font-mono text-destructive">
              {formatCurrency(loanSummary.totalInterest)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Loan Progress</span>
            <span className="text-xs text-gray-500 font-mono">
              {formatProgress(loanSummary.progress)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${getProgressColor(loan.type)} h-2 rounded-full`} 
              style={{ width: `${loanSummary.progress}%` }}
            ></div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 py-3 bg-gray-50 flex justify-between">
        <button 
          onClick={onViewDetails}
          className="text-gray-600 hover:text-primary text-sm font-medium flex items-center gap-1 transition"
        >
          <i className="ri-bar-chart-line"></i>
          View Details
        </button>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">Compare</span>
          <Switch
            checked={isSelected}
            onCheckedChange={onToggleSelection}
          />
        </div>
      </CardFooter>
    </Card>
  );
}
