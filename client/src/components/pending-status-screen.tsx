import { Clock, CreditCard, AlertCircle, Bell, MapPin, Calendar, Users, DollarSign, Activity, Check, CheckCircle, Plane, Heart, Star, Eye, Lock, ArrowRight, Timer, HandHeart } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 animate-pulse">
              <Timer className="h-10 w-10 text-white" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              {trip.name}
            </h1>
            
            {trip.destination && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="h-5 w-5" />
                <span className="text-xl font-medium">{trip.destination}</span>
              </div>
            )}
            
            {trip.startDate && trip.endDate && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <Calendar className="h-5 w-5" />
                <span className="text-lg">
                  {new Date(trip.startDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} - {new Date(trip.endDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            )}
            
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/90 backdrop-blur-sm rounded-full text-yellow-900 font-semibold">
              <Timer className="h-5 w-5" />
              <span>RSVP Pending</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Trip Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {trip.startDate && trip.endDate && (
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-sm text-gray-600">Days</div>
              </CardContent>
            </Card>
          )}
          
          {tripMembers && (
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {tripMembers.filter((m: any) => m.rsvpStatus === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Confirmed</div>
              </CardContent>
            </Card>
          )}
          
          {activities && activities.length > 0 && (
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {activities.length}
                </div>
                <div className="text-sm text-gray-600">Activities</div>
              </CardContent>
            </Card>
          )}
          
          {budgetSummary && (
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${budgetSummary.totalBudget || '0'}
                </div>
                <div className="text-sm text-gray-600">Budget</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Trip Preview Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Trip Description & Activities Preview */}
          <div className="space-y-6">
            {/* Trip Description */}
            {trip.description && (
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    About This Trip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{trip.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Activities Preview */}
            {activities && activities.length > 0 && (
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Planned Activities
                    <div className="ml-auto flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      <Eye className="h-4 w-4" />
                      Preview
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.slice(0, 3).map((activity: any, index: number) => (
                      <div key={activity.id} className="relative p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-gray-900 mb-1">{activity.name}</h4>
                            {activity.description && (
                              <p className="text-sm text-gray-600 mb-2 leading-relaxed">{activity.description}</p>
                            )}
                            {activity.date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700">
                                  {new Date(activity.date).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {activities.length > 3 && (
                      <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Lock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">
                          +{activities.length - 3} more activities
                        </p>
                        <p className="text-xs text-gray-500">Join to unlock full itinerary</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Organizer & Members */}
          <div className="space-y-6">
            {/* Trip Organizer */}
            {tripMembers && tripMembers.find((m: any) => m.userId === trip.organizer) && (
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Trip Organizer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const organizer = tripMembers.find((m: any) => m.userId === trip.organizer);
                    return organizer ? (
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                          {organizer.user?.name?.[0] || organizer.user?.username?.[0] || '?'}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {organizer.user?.name || organizer.user?.username || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-600">Trip organizer & host</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-gray-500">Planning your adventure</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Trip Members Preview */}
            {tripMembers && tripMembers.length > 0 && (
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    Fellow Travelers
                    <Badge variant="secondary" className="ml-auto">
                      {tripMembers.filter((m: any) => m.rsvpStatus === 'confirmed').length} confirmed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tripMembers.slice(0, 4).map((member: any) => (
                      <div key={member.userId} className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100 hover:border-green-200 transition-colors">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                          {member.user?.name?.[0] || member.user?.username?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {member.user?.name || member.user?.username || 'Unknown User'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={member.rsvpStatus === 'confirmed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {member.rsvpStatus === 'confirmed' ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Confirmed
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </div>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tripMembers.length > 4 && (
                      <div className="text-center py-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Users className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm font-medium text-gray-600">
                          +{tripMembers.length - 4} more travelers
                        </p>
                        <p className="text-xs text-gray-500">Join to see everyone</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Budget Preview */}
            {budgetSummary && (
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Budget Overview
                    <div className="ml-auto flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                      <Eye className="h-4 w-4" />
                      Preview
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        ${budgetSummary.totalExpenses || 0}
                      </div>
                      <div className="text-sm text-green-700 font-medium">Total Planned</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        ${Math.round((budgetSummary.totalExpenses || 0) / (tripMembers?.filter((m: any) => m.rsvpStatus === 'confirmed').length || 1))}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">Per Person</div>
                    </div>
                  </div>
                  {budgetSummary.categories && budgetSummary.categories.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Budget Categories
                      </h4>
                      <div className="space-y-2">
                        {budgetSummary.categories.slice(0, 3).map((category: any) => (
                          <div key={category.name} className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{category.name}</span>
                            <span className="text-sm font-bold text-gray-900">${category.amount}</span>
                          </div>
                        ))}
                        {budgetSummary.categories.length > 3 && (
                          <div className="text-center py-2 bg-gray-100 rounded-lg border-2 border-dashed border-gray-200">
                            <Lock className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs font-medium text-gray-600">
                              +{budgetSummary.categories.length - 3} more categories
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
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