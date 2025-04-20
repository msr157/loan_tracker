import { useState } from 'react';
import Header from '@/components/Header';
import DashboardOverview from '@/components/DashboardOverview';
import LoanManagement from '@/components/LoanManagement';
import AddLoanModal from '@/components/modals/AddLoanModal';
import LoanComparisonModal from '@/components/modals/LoanComparisonModal';
import LoanDetailsModal from '@/components/modals/LoanDetailsModal';
import AIChatModal from '@/components/modals/AIChatModal';
import useLoans from '@/hooks/useLoans';
import { Loan } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  // Modal states
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);
  
  // Use our custom hooks
  const { 
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
  } = useLoans();
  
  const { toast } = useToast();

  // Modal handlers
  const handleOpenAddLoanModal = () => setIsAddLoanModalOpen(true);
  const handleCloseAddLoanModal = () => setIsAddLoanModalOpen(false);
  
  const handleOpenComparisonModal = () => {
    if (selectedLoans.length >= 2) {
      setIsComparisonModalOpen(true);
    } else {
      toast({
        title: "Select at least 2 loans",
        description: "Please select at least 2 loans to compare them.",
        variant: "destructive",
      });
    }
  };
  const handleCloseComparisonModal = () => setIsComparisonModalOpen(false);
  
  const handleOpenAIChat = () => setIsAIChatModalOpen(true);
  const handleCloseAIChat = () => setIsAIChatModalOpen(false);
  
  const handleViewLoanDetails = (loan: Loan) => {
    setSelectedLoanForDetails(loan);
    setIsDetailsModalOpen(true);
  };
  const handleCloseLoanDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedLoanForDetails(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        onAddLoan={handleOpenAddLoanModal} 
        onCompareLoans={handleOpenComparisonModal}
        onOpenAIChat={handleOpenAIChat}
      />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <DashboardOverview 
          loans={loans} 
          statistics={statistics}
          getLoanSummary={getLoanSummary}
        />
        
        <LoanManagement 
          loans={loans}
          getLoanSummary={getLoanSummary}
          onViewDetails={handleViewLoanDetails}
          onDeleteLoan={deleteLoan}
          onEditLoan={(loan) => {
            setSelectedLoanForDetails(loan);
            setIsAddLoanModalOpen(true);
          }}
          selectedLoans={selectedLoans}
          onToggleSelection={toggleLoanSelection}
        />
      </main>
      
      {/* Modals */}
      <AddLoanModal 
        isOpen={isAddLoanModalOpen}
        onClose={handleCloseAddLoanModal}
        onAddLoan={addLoan}
        editLoan={selectedLoanForDetails}
        onUpdateLoan={updateLoan}
      />
      
      <LoanComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={handleCloseComparisonModal}
        selectedLoanIds={selectedLoans}
        loans={loans}
        getLoanSummary={getLoanSummary}
        onRemoveLoan={(id) => toggleLoanSelection(id)}
      />
      
      {selectedLoanForDetails && (
        <LoanDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseLoanDetailsModal}
          loan={selectedLoanForDetails}
          getLoanSummary={getLoanSummary}
          getAmortizationSchedule={getAmortizationSchedule}
        />
      )}
      
      <AIChatModal
        isOpen={isAIChatModalOpen}
        onClose={handleCloseAIChat}
        loans={loans}
      />
    </div>
  );
}
