import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { HandHeart, CreditCard, Clock, CheckCircle, AlertCircle, Bell, Timer, DollarSign, Check, ArrowRight, Lock, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface PendingStatusScreenProps {
  trip: {
    id: number;
    name: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    requiresDownPayment?: boolean;
    downPaymentAmount?: string;
    organizer?: number;
  };
  member: {
    userId?: number;
    rsvpStatus?: string;
    paymentMethod?: string;
    paymentAmount?: string;
    paymentStatus?: string;
  };
}

interface SettlementOption {
  method: 'venmo' | 'paypal' | 'cash';
  displayName: string;
  paymentLink?: string;
  available: boolean;
}

export default function PendingStatusScreen({ trip, member }: PendingStatusScreenProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Fetch payment options
  const { data: settlementOptions = [], isLoading: optionsLoading, error: optionsError } = useQuery({
    queryKey: ['/api/trips', trip.id, 'payment-options'],
    enabled: !!trip.requiresDownPayment && !!trip.organizer,
  });

  // Submit payment mutation
  const submitPaymentMutation = useMutation({
    mutationFn: async (data: { paymentMethod: string }) => {
      return await apiRequest(`/api/trips/${trip.id}/submit-payment`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for organizer review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', trip.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Confirm attendance mutation (for trips without payment)
  const confirmAttendanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/trips/${trip.id}/confirm-rsvp`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "RSVP Confirmed",
        description: "Your attendance has been confirmed!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', trip.id] });
    },
    onError: (error: any) => {
      toast({
        title: "RSVP Failed",
        description: error.message || "Failed to confirm RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'venmo': return 'Venmo';
      case 'paypal': return 'PayPal';
      case 'cash': return 'Cash';
      default: return method;
    }
  };

  const getRSVPStatusMessage = () => {
    if (member.rsvpStatus === 'pending') {
      if (trip.requiresDownPayment) {
        if (!member.paymentStatus || member.paymentStatus === 'not_required') {
          return 'Payment Required';
        } else if (member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') {
          return 'Payment Submitted';
        } else if (member.paymentStatus === 'confirmed') {
          return 'Payment Confirmed';
        }
      }
      return 'Pending Confirmation';
    }
    return member.rsvpStatus || 'Unknown';
  };

  const getPaymentStatusMessage = () => {
    if (!trip.requiresDownPayment) return 'No payment required';
    
    switch (member.paymentStatus) {
      case 'submitted':
      case 'pending':
        return 'Awaiting confirmation';
      case 'confirmed':
        return 'Payment confirmed';
      case 'rejected':
        return 'Payment rejected';
      case 'not_required':
      default:
        return 'Payment required';
    }
  };

  const getStatusColor = () => {
    if (member.rsvpStatus === 'pending') {
      if (trip.requiresDownPayment) {
        if (member.paymentStatus === 'confirmed') {
          return 'bg-green-100 text-green-800';
        } else if (member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') {
          return 'bg-yellow-100 text-yellow-800';
        }
      }
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-6 shadow-xl">
            <HandHeart className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {trip.name}
          </h1>
          {trip.destination && (
            <p className="text-xl text-gray-600 mb-2">📍 {trip.destination}</p>
          )}
          {(trip.startDate || trip.endDate) && (
            <p className="text-lg text-gray-500">
              {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
              {trip.startDate && trip.endDate && ' - '}
              {trip.endDate && new Date(trip.endDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Trip Details */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {trip.description && (
            <Card className="md:col-span-2 hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">About This Trip</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{trip.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RSVP Action Section */}
        <div className="mb-8">
          <Card className="border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors duration-300">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 shadow-lg">
                <HandHeart className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') 
                  ? 'Complete Your RSVP' 
                  : 'RSVP Status'}
              </CardTitle>
              <p className="text-gray-600 max-w-md mx-auto">
                {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required')
                  ? `Submit your $${trip.downPaymentAmount} down payment to secure your spot on this amazing adventure.`
                  : 'Your RSVP is being reviewed by the trip organizer.'
                }
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Current Status Display */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Timer className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-700">RSVP Status</span>
                    </div>
                    <Badge className={`${getStatusColor()} text-sm px-4 py-2`}>
                      {getRSVPStatusMessage()}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-700">Payment Status</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 bg-white px-4 py-2 rounded-full border border-gray-200">
                      {getPaymentStatusMessage()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {trip.requiresDownPayment && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Down Payment Required</h3>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-1">${trip.downPaymentAmount}</div>
                    <div className="text-sm text-green-700">Required to confirm your spot</div>
                  </div>

                  {/* Payment Submission Form */}
                  {(!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') && (
                    <div className="space-y-4">
                      <Separator />
                      
                      <div className="space-y-4">
                        <Label className="text-lg font-semibold flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                          Choose Payment Method
                        </Label>
                        
                        {optionsLoading && (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading payment options...</span>
                          </div>
                        )}
                        
                        {optionsError && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-5 w-5 text-red-500" />
                              <span className="font-medium text-red-700">Failed to load payment options</span>
                            </div>
                            <p className="text-sm text-red-600">Please try again or contact the organizer.</p>
                          </div>
                        )}
                        
                        {!optionsLoading && !optionsError && settlementOptions.length === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                              <span className="font-medium text-yellow-700">No payment methods available</span>
                            </div>
                            <p className="text-sm text-yellow-600">Please contact the organizer to set up payment preferences.</p>
                          </div>
                        )}
                        
                        {!optionsLoading && !optionsError && settlementOptions.map((option: SettlementOption) => (
                          <div
                            key={option.method}
                            className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                              selectedMethod === option.method
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setSelectedMethod(option.method)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                  selectedMethod === option.method
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedMethod === option.method && (
                                    <Check className="h-4 w-4 text-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900">{option.displayName}</div>
                                  {option.method === 'cash' && (
                                    <div className="text-sm text-gray-600">
                                      Settle in person with organizer
                                    </div>
                                  )}
                                </div>
                              </div>
                              {option.method !== 'cash' && (
                                <ArrowRight className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {selectedMethod && (
                          <Button 
                            onClick={() => {
                              submitPaymentMutation.mutate({ paymentMethod: selectedMethod });
                            }}
                            disabled={submitPaymentMutation.isPending}
                            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
                          >
                            {submitPaymentMutation.isPending ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Submitting Payment...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Submit Payment via {formatPaymentMethod(selectedMethod)}
                              </div>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Status Messages */}
                  {(member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-700">Payment Submitted</span>
                      </div>
                      <p className="text-sm text-yellow-600">
                        Your payment has been submitted and is awaiting organizer confirmation.
                        <br /><strong>Payment Submitted:</strong> The organizer needs to confirm your payment before you can access trip features.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Simple RSVP Confirmation for trips without payment */}
              {!trip.requiresDownPayment && (
                <div className="text-center">
                  <Button 
                    onClick={() => confirmAttendanceMutation.mutate()}
                    disabled={confirmAttendanceMutation.isPending}
                    className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    {confirmAttendanceMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Confirming Attendance...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Confirm Attendance
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* What Happens Next Section */}
        <Card className="mb-8 hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3">What happens next?</h3>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  You'll receive a notification once your RSVP is confirmed by the organizer. 
                  This exciting adventure is just getting started!
                </p>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    Once confirmed, you'll unlock:
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Trip chat and messaging</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Expense tracking and splitting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Activity planning and polls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Flight coordination</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>All trip management features</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>Real-time updates and notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg border border-gray-200">
            <Heart className="h-5 w-5 text-red-500" />
            <span className="text-gray-700 font-medium">Questions? Contact the trip organizer for assistance.</span>
          </div>
        </div>
      </div>
    </div>
  );
}