import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoanCard from '@/components/LoanCard';
import { Loan, LoanType, loanTypes } from '@shared/schema';
import { LoanSummary } from '@/types';

interface LoanManagementProps {
  loans: Loan[];
  getLoanSummary: (loan: Loan) => LoanSummary;
  onViewDetails: (loan: Loan) => void;
  onDeleteLoan: (id: string) => void;
  onEditLoan: (loan: Loan) => void;
  selectedLoans: string[];
  onToggleSelection: (id: string) => void;
}

export default function LoanManagement({
  loans,
  getLoanSummary,
  onViewDetails,
  onDeleteLoan,
  onEditLoan,
  selectedLoans,
  onToggleSelection
}: LoanManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All Types');

  // Filter loans based on search query and type filter
  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All Types' || loan.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Your Loans</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search loans..."
              className="pl-8 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="ri-search-line absolute left-2.5 top-2.5 text-gray-400"></i>
          </div>
          <Select 
            value={filterType} 
            onValueChange={setFilterType}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Types">All Types</SelectItem>
              {Object.values(loanTypes.enum).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loan Card Grid */}
      {filteredLoans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map(loan => (
            <LoanCard
              key={loan.id}
              loan={loan}
              loanSummary={getLoanSummary(loan)}
              onViewDetails={() => onViewDetails(loan)}
              onEdit={() => onEditLoan(loan)}
              onDelete={() => onDeleteLoan(loan.id)}
              isSelected={selectedLoans.includes(loan.id)}
              onToggleSelection={() => onToggleSelection(loan.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <div className="text-gray-500 mb-4">
            <i className="ri-file-list-3-line text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium mb-2">No loans found</h3>
          <p className="text-gray-500 mb-4">
            {loans.length === 0 
              ? "You haven't added any loans yet. Click 'Add Loan' to get started."
              : "No loans match your search criteria. Try adjusting your filters."}
          </p>
        </div>
      )}
    </section>
  );
}
