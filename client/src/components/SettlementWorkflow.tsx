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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const amount = Math.abs(balance.balance);
  const isOwed = balance.balance > 0; // User is owed money
  const owes = balance.balance < 0; // User owes money

  // Get settlement options for the payee
  const { data: settlementOptions = [] } = useQuery<SettlementOption[]>({
    queryKey: [`/api/trips/${tripId}/settlement-options/${balance.userId}`, { amount }],
    enabled: isOpen && owes, // Only fetch if user owes money
  });

  // Get existing settlements for this trip
  const { data: existingSettlements = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/settlements`],
    enabled: isOpen,
  });

  const initiateMutation = useMutation({
    mutationFn: async (data: { payeeId: number; amount: number; paymentMethod: string; notes: string }) => {
      return await apiRequest(`/api/trips/${tripId}/settlements/initiate`, 'POST', data);
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
  };

  const openPaymentLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Check if there's already a pending settlement
  const existingSettlement = existingSettlements.find((s: any) => 
    s.payerId === (owes ? undefined : balance.userId) && 
    s.payeeId === (owes ? balance.userId : undefined) && 
    s.status === 'pending'
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
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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

          {/* Settlement Options - Only show if user owes money and no pending settlement */}
          {owes && !existingSettlement && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-base font-medium">Choose Payment Method</Label>
                
                {settlementOptions.map((option) => (
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
                <Button onClick={onClose} variant="outline" className="flex-1">
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

          {/* If user is owed money, show different UI */}
          {isOwed && (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                You are owed money by {balance.name}. They will need to initiate the settlement process.
              </p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}