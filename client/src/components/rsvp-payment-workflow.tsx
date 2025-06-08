import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, DollarSign, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RSVPPaymentWorkflowProps {
  tripId: number;
  userId: number;
  trip: any;
  member: any;
  isOrganizer: boolean;
  onPaymentSubmitted?: () => void;
  onPaymentConfirmed?: () => void;
}

export default function RSVPPaymentWorkflow({
  tripId,
  userId,
  trip,
  member,
  isOrganizer,
  onPaymentSubmitted,
  onPaymentConfirmed
}: RSVPPaymentWorkflowProps) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitPaymentMutation = useMutation({
    mutationFn: async (method: string) => {
      return apiRequest(`/api/trips/${tripId}/members/${userId}/payment`, "POST", { paymentMethod: method });
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted",
        description: paymentMethod === 'cash' 
          ? "Payment submitted. Waiting for organizer confirmation."
          : "Payment processed successfully. Your RSVP is now confirmed!",
      });
      setIsPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
      onPaymentSubmitted?.();
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to submit payment",
        variant: "destructive"
      });
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/trips/${tripId}/members/${userId}/confirm-payment`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Payment Confirmed",
        description: "Member payment has been confirmed and RSVP updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      onPaymentConfirmed?.();
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation Failed",
        description: error.message || "Failed to confirm payment",
        variant: "destructive"
      });
    }
  });

  const handleSubmitPayment = () => {
    if (!paymentMethod) return;
    submitPaymentMutation.mutate(paymentMethod);
  };

  const handleConfirmPayment = () => {
    confirmPaymentMutation.mutate();
  };

  const getPaymentStatusBadge = () => {
    if (!trip.requiresDownPayment) return null;

    switch (member?.rsvpStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Payment Required</Badge>;
      case 'awaiting_payment':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Awaiting Confirmation</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>;
      default:
        return null;
    }
  };

  const getPaymentStatusIcon = () => {
    if (!trip.requiresDownPayment) return null;

    switch (member?.rsvpStatus) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'awaiting_payment':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  // Show organizer view for confirming cash payments
  if (isOrganizer && member?.paymentMethod === 'cash' && member?.paymentStatus === 'pending') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" />
            Cash Payment Pending Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700 mb-4">
            {member.user?.name || 'Member'} has submitted a cash payment of ${trip.downPaymentAmount}. 
            Please confirm receipt of payment to complete their RSVP.
          </p>
          <Button 
            onClick={handleConfirmPayment}
            disabled={confirmPaymentMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {confirmPaymentMutation.isPending ? "Confirming..." : "Confirm Cash Payment Received"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show payment required card for users who need to pay
  if (trip.requiresDownPayment && member?.rsvpStatus === 'pending') {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <DollarSign className="h-5 w-5" />
            Down Payment Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 mb-4">
            This trip requires a down payment of <strong>${trip.downPaymentAmount}</strong> before your RSVP can be confirmed.
          </p>
          
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-600 hover:bg-yellow-700">
                Submit Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Down Payment</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Amount Due:</p>
                  <p className="text-2xl font-bold text-gray-900">${trip.downPaymentAmount}</p>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Choose Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="venmo" id="venmo" />
                      <Label htmlFor="venmo" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Venmo
                        </div>
                        <p className="text-xs text-gray-500">Instant confirmation</p>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          PayPal
                        </div>
                        <p className="text-xs text-gray-500">Instant confirmation</p>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Cash
                        </div>
                        <p className="text-xs text-gray-500">Requires organizer confirmation</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Button 
                  onClick={handleSubmitPayment}
                  disabled={!paymentMethod || submitPaymentMutation.isPending}
                  className="w-full"
                >
                  {submitPaymentMutation.isPending ? "Processing..." : "Submit Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Show awaiting confirmation status
  if (trip.requiresDownPayment && member?.rsvpStatus === 'awaiting_payment') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" />
            Payment Submitted - Awaiting Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700">
            Your cash payment of ${trip.downPaymentAmount} has been submitted. 
            The trip organizer will confirm receipt and update your RSVP status.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show confirmation status or payment status badge
  return (
    <div className="flex items-center gap-2">
      {getPaymentStatusIcon()}
      {getPaymentStatusBadge()}
    </div>
  );
}