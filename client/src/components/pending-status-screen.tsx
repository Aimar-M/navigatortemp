import { Clock, CreditCard, AlertCircle, Bell, MapPin, Calendar, Users, DollarSign, Activity, Check, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Confirm attendance mutation (for trips without payment requirement)
  const confirmAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      return await apiRequest('PUT', `/api/trips/${trip.id}/members/${user.id}/rsvp`, { 
        rsvpStatus: 'confirmed' 
      });
    },
    onSuccess: () => {
      toast({
        title: "Attendance confirmed!",
        description: "You're now confirmed for this trip"
      });
      // Refresh the page or redirect
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation failed",
        description: error.message || "Failed to confirm attendance",
        variant: "destructive"
      });
    }
  });

  // Fetch trip activities for preview
  const { data: activities } = useQuery({
    queryKey: ['/api/trips', trip.id, 'activities'],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${trip.id}/activities`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!trip.id
  });

  // Fetch budget summary for preview
  const { data: budgetSummary } = useQuery({
    queryKey: ['/api/trips', trip.id, 'expenses', 'summary'],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${trip.id}/expenses/summary`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!trip.id
  });

  // Fetch trip members for count
  const { data: tripMembers } = useQuery({
    queryKey: ['/api/trips', trip.id, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${trip.id}/members`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!trip.id
  });

  // Find the organizer to get their payment options
  const organizer = tripMembers?.find((member: any) => member.userId === trip.organizer);
  
  // Fetch settlement options from organizer (payment methods)
  const { data: settlementOptions = [], isLoading: optionsLoading, error: optionsError } = useQuery({
    queryKey: [`/api/trips/${trip.id}/settlement-options/${organizer?.userId}`, trip.downPaymentAmount],
    queryFn: async () => {
      if (!organizer?.userId || !trip.downPaymentAmount) return [];
      const response = await fetch(`/api/trips/${trip.id}/settlement-options/${organizer.userId}?amount=${trip.downPaymentAmount}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!organizer?.userId && !!trip.downPaymentAmount && trip.requiresDownPayment
  });

  const formatPaymentMethod = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'venmo':
        return 'Venmo';
      case 'paypal':
        return 'PayPal';
      case 'cash':
        return 'Cash';
      default:
        return method || 'Not specified';
    }
  };

  const getPaymentStatusMessage = () => {
    if (!trip.requiresDownPayment) {
      return "No payment required";
    }

    switch (member.paymentStatus) {
      case 'submitted':
      case 'pending':
        return "Payment submitted - awaiting organizer confirmation";
      case 'confirmed':
        return "Payment confirmed";
      case 'rejected':
        return "Payment rejected - please resubmit";
      case 'not_required':
        // For trips that require down payment but member status is "not_required", 
        // this means they haven't submitted payment yet
        return trip.requiresDownPayment ? "Payment required - not yet submitted" : "No payment required";
      case null:
      case undefined:
      case '':
        return "Payment required - not yet submitted";
      default:
        return "Payment required - not yet submitted";
    }
  };

  const getRSVPStatusMessage = () => {
    // If no payment is required, show simple RSVP status
    if (!trip.requiresDownPayment) {
      return "Awaiting organizer approval";
    }
    
    // If payment is required, check payment status
    switch (member.paymentStatus) {
      case 'submitted':
      case 'pending':
        return "Payment submitted - awaiting confirmation";
      case 'confirmed':
        return "Payment confirmed - awaiting final approval";
      case 'rejected':
        return "Payment rejected - please resubmit";
      case 'not_required':
        // For trips requiring payment, this means payment hasn't been submitted yet
        return trip.requiresDownPayment ? "Payment required to proceed" : "Awaiting organizer approval";
      case null:
      case undefined:
      case '':
        return "Payment required to proceed";
      default:
        return "Payment required to proceed";
    }
  };

  const getStatusColor = () => {
    if (!trip.requiresDownPayment) {
      return "bg-blue-100 text-blue-800";
    }
    
    switch (member.paymentStatus) {
      case 'submitted':
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'confirmed':
        return "bg-green-100 text-green-800";
      case 'rejected':
        return "bg-red-100 text-red-800";
      case 'not_required':
        return "bg-blue-100 text-blue-800";
      case null:
      case undefined:
      case '':
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-orange-100 text-orange-800";
    }
  };

  // Submit payment mutation
  const submitPaymentMutation = useMutation({
    mutationFn: async (paymentData: { paymentMethod: string }) => {
      if (!user) throw new Error("User not authenticated");
      return await apiRequest('POST', `/api/trips/${trip.id}/members/${user.id}/payment`, paymentData);
    },
    onSuccess: () => {
      toast({
        title: "Payment submitted!",
        description: "Your payment has been submitted and is awaiting organizer confirmation"
      });
      // Refresh the page to show updated status
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Payment submission failed",
        description: error.message || "Failed to submit payment",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">RSVP Pending</h1>
        <p className="text-gray-600">
          {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected') 
            ? `Submit your ${trip.downPaymentAmount ? `$${trip.downPaymentAmount}` : ''} down payment to secure your spot on `
            : 'Your request to join '
          }
          <span className="font-semibold">{trip.name}</span>
          {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected') 
            ? '' 
            : ' is pending organizer approval'
          }
        </p>
        {trip.destination && (
          <p className="text-sm text-gray-500 mt-1">{trip.destination}</p>
        )}
        {trip.startDate && trip.endDate && (
          <p className="text-sm text-gray-500">
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        )}
        
        {/* Quick Stats */}
        <div className="flex justify-center gap-6 mt-4">
          {trip.startDate && trip.endDate && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <span className="text-xs text-gray-500">Duration</span>
            </div>
          )}
          
          {tripMembers && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {tripMembers.filter((m: any) => m.rsvpStatus === 'confirmed').length}
                </span>
              </div>
              <span className="text-xs text-gray-500">Confirmed</span>
            </div>
          )}
          
          {trip.destination && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {trip.destination}
                </span>
              </div>
              <span className="text-xs text-gray-500">Destination</span>
            </div>
          )}
        </div>
      </div>

      {/* Trip Details Card */}
      {(trip.description || trip.destination) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {trip.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                <p className="text-sm text-gray-600">{trip.description}</p>
              </div>
            )}
            {trip.destination && trip.startDate && trip.endDate && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Destination:</span>
                  <p className="font-medium">{trip.destination}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-medium">
                    {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activities Preview */}
      {activities && activities.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Planned Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.slice(0, 3).map((activity: any, index: number) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{activity.name}</h4>
                    {activity.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{activity.description}</p>
                    )}
                    {activity.date && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(activity.date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activities.length > 3 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  +{activities.length - 3} more activities planned
                </p>
              )}
              {activities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No activities planned yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Members Preview */}
      {tripMembers && tripMembers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Trip Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tripMembers.slice(0, 4).map((member: any) => (
                <div key={member.userId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-600">
                      {member.user?.name?.[0] || member.user?.username?.[0] || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user?.name || member.user?.username || 'Unknown User'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={member.rsvpStatus === 'confirmed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {member.rsvpStatus === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {tripMembers.length > 4 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  +{tripMembers.length - 4} more members
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Preview */}
      {budgetSummary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="text-2xl font-bold text-green-600">
                  ${budgetSummary.totalExpenses || 0}
                </div>
                <div className="text-xs text-green-700 mt-1">Total Planned</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">
                  ${Math.round((budgetSummary.totalExpenses || 0) / (tripMembers?.filter((m: any) => m.rsvpStatus === 'confirmed').length || 1))}
                </div>
                <div className="text-xs text-blue-700 mt-1">Per Person</div>
              </div>
            </div>
            {budgetSummary.categories && budgetSummary.categories.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Budget Categories</h4>
                <div className="space-y-2">
                  {budgetSummary.categories.slice(0, 3).map((category: any) => (
                    <div key={category.name} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{category.name}</span>
                      <span className="text-sm font-medium text-gray-900">${category.amount}</span>
                    </div>
                  ))}
                  {budgetSummary.categories.length > 3 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{budgetSummary.categories.length - 3} more categories
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">RSVP Status:</span>
            <Badge className={getStatusColor()}>
              {getRSVPStatusMessage()}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Payment Status:</span>
            <span className="text-sm text-gray-600">{getPaymentStatusMessage()}</span>
          </div>

          {trip.requiresDownPayment && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Amount Due:</span>
                    <p className="font-medium">${trip.downPaymentAmount}</p>
                  </div>
                  
                  {member.paymentMethod && (
                    <div>
                      <span className="text-gray-500">Payment Method:</span>
                      <p className="font-medium">{formatPaymentMethod(member.paymentMethod)}</p>
                    </div>
                  )}
                </div>
                
                {(member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Payment Submitted:</strong> The organizer needs to confirm your payment before you can access trip features.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Button for trips without payment */}
      {!trip.requiresDownPayment && member.rsvpStatus === 'pending' && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">Ready to Join?</h3>
              <p className="text-sm text-green-700">
                No payment required for this trip. You can confirm your attendance now.
              </p>
            </div>
            <Button 
              onClick={() => confirmAttendanceMutation.mutate()}
              disabled={confirmAttendanceMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {confirmAttendanceMutation.isPending ? 'Confirming...' : 'Confirm My Attendance'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Submission Interface for trips requiring payment */}
      {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === '' || member.paymentStatus === 'not_required') && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Submit Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-center mb-4">
                <p className="text-lg font-semibold text-gray-900">
                  Amount Due: ${trip.downPaymentAmount}
                </p>
                <p className="text-sm text-gray-600">
                  Down payment required to confirm your spot
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  {optionsLoading && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
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
                        No payment methods available. Please contact the organizer to set up payment preferences.
                      </p>
                    </div>
                  )}
                  
                  {!optionsLoading && !optionsError && settlementOptions.map((option: SettlementOption) => (
                    <div
                      key={option.method}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedMethod === option.method
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedMethod(option.method)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedMethod === option.method
                              ? 'border-orange-500 bg-orange-500'
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
                              <div className="text-sm text-orange-600">
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
                              window.open(option.paymentLink!, '_blank', 'noopener,noreferrer');
                              setHasRedirected(true);
                              setShowConfirmation(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            Open {option.method === 'venmo' ? 'Venmo' : 'PayPal'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Confirmation Screen */}
                {showConfirmation && selectedMethod !== 'cash' && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mt-4">
                    <div className="text-center space-y-3">
                      <CheckCircle className="h-8 w-8 text-orange-600 mx-auto" />
                      <div>
                        <h3 className="font-medium text-orange-900">Payment App Opened</h3>
                        <p className="text-sm text-orange-700 mt-1">
                          We opened {selectedMethod === 'venmo' ? 'Venmo' : 'PayPal'} for you to send ${trip.downPaymentAmount} to the organizer.
                        </p>
                      </div>
                      
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-600 mb-3">
                          After completing the payment in the app, click the button below to notify the organizer.
                        </p>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setShowConfirmation(false);
                              setHasRedirected(false);
                              setSelectedMethod('');
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Go Back
                          </Button>
                          <Button
                            onClick={() => {
                              submitPaymentMutation.mutate({
                                paymentMethod: selectedMethod
                              });
                            }}
                            disabled={submitPaymentMutation.isPending}
                            size="sm"
                            className="flex-1"
                          >
                            {submitPaymentMutation.isPending ? "Confirming..." : "Mark as Sent"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!showConfirmation && (
                  <Button 
                    onClick={() => {
                      if (!selectedMethod) {
                        toast({
                          title: "Payment Method Required",
                          description: "Please select a payment method.",
                          variant: "destructive"
                        });
                        return;
                      }

                      // For cash payments, proceed directly to payment submission
                      if (selectedMethod === 'cash') {
                        submitPaymentMutation.mutate({
                          paymentMethod: selectedMethod
                        });
                      } else {
                        // For Venmo/PayPal, show confirmation screen first
                        setShowConfirmation(true);
                      }
                    }}
                    disabled={!selectedMethod || submitPaymentMutation.isPending}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {submitPaymentMutation.isPending ? 'Submitting...' : 'Submit Payment'}
                  </Button>
                )}
                
                <p className="text-xs text-gray-600 text-center">
                  After submitting, the organizer will review and confirm your payment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-1">What happens next?</h3>
              <p className="text-sm text-gray-600 mb-3">
                You'll receive a notification once your RSVP is confirmed by the organizer.
              </p>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Once confirmed, you'll have access to:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Trip chat and messaging</li>
                  <li>Expense tracking and splitting</li>
                  <li>Activity planning and polls</li>
                  <li>Flight coordination</li>
                  <li>All trip management features</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Questions about your RSVP? Contact the trip organizer for assistance.
        </p>
      </div>
    </div>
  );
}