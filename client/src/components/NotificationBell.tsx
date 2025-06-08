import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCircle, Clock, HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingSettlement {
  id: number;
  tripId: number;
  payerId: number;
  payeeId: number;
  amount: string;
  currency: string;
  paymentMethod: string | null;
  status: string;
  initiatedAt: string;
  payerName: string;
  tripName: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending settlements requiring user confirmation
  const { data: pendingSettlements = [] } = useQuery<PendingSettlement[]>({
    queryKey: ["/api/settlements/pending"],
    refetchInterval: 30000, // Poll every 30 seconds for new notifications
  });

  const confirmMutation = useMutation({
    mutationFn: async (settlementId: number) => {
      return await apiRequest('POST', `/api/settlements/${settlementId}/confirm`, {});
    },
    onSuccess: () => {
      toast({
        title: "Settlement Confirmed",
        description: "Payment has been marked as received.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      // Also invalidate trip expenses and balances to update visuals
      pendingSettlements.forEach(settlement => {
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${settlement.tripId}/expenses/balances`] });
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${settlement.tripId}/expenses`] });
        // Force refetch instead of using cache
        queryClient.refetchQueries({ queryKey: [`/api/trips/${settlement.tripId}/expenses/balances`] });
        queryClient.refetchQueries({ queryKey: [`/api/trips/${settlement.tripId}/expenses`] });
      });
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation Failed",
        description: error.message || "Failed to confirm settlement.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmSettlement = (settlementId: number) => {
    confirmMutation.mutate(settlementId);
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getPaymentMethodDisplay = (method: string | null) => {
    switch (method) {
      case 'venmo':
        return 'Venmo';
      case 'paypal':
        return 'PayPal';
      case 'cash':
        return 'Cash';
      default:
        return 'Unknown method';
    }
  };

  const unreadCount = pendingSettlements.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <HandHeart className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HandHeart className="h-4 w-4" />
              Settlement Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingSettlements.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No pending settlements</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {pendingSettlements.map((settlement) => (
                  <div key={settlement.id} className="p-4 border-b last:border-b-0">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <HandHeart className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">
                              Payment Confirmation Required
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            <strong>{settlement.payerName}</strong> sent you{" "}
                            <strong>{formatCurrency(settlement.amount)}</strong>
                          </p>
                          <div className="text-xs text-gray-500 mt-1 space-y-1">
                            <div>Trip: {settlement.tripName}</div>
                            <div>Method: {getPaymentMethodDisplay(settlement.paymentMethod)}</div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(settlement.initiatedAt).toLocaleDateString()} at{" "}
                              {new Date(settlement.initiatedAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmSettlement(settlement.id)}
                          disabled={confirmMutation.isPending}
                          className="flex-1"
                        >
                          {confirmMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Confirming...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-2" />
                              Confirm Receipt
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {settlement.paymentMethod === 'cash' && (
                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          Cash payment - Please confirm once you've received the money in person.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}