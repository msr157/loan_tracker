import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loan } from '@shared/schema';
import { useChat } from '@/hooks/useChat';
import { Brain, Loader2, Bot } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans: Loan[];
}

type MessageType = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AIChatModal({ isOpen, onClose, loans }: AIChatModalProps) {
  const [messages, setMessages] = useState<MessageType[]>([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m your AI loan assistant. I can help you analyze your loans or answer any finance-related questions. What would you like to know?' 
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { generateResponse, isLoading, isModelLoading, loadingProgress } = useChat();

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    
    // Add user message
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // Generate AI response
      const loanContext = loans.length > 0 
        ? `The user has ${loans.length} loan(s): ${loans.map(loan => 
            `${loan.name} (${loan.type}) with principal ${loan.principal}, interest rate ${loan.interestRate}%, and duration ${loan.durationMonths} months`
          ).join('; ')}.` 
        : 'The user has no loans yet.';
        
      const response = await generateResponse(input, loanContext);
      
      // Add AI response
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error processing your request. Please try again.' 
      }]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Loan Assistant
          </DialogTitle>
          <DialogDescription>
            Chat with the AI about your loans or ask general finance questions
          </DialogDescription>
        </DialogHeader>
        
        {isModelLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <Bot className="h-16 w-16 text-primary mb-6" />
            <h3 className="text-lg font-medium mb-2">Preparing AI Assistant</h3>
            <div className="w-full max-w-xs mb-2">
              <Progress value={loadingProgress} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Setting up the AI assistant... ({Math.round(loadingProgress)}%)
            </p>
          </div>
        )}
        
        {!isModelLoading && (
          <>
            <div className="flex-1 overflow-y-auto border rounded-md p-4 mb-4 min-h-[30vh] max-h-[50vh]">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : ''}`}
                >
                  <div 
                    className={`inline-block px-4 py-2 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground'
                    } max-w-[80%]`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || input.trim() === ''}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}