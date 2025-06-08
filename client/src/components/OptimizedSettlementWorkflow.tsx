import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SettlementWorkflow } from "@/components/SettlementWorkflow";
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Zap
} from "lucide-react";

interface OptimizedTransaction {
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  toUserName: string;
  amount: number;
}

interface SettlementStats {
  totalTransactions: number;
  totalAmount: number;
  usersInvolved: number;
  averageTransactionAmount: number;
}

interface OptimizedSettlementData {
  transactions: OptimizedTransaction[];
  stats: SettlementStats;
  isValid: boolean;
  originalBalances: Array<{
    userId: number;
    name: string;
    netBalance: number;
  }>;
}

interface OptimizedSettlementWorkflowProps {
  tripId: number;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: number;
}

export function OptimizedSettlementWorkflow({ 
  tripId, 
  isOpen, 
  onClose, 
  currentUserId 
}: OptimizedSettlementWorkflowProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<OptimizedTransaction | null>(null);
  const [settlementWorkflow, setSettlementWorkflow] = useState<{
    isOpen: boolean;
    balance: { userId: number; name: string; balance: number } | null;
  }>({ isOpen: false, balance: null });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch optimized settlement plan
  const { data: settlementData, isLoading, error } = useQuery<OptimizedSettlementData>({
    queryKey: [`/api/settlements/${tripId}/optimized`],
    enabled: isOpen,
  });

  // Debug logging for settlement data
  if (isOpen) {
    console.log('Settlement data query:', {
      isLoading,
      error: error?.message || null,
      tripId,
      isOpen,
      hasData: !!settlementData,
      data: settlementData
    });
  }

  // Get user-specific recommendations
  const { data: userRecommendations } = useQuery<{ recommendations: OptimizedTransaction[] }>({
    queryKey: [`/api/settlements/${tripId}/user-recommendations/${currentUserId}`],
    enabled: isOpen,
  });

  // Remove the old mutation and replace with settlement workflow trigger

  const handleInitiateTransaction = (transaction: OptimizedTransaction) => {
    console.log('handleInitiateTransaction called with:', {
      transaction,
      currentUserId,
      isValidPayer: transaction.fromUserId === currentUserId
    });
    
    if (transaction.fromUserId !== currentUserId) {
      toast({
        title: "Invalid Transaction",
        description: "You can only initiate payments you owe to others.",
        variant: "destructive",
      });
      return;
    }
    
    // Open the existing SettlementWorkflow with the transaction details
    // Balance should be negative since current user owes money to the payee
    const settlementBalance = {
      userId: transaction.toUserId,
      name: transaction.toUserName,
      balance: -transaction.amount
    };
    
    console.log('Opening SettlementWorkflow with balance:', settlementBalance);
    
    setSettlementWorkflow({
      isOpen: true,
      balance: settlementBalance
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getUserTransactions = () => {
    if (!settlementData?.transactions) return { outgoing: [], incoming: [] };
    
    // Use the exact same transactions from the settlement data
    const outgoing = settlementData.transactions.filter((t: OptimizedTransaction) => t.fromUserId === currentUserId);
    const incoming = settlementData.transactions.filter((t: OptimizedTransaction) => t.toUserId === currentUserId);
    
    // Debug logging to track payment direction
    console.log('Payment direction debug:', {
      currentUserId,
      allTransactions: settlementData.transactions,
      outgoingFiltered: outgoing,
      incomingFiltered: incoming,
      originalBalances: settlementData.originalBalances
    });
    
    return { outgoing, incoming };
  };

  const getEfficiencyMessage = () => {
    if (!settlementData) return "";
    
    const { stats, originalBalances } = settlementData;
    const usersWithBalance = originalBalances.filter((b: any) => Math.abs(b.netBalance) > 0.01).length;
    const maxPossibleTransactions = Math.max(0, usersWithBalance - 1);
    
    if (stats.totalTransactions === 0) {
      return "All balances are settled!";
    }
    
    const efficiency = maxPossibleTransactions > 0 
      ? Math.round(((maxPossibleTransactions - stats.totalTransactions) / maxPossibleTransactions) * 100)
      : 0;
    
    return `${efficiency}% fewer payments than individual settlements`;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Calculating optimal settlement plan...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!settlementData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Unable to Calculate Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600">Could not load settlement data for this trip.</p>
          </div>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const { outgoing, incoming } = getUserTransactions();
  const { transactions, stats } = settlementData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Optimized Settlement Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-blue-900">{stats.totalTransactions}</div>
              <div className="text-xs text-blue-700">Total Payments</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-green-900">{formatCurrency(stats.totalAmount)}</div>
              <div className="text-xs text-green-700">Total Amount</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-purple-900">{stats.usersInvolved}</div>
              <div className="text-xs text-purple-700">Users Involved</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <CheckCircle className="h-6 w-6 text-orange-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-orange-900">{formatCurrency(stats.averageTransactionAmount)}</div>
              <div className="text-xs text-orange-700">Avg Payment</div>
            </div>
          </div>

          {/* Efficiency Badge */}
          {stats.totalTransactions > 0 && (
            <div className="text-center">
              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 px-3 py-1">
                <Zap className="h-3 w-3 mr-1" />
                {getEfficiencyMessage()}
              </Badge>
            </div>
          )}

          {/* No settlements needed */}
          {transactions.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Settled Up!</h3>
              <p className="text-gray-600">No payments are needed for this trip.</p>
            </div>
          )}

          {/* Your Payments */}
          {outgoing.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Payments You Need to Make</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {outgoing.map((transaction: OptimizedTransaction, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <ArrowRight className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium">Pay {transaction.toUserName}</div>
                        <div className="text-sm text-gray-600">{formatCurrency(transaction.amount)}</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleInitiateTransaction(transaction)}
                      size="sm"
                    >
                      Pay Now
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payments Coming to You */}
          {incoming.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Payments Coming to You</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incoming.map((transaction: OptimizedTransaction, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <ArrowRight className="h-4 w-4 text-green-600 rotate-180" />
                      <div>
                        <div className="font-medium">{transaction.fromUserName} owes you</div>
                        <div className="text-sm text-gray-600">{formatCurrency(transaction.amount)}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Incoming
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Complete Settlement Plan */}
          {transactions.length > 0 && (outgoing.length > 0 || incoming.length > 0) && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle>Complete Settlement Plan</CardTitle>
                  <p className="text-sm text-gray-600">
                    This optimized plan minimizes the total number of payments needed to settle all balances.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactions.map((transaction: OptimizedTransaction, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="font-medium text-gray-900">
                            {transaction.fromUserName}
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                          <div className="font-medium text-gray-900">
                            {transaction.toUserName}
                          </div>
                        </div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Validation Warning */}
          {settlementData && !settlementData.isValid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Settlement plan validation warning
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                The calculated settlement plan may not perfectly balance all accounts due to rounding. Small differences under $0.05 are expected.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
            {outgoing.length === 0 && incoming.length === 0 && transactions.length > 0 && (
              <Badge variant="secondary" className="px-3 py-2">
                No actions needed from you
              </Badge>
            )}
          </div>
        </div>

        {/* Settlement Workflow Modal */}
        {settlementWorkflow.balance && (
          <SettlementWorkflow
            tripId={tripId}
            balance={settlementWorkflow.balance}
            isOpen={settlementWorkflow.isOpen}
            onClose={() => setSettlementWorkflow({ isOpen: false, balance: null })}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}