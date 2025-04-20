import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  formatCurrency,
} from '@/utils/formatters';
import { Loan, loanTypes, StepUpConfig, AdditionalCharge } from '@shared/schema';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertLoanSchema } from '@shared/schema';
import { z } from 'zod';
import { 
  calculateEMI, 
  calculateTotalInterest,
  generateStepUpPreview
} from '@/utils/loanCalculator';
import Chart from 'chart.js/auto';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLoan: (loan: Omit<Loan, "id" | "createdAt" | "updatedAt">) => void;
  editLoan?: Loan | null;
  onUpdateLoan?: (loan: Loan) => void;
}

// Extended schema with validation
const loanFormSchema = insertLoanSchema.extend({
  principalFormatted: z.string().optional(),
  durationValue: z.number().int().positive(),
  durationType: z.enum(["Years", "Months"]),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

export default function AddLoanModal({
  isOpen,
  onClose,
  onAddLoan,
  editLoan,
  onUpdateLoan
}: AddLoanModalProps) {
  // Chart refs
  const paymentBreakdownChartRef = useRef<HTMLCanvasElement | null>(null);
  const amortizationChartRef = useRef<HTMLCanvasElement | null>(null);
  const paymentBreakdownChartInstance = useRef<Chart | null>(null);
  const amortizationChartInstance = useRef<Chart | null>(null);
  
  // For advanced options
  const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = useState(false);
  const [stepUpConfig, setStepUpConfig] = useState<StepUpConfig>({
    enabled: false,
    frequency: "Yearly",
    increasePercentage: 5,
  });
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  
  // For step-up preview
  const [stepUpPreview, setStepUpPreview] = useState<any[]>([]);

  // For calculated results
  const [calculatedEMI, setCalculatedEMI] = useState<number>(0);
  const [calculatedTotalInterest, setCalculatedTotalInterest] = useState<number>(0);
  const [calculatedTotalPayment, setCalculatedTotalPayment] = useState<number>(0);
  
  // Set up form with validation
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      name: '',
      type: 'Home Loan',
      principal: 0,
      interestRate: 0,
      durationValue: 0,
      durationType: 'Years',
      durationMonths: 0,
      startDate: new Date().toISOString().split('T')[0]
    }
  });
  
  // Watch form values to calculate EMI and other metrics
  const principal = watch('principal');
  const interestRate = watch('interestRate');
  const durationValue = watch('durationValue');
  const durationType = watch('durationType');
  
  // Calculate duration in months
  useEffect(() => {
    const months = durationType === 'Years' 
      ? durationValue * 12 
      : durationValue;
    setValue('durationMonths', months);
  }, [durationValue, durationType, setValue]);
  
  // Reset form when editing loan or when modal opens/closes
  useEffect(() => {
    if (editLoan) {
      // Convert duration months to years/months for form
      const years = Math.floor(editLoan.durationMonths / 12);
      const months = editLoan.durationMonths % 12;
      
      // Determine if we should display in years or months
      const displayInYears = years > 0 && months === 0;
      
      reset({
        ...editLoan,
        durationValue: displayInYears ? years : editLoan.durationMonths,
        durationType: displayInYears ? 'Years' : 'Months',
        startDate: editLoan.startDate.split('T')[0]
      });
      
      // Set step-up config and additional charges if they exist
      if (editLoan.stepUpConfig) {
        setStepUpConfig(editLoan.stepUpConfig);
      } else {
        setStepUpConfig({
          enabled: false,
          frequency: "Yearly",
          increasePercentage: 5,
        });
      }
      
      if (editLoan.additionalCharges && editLoan.additionalCharges.length > 0) {
        setAdditionalCharges(editLoan.additionalCharges);
        setIsAdvancedOptionsOpen(true);
      } else {
        setAdditionalCharges([]);
      }
    } else if (!isOpen) {
      // Reset form when modal closes
      reset({
        name: '',
        type: 'Home Loan',
        principal: 0,
        interestRate: 0,
        durationValue: 0,
        durationType: 'Years',
        durationMonths: 0,
        startDate: new Date().toISOString().split('T')[0]
      });
      setStepUpConfig({
        enabled: false,
        frequency: "Yearly",
        increasePercentage: 5,
      });
      setAdditionalCharges([]);
      setIsAdvancedOptionsOpen(false);
    }
  }, [isOpen, editLoan, reset]);
  
  // Update calculated values whenever relevant form fields change
  useEffect(() => {
    const durationMonths = durationType === 'Years' ? durationValue * 12 : durationValue;
    
    if (principal > 0 && interestRate > 0 && durationMonths > 0) {
      const emi = calculateEMI(principal, interestRate, durationMonths);
      const totalInterest = calculateTotalInterest(principal, emi, durationMonths);
      
      setCalculatedEMI(emi);
      setCalculatedTotalInterest(totalInterest);
      setCalculatedTotalPayment(principal + totalInterest);
      
      // Calculate step-up preview
      if (stepUpConfig.enabled && stepUpConfig.frequency && stepUpConfig.increasePercentage) {
        const preview = generateStepUpPreview(
          principal, 
          interestRate, 
          durationMonths, 
          stepUpConfig
        );
        setStepUpPreview(preview);
      }
      
      // Update charts
      updateCharts(principal, totalInterest, durationMonths);
    }
  }, [principal, interestRate, durationValue, durationType, stepUpConfig]);
  
  // Update charts based on loan values
  const updateCharts = (principal: number, totalInterest: number, durationMonths: number) => {
    updatePaymentBreakdownChart(principal, totalInterest);
    updateAmortizationChart(principal, durationMonths);
  };
  
  const updatePaymentBreakdownChart = (principal: number, totalInterest: number) => {
    if (paymentBreakdownChartRef.current) {
      // Cleanup previous chart
      if (paymentBreakdownChartInstance.current) {
        paymentBreakdownChartInstance.current.destroy();
      }
      
      const ctx = paymentBreakdownChartRef.current.getContext('2d');
      if (ctx) {
        paymentBreakdownChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Principal', 'Interest'],
            datasets: [{
              data: [principal, totalInterest],
              backgroundColor: ['#3b82f6', '#ef4444'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
              }
            }
          }
        });
      }
    }
  };
  
  const updateAmortizationChart = (principal: number, durationMonths: number) => {
    if (amortizationChartRef.current) {
      // Cleanup previous chart
      if (amortizationChartInstance.current) {
        amortizationChartInstance.current.destroy();
      }
      
      // Create mock data points for amortization chart
      const labels = ['0'];
      const dataPoints = [principal];
      
      const yearCount = Math.ceil(durationMonths / 12);
      const step = Math.max(1, Math.floor(yearCount / 5)); // Ensure we don't have too many labels
      
      for (let year = step; year < yearCount; year += step) {
        const progress = year / yearCount;
        const balance = principal * (1 - progress);
        labels.push(`${year}y`);
        dataPoints.push(balance);
      }
      
      // Add the final point
      labels.push(`${yearCount}y`);
      dataPoints.push(0);
      
      const ctx = amortizationChartRef.current.getContext('2d');
      if (ctx) {
        amortizationChartInstance.current = new Chart(ctx, {
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
  };
  
  // Add a new additional charge
  const addCharge = () => {
    const newCharge: AdditionalCharge = {
      id: Date.now().toString(),
      name: 'Processing Fee',
      amount: 0,
      type: 'one-time',
      frequency: 'once',
      appliedAt: 'beginning'
    };
    setAdditionalCharges([...additionalCharges, newCharge]);
  };
  
  // Remove an additional charge
  const removeCharge = (id: string) => {
    setAdditionalCharges(additionalCharges.filter(charge => charge.id !== id));
  };
  
  // Update an additional charge
  const updateCharge = (id: string, field: keyof AdditionalCharge, value: any) => {
    setAdditionalCharges(additionalCharges.map(charge => 
      charge.id === id ? { ...charge, [field]: value } : charge
    ));
  };
  
  // Form submission handler
  const onSubmit: SubmitHandler<LoanFormValues> = (data) => {
    const loanData = {
      ...data,
      stepUpConfig: stepUpConfig.enabled ? stepUpConfig : undefined,
      additionalCharges: additionalCharges.length > 0 ? additionalCharges : undefined,
    };
    
    if (editLoan && onUpdateLoan) {
      onUpdateLoan({
        ...editLoan,
        ...loanData,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddLoan({
        ...loanData,
        startDate: new Date(data.startDate).toISOString()
      });
    }
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editLoan ? 'Edit Loan' : 'Add New Loan'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Loan Name</Label>
                  <Input 
                    id="name"
                    placeholder="e.g. Home Loan - SBI"
                    {...register('name')}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="type">Loan Type</Label>
                  <Select 
                    onValueChange={(value) => setValue('type', value as LoanFormValues['type'])}
                    defaultValue={editLoan?.type || 'Home Loan'}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select loan type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(loanTypes.enum).map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate"
                    type="date"
                    {...register('startDate')}
                    className={errors.startDate ? 'border-destructive' : ''}
                  />
                  {errors.startDate && (
                    <p className="text-destructive text-sm mt-1">{errors.startDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Loan Details */}
            <div>
              <h3 className="text-lg font-medium mb-4">Loan Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="principal">Principal Amount (₹)</Label>
                  <Input 
                    id="principal"
                    type="number"
                    placeholder="0"
                    className={`number-input ${errors.principal ? 'border-destructive' : ''}`}
                    {...register('principal', {
                      valueAsNumber: true
                    })}
                  />
                  {errors.principal && (
                    <p className="text-destructive text-sm mt-1">{errors.principal.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input 
                    id="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={`number-input ${errors.interestRate ? 'border-destructive' : ''}`}
                    {...register('interestRate', {
                      valueAsNumber: true
                    })}
                  />
                  {errors.interestRate && (
                    <p className="text-destructive text-sm mt-1">{errors.interestRate.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="durationValue">Loan Term</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input 
                      id="durationValue"
                      type="number"
                      placeholder="0"
                      className={`number-input ${errors.durationValue ? 'border-destructive' : ''}`}
                      {...register('durationValue', {
                        valueAsNumber: true
                      })}
                    />
                    <Select 
                      onValueChange={(value) => setValue('durationType', value as LoanFormValues['durationType'])}
                      defaultValue={editLoan?.durationMonths && editLoan.durationMonths % 12 === 0 ? 'Years' : 'Months'}
                    >
                      <SelectTrigger id="durationType">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Years">Years</SelectItem>
                        <SelectItem value="Months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {errors.durationValue && (
                    <p className="text-destructive text-sm mt-1">{errors.durationValue.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="mb-6">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div 
                className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
                onClick={() => setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen)}
              >
                <h3 className="text-lg font-medium text-gray-700">Advanced Options</h3>
                <i className={`ri-arrow-${isAdvancedOptionsOpen ? 'up' : 'down'}-s-line text-xl text-gray-500`}></i>
              </div>
              
              {isAdvancedOptionsOpen && (
                <div className="p-4">
                  {/* Step-up EMI Configuration */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-3 flex items-center">
                      <span>Step-up EMI Configuration</span>
                      <div className="relative ml-2 group">
                        <i className="ri-information-line text-gray-400 hover:text-gray-600 cursor-pointer"></i>
                        <div className="absolute left-0 bottom-full mb-2 w-64 bg-gray-800 text-white text-xs rounded p-2 hidden group-hover:block">
                          Configure increasing EMI payments that grow over time as your income increases.
                        </div>
                      </div>
                    </h4>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enable-step-up"
                          checked={stepUpConfig.enabled}
                          onCheckedChange={(checked) => 
                            setStepUpConfig({ ...stepUpConfig, enabled: checked })
                          }
                        />
                        <Label htmlFor="enable-step-up">Enable Step-up EMI</Label>
                      </div>
                    </div>
                    
                    {stepUpConfig.enabled && (
                      <div id="step-up-options">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="frequency">Increase Frequency</Label>
                            <Select 
                              onValueChange={(value) => 
                                setStepUpConfig({ ...stepUpConfig, frequency: value as StepUpConfig['frequency'] })
                              }
                              defaultValue={stepUpConfig.frequency}
                            >
                              <SelectTrigger id="frequency">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yearly">Yearly</SelectItem>
                                <SelectItem value="Every 2 Years">Every 2 Years</SelectItem>
                                <SelectItem value="Every 5 Years">Every 5 Years</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="increasePercentage">Increase Percentage (%)</Label>
                            <Input 
                              id="increasePercentage"
                              type="number"
                              step="0.5"
                              placeholder="5.0"
                              className="number-input"
                              value={stepUpConfig.increasePercentage}
                              onChange={(e) => 
                                setStepUpConfig({ 
                                  ...stepUpConfig, 
                                  increasePercentage: parseFloat(e.target.value) 
                                })
                              }
                            />
                          </div>
                        </div>
                        
                        {stepUpPreview.length > 0 && (
                          <div>
                            <Label>Preview</Label>
                            <div className="bg-gray-50 p-3 rounded-md text-sm">
                              <div className="overflow-x-auto">
                                <table className="min-w-full">
                                  <thead>
                                    <tr>
                                      <th className="py-2 text-left text-gray-600">Year</th>
                                      <th className="py-2 text-left text-gray-600">Monthly Payment</th>
                                      <th className="py-2 text-left text-gray-600">Increase</th>
                                    </tr>
                                  </thead>
                                  <tbody className="font-mono">
                                    {stepUpPreview.map((entry, index) => (
                                      <tr key={index}>
                                        <td className="py-1">{entry.yearRange}</td>
                                        <td className="py-1">{formatCurrency(entry.monthlyPayment)}</td>
                                        <td className="py-1">
                                          {entry.increase ? (
                                            <span className="text-success-500">+{entry.increase}%</span>
                                          ) : (
                                            '-'
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Additional Charges */}
                  <div>
                    <h4 className="text-md font-medium mb-3">Additional Charges</h4>
                    <div>
                      {additionalCharges.length === 0 ? (
                        <div className="text-sm text-gray-500 mb-3">No additional charges added.</div>
                      ) : (
                        <div className="space-y-4 mb-3">
                          {additionalCharges.map((charge) => (
                            <div key={charge.id} className="bg-gray-50 p-3 rounded-md">
                              <div className="flex justify-between items-center mb-2">
                                <Input
                                  value={charge.name}
                                  onChange={(e) => updateCharge(charge.id, 'name', e.target.value)}
                                  placeholder="Charge name"
                                  className="max-w-[200px]"
                                />
                                <button 
                                  type="button"
                                  onClick={() => removeCharge(charge.id)}
                                  className="text-gray-500 hover:text-destructive"
                                >
                                  <i className="ri-close-line text-lg"></i>
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                  <Label htmlFor={`amount-${charge.id}`}>Amount (₹)</Label>
                                  <Input 
                                    id={`amount-${charge.id}`}
                                    type="number"
                                    value={charge.amount}
                                    onChange={(e) => updateCharge(charge.id, 'amount', parseFloat(e.target.value))}
                                    className="number-input"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`type-${charge.id}`}>Type</Label>
                                  <Select 
                                    onValueChange={(value) => 
                                      updateCharge(charge.id, 'type', value)
                                    }
                                    defaultValue={charge.type}
                                  >
                                    <SelectTrigger id={`type-${charge.id}`}>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="one-time">One-time</SelectItem>
                                      <SelectItem value="recurring">Recurring</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {charge.type === "recurring" && (
                                  <div>
                                    <Label htmlFor={`frequency-${charge.id}`}>Frequency</Label>
                                    <Select 
                                      onValueChange={(value) => 
                                        updateCharge(charge.id, 'frequency', value)
                                      }
                                      defaultValue={charge.frequency || 'monthly'}
                                    >
                                      <SelectTrigger id={`frequency-${charge.id}`}>
                                        <SelectValue placeholder="Select frequency" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        type="button" 
                        className="mt-2 flex items-center gap-1 text-primary hover:text-primary/90 text-sm font-medium"
                        onClick={addCharge}
                      >
                        <i className="ri-add-line"></i> Add Charge
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EMI Calculator Results */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
            <h3 className="text-lg font-medium mb-4">EMI Calculator Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Monthly EMI</div>
                <div className="text-2xl font-semibold font-mono">
                  {formatCurrency(calculatedEMI)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Interest</div>
                <div className="text-2xl font-semibold font-mono text-destructive">
                  {formatCurrency(calculatedTotalInterest)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Payment</div>
                <div className="text-2xl font-semibold font-mono">
                  {formatCurrency(calculatedTotalPayment)}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <div className="mb-2 text-sm font-medium text-gray-700">Payment Breakdown</div>
                  <div className="h-[150px]">
                    <canvas ref={paymentBreakdownChartRef} id="paymentBreakdownChart"></canvas>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-gray-700">Amortization Preview</div>
                  <div className="h-[150px]">
                    <canvas ref={amortizationChartRef} id="amortizationChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editLoan ? 'Update Loan' : 'Save Loan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
