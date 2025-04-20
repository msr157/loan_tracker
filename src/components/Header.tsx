import { MessageSquare, Wallet } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Button } from './ui/button';

interface HeaderProps {
  onAddLoan: () => void;
  onCompareLoans: () => void;
  onOpenAIChat: () => void;
}

export default function Header({ onAddLoan, onCompareLoans, onOpenAIChat }: HeaderProps) {
  return (
    <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Loan Tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={onAddLoan}
            variant="default"
            className="flex items-center gap-1"
            size="sm"
          >
            <i className="ri-add-line"></i>
            <span className="hidden sm:inline">Add Loan</span>
          </Button>
          <Button 
            onClick={onCompareLoans}
            variant="secondary"
            className="flex items-center gap-1"
            size="sm"
          >
            <i className="ri-scales-3-line"></i>
            <span className="hidden sm:inline">Compare</span>
          </Button>
          <Button
            onClick={onOpenAIChat}
            variant="outline"
            className="flex items-center gap-1"
            size="sm"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AI Chat</span>
          </Button>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
