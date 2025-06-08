import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ExternalLink, CreditCard, DollarSign, CheckCircle, Clock } from "lucide-react";

interface SettlementWorkflowProps {
  tripId: number;
  balance: {
    userId: number;
    name: string;
    balance: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

interface SettlementOption {
  method: 'venmo' | 'paypal' | 'cash';
  displayName: string;
  paymentLink?: string;
  available: boolean;
}

export function SettlementWorkflow({ tripId, balance, isOpen, onClose }: SettlementWorkflowProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const amount = Math.abs(balance.balance);
  const isOwed = balance.balance > 0; // User is owed money
  const owes = balance.balance < 0; // User owes money

  // Get settlement options for the payee
  const { data: settlementOptions = [], isLoading: optionsLoading, error: optionsError } = useQuery<SettlementOption[]>({
    queryKey: [`/api/trips/${tripId}/settlement-options/${balance.userId}?amount=${amount}`],
    enabled: isOpen && owes, // Only fetch if user owes money
  });

  // Debug logging for balance calculation
  console.log('SettlementWorkflow balance debug:', {
    balanceObject: balance,
    amount,
    isOwed,
    owes,
    rawBalance: balance.balance,
    settlementOptions: settlementOptions,
    settlementOptionsEnabled: isOpen && owes,
    optionsLoading,
    optionsError: optionsError?.message
  });

  // Get existing settlements for this trip
  const { data: existingSettlements = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/settlements`],
    enabled: isOpen,
  });

  const initiateMutation = useMutation({
    mutationFn: async (data: { payeeId: number; amount: number; paymentMethod: string; notes: string }) => {
      return await apiRequest('POST', `/api/trips/${tripId}/settlements/initiate`, data);
    },
    onSuccess: () => {
      toast({
        title: "Settlement Initiated",
        description: "Payment settlement has been initiated. Waiting for confirmation from the recipient.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/settlements`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses/balances`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Settlement Failed",
        description: error.message || "Failed to initiate settlement.",
        variant: "destructive",
      });
    },
  });

  const handleInitiateSettlement = async () => {
    if (!selectedMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    // For cash payments, proceed directly to settlement initiation
    if (selectedMethod === 'cash') {
      setIsInitiating(true);
      try {
        await initiateMutation.mutateAsync({
          payeeId: balance.userId,
          amount,
          paymentMethod: selectedMethod,
          notes,
        });
      } finally {
        setIsInitiating(false);
      }
    } else {
      // For Venmo/PayPal, show confirmation screen first
      setShowConfirmation(true);
    }
  };

  const handleMarkAsSent = async () => {
    setIsInitiating(true);
    try {
      await initiateMutation.mutateAsync({
        payeeId: balance.userId,
        amount,
        paymentMethod: selectedMethod,
        notes,
      });
      setShowConfirmation(false);
      setHasRedirected(false);
    } finally {
      setIsInitiating(false);
    }
  };

  const resetWorkflow = () => {
    setShowConfirmation(false);
    setHasRedirected(false);
    setSelectedMethod('');
    setNotes('');
  };

  const handleClose = () => {
    resetWorkflow();
    onClose();
  };

  const openPaymentLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setHasRedirected(true);
    setShowConfirmation(true);
  };

  // Check if there's already a pending settlement
  // When user owes money (negative balance), they are the payer
  // When user is owed money (positive balance), they are the payee
  const existingSettlement = existingSettlements.find((s: any) => 
    (owes && s.payeeId === balance.userId && s.status === 'pending') ||
    (isOwed && s.payerId === balance.userId && s.status === 'pending')
  );

  if (balance.balance === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              All Settled Up
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600">No outstanding balance with {balance.name}.</p>
          </div>
          <Button onClick={handleClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Settle Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">{balance.name}</span>
              <div className="text-right">
                {isOwed ? (
                  <div className="text-green-600 font-semibold">
                    Owes you ${amount.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-red-600 font-semibold">
                    You owe ${amount.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation Screen */}
          {showConfirmation && selectedMethod !== 'cash' && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="text-center space-y-3">
                <CheckCircle className="h-8 w-8 text-blue-600 mx-auto" />
                <div>
                  <h3 className="font-medium text-blue-900">Payment App Opened</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    We opened {selectedMethod === 'venmo' ? 'Venmo' : 'PayPal'} for you to send ${amount.toFixed(2)} to {balance.name}.
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-gray-600 mb-3">
                    After completing the payment in the app, click the button below to notify {balance.name}.
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={resetWorkflow}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Go Back
                    </Button>
                    <Button
                      onClick={handleMarkAsSent}
                      disabled={isInitiating}
                      size="sm"
                      className="flex-1"
                    >
                      {isInitiating ? "Confirming..." : "Mark as Sent"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {existingSettlement && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-yellow-800">Settlement Pending</span>
              </div>
              <p className="text-sm text-yellow-700">
                A settlement of ${parseFloat(existingSettlement.amount).toFixed(2)} is already pending confirmation.
              </p>
              {existingSettlement.paymentMethod && existingSettlement.paymentMethod !== 'cash' && (
                <p className="text-sm text-yellow-700 mt-1">
                  Payment method: {existingSettlement.paymentMethod === 'venmo' ? 'Venmo' : 'PayPal'}
                </p>
              )}
            </div>
          )}

          {/* Settlement Options - Only show if user owes money, no pending settlement, and not in confirmation mode */}
          {owes && !existingSettlement && !showConfirmation && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose Payment Method</Label>
                
                {optionsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading payment options...</span>
                  </div>
                )}
                
                {optionsError && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-sm text-red-700">
                      Failed to load payment options. Please try again.
                    </p>
                  </div>
                )}
                
                {!optionsLoading && !optionsError && settlementOptions.length === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      No payment methods available. Please contact {balance.name} to set up payment preferences.
                    </p>
                  </div>
                )}
                
                {!optionsLoading && !optionsError && settlementOptions.map((option) => (
                  <div
                    key={option.method}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedMethod === option.method
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMethod(option.method)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedMethod === option.method
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedMethod === option.method && (
                            <div className="w-full h-full rounded-full bg-white transform scale-50" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{option.displayName}</div>
                          {option.method === 'cash' && (
                            <div className="text-sm text-gray-600">
                              Both parties must confirm completion
                            </div>
                          )}
                          {option.paymentLink && (
                            <div className="text-sm text-blue-600">
                              One-click payment link available
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {option.method === 'venmo' && <CreditCard className="h-5 w-5 text-purple-600" />}
                      {option.method === 'paypal' && <CreditCard className="h-5 w-5 text-blue-600" />}
                      {option.method === 'cash' && <DollarSign className="h-5 w-5 text-green-600" />}
                    </div>
                    
                    {selectedMethod === option.method && option.paymentLink && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPaymentLink(option.paymentLink!);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open {option.displayName} Payment
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note about this payment..."
                  rows={2}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After initiating settlement, {balance.name} will receive a notification 
                  to confirm receipt of payment. The balance will be marked as settled once confirmed.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiateSettlement}
                  disabled={!selectedMethod || isInitiating}
                  className="flex-1"
                >
                  {isInitiating ? "Initiating..." : "Initiate Settlement"}
                </Button>
              </div>
            </>
          )}

          {/* Confirmation screen after payment link redirect */}
          {showConfirmation && hasRedirected && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Payment Link Opened</span>
                </div>
                <p className="text-sm text-blue-700">
                  If you completed the payment through {selectedMethod === 'venmo' ? 'Venmo' : 'PayPal'}, 
                  click "Mark as Sent" below to notify {balance.name}.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setShowConfirmation(false);
                    setHasRedirected(false);
                  }} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkAsSent}
                  disabled={isInitiating}
                  className="flex-1"
                >
                  {isInitiating ? "Marking as Sent..." : "Mark as Sent"}
                </Button>
              </div>
            </div>
          )}

          {/* If user is owed money, show different UI */}
          {isOwed && !showConfirmation && (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                You are owed money by {balance.name}. They will need to initiate the settlement process.
              </p>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}