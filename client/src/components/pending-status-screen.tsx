import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CreditCard, Clock, CheckCircle, AlertCircle, Bell, Timer, DollarSign, Check, ArrowRight, Lock, Heart, Plane, MapPin, Calendar, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import Lottie from "lottie-react";

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

// Simple travel-themed Lottie animation data
const travelAnimation: any = {
  "v": "5.5.7",
  "fr": 60,
  "ip": 0,
  "op": 180,
  "w": 200,
  "h": 200,
  "nm": "Travel Adventure",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Plane",
      "sr": 1,
      "ks": {
        "o": {"a": 0, "k": 100, "ix": 11},
        "r": {"a": 1, "k": [
          {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 0, "s": [0]},
          {"i": {"x": [0.833], "y": [0.833]}, "o": {"x": [0.167], "y": [0.167]}, "t": 90, "s": [5]},
          {"t": 180, "s": [0]}
        ], "ix": 10},
        "p": {"a": 1, "k": [
          {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 0, "s": [50, 100, 0]},
          {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 90, "s": [150, 80, 0]},
          {"t": 180, "s": [250, 100, 0]}
        ], "ix": 2},
        "a": {"a": 0, "k": [0, 0, 0], "ix": 1},
        "s": {"a": 0, "k": [100, 100, 100], "ix": 6}
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ind": 0,
              "ty": "sh",
              "ix": 1,
              "ks": {
                "a": 0,
                "k": {
                  "i": [[0,0],[0,0],[0,0],[0,0]],
                  "o": [[0,0],[0,0],[0,0],[0,0]],
                  "v": [[-15,-5],[15,-5],[10,5],[-10,5]],
                  "c": true
                },
                "ix": 2
              },
              "nm": "Path 1",
              "mn": "ADBE Vector Shape - Group",
              "hd": false
            },
            {
              "ty": "fl",
              "c": {"a": 0, "k": [0, 0.4, 1, 1], "ix": 4},
              "o": {"a": 0, "k": 100, "ix": 5},
              "r": 1,
              "bm": 0,
              "nm": "Fill 1",
              "mn": "ADBE Vector Graphic - Fill",
              "hd": false
            }
          ],
          "nm": "Plane Body",
          "np": 2,
          "cix": 2,
          "bm": 0,
          "ix": 1,
          "mn": "ADBE Vector Group",
          "hd": false
        }
      ],
      "ip": 0,
      "op": 180,
      "st": 0,
      "bm": 0
    }
  ],
  "markers": []
};

export default function PendingStatusScreen({ trip, member }: PendingStatusScreenProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);

  // Fetch payment options
  const { data: settlementOptions = [], isLoading: optionsLoading, error: optionsError } = useQuery<SettlementOption[]>({
    queryKey: [`/api/trips/${trip.id}/settlement-options/${trip.organizer}?amount=${trip.downPaymentAmount || 0}`],
    enabled: !!trip.requiresDownPayment && !!trip.organizer,
  });

  // Fetch activities for itinerary preview
  const { data: activities = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${trip.id}/activities`],
    enabled: !!trip.id,
  });

  // Fetch trip members for confirmed attendees list
  const { data: members = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${trip.id}/members`],
    enabled: !!trip.id,
  });

  // Handle initial payment submission (opens link and shows confirmation)
  const handlePaymentSubmit = (paymentMethod: string) => {
    const selectedOption = settlementOptions.find(opt => opt.method === paymentMethod);
    
    // For Venmo and PayPal, open the payment link first
    if (selectedOption?.paymentLink && (paymentMethod === 'venmo' || paymentMethod === 'paypal')) {
      window.open(selectedOption.paymentLink, '_blank');
    }
    
    // Show confirmation dialog and store the payment method
    setPendingPaymentMethod(paymentMethod);
    setShowPaymentConfirmation(true);
  };

  // Submit payment mutation (only called after user confirms)
  const submitPaymentMutation = useMutation({
    mutationFn: async (data: { paymentMethod: string }) => {
      return await apiRequest('POST', `/api/trips/${trip.id}/members/${user?.id}/payment`, data);
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted for organizer review.",
      });
      setShowPaymentConfirmation(false);
      setPendingPaymentMethod(null);
      setSelectedMethod(null);
      queryClient.invalidateQueries({ queryKey: ['/api/trips', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', trip.id, 'members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
      setShowPaymentConfirmation(false);
      setPendingPaymentMethod(null);
    },
  });

  // Confirm attendance mutation (for trips without payment)
  const confirmAttendanceMutation = useMutation({
    mutationFn: async () => {
      // For trips without down payment, update both rsvpStatus and status to 'confirmed'
      await apiRequest('PUT', `/api/trips/${trip.id}/members/${user?.id}/rsvp`, { rsvpStatus: 'confirmed' });
      return await apiRequest('PUT', `/api/trips/${trip.id}/members/${user?.id}`, { status: 'confirmed' });
    },
    onSuccess: () => {
      toast({
        title: "RSVP Confirmed",
        description: "Your attendance has been confirmed!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', trip.id, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
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
    <div className="min-h-screen relative overflow-hidden" style={{
      background: '#1a3cff'
    }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.024) 0%, rgba(255,255,255,0.072) 100%)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='15' cy='15' r='1'/%3E%3Ccircle cx='45' cy='45' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto p-6 space-y-10">
        {/* Hero Section */}
        <div className="text-center py-8 relative">
          {/* Subtle Lottie Animation */}
          <div className="absolute top-0 right-8 opacity-30">
            <Lottie 
              animationData={travelAnimation} 
              className="w-32 h-32"
              loop={true}
              autoplay={true}
            />
          </div>
          
          <div className="relative z-20">
            <div className="flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-8 shadow-2xl border border-white/30">
              <Plane className="h-12 w-12 text-white" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              {trip.name}
            </h1>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
              {trip.destination && (
                <div className="flex items-center gap-2 text-white/90 text-xl">
                  <MapPin className="h-6 w-6" />
                  <span className="font-medium">{trip.destination}</span>
                </div>
              )}
              {(trip.startDate || trip.endDate) && (
                <div className="flex items-center gap-2 text-white/80 text-lg">
                  <Calendar className="h-5 w-5" />
                  <span>
                    {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
                    {trip.startDate && trip.endDate && ' - '}
                    {trip.endDate && new Date(trip.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
              Your adventure awaits.
            </p>
          </div>
        </div>

        {/* Trip Details Card with Glassmorphism */}
        {trip.description && (
          <div className="mb-10">
            <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:bg-white/15">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <Plane className="h-7 w-7 text-blue-200" />
                  About This Adventure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 text-lg leading-relaxed font-medium">{trip.description}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trip Itinerary Preview - Only show if activities exist */}
        {activities && activities.length > 0 && (
          <div className="mb-10">
            <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:bg-white/15">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  <CalendarDays className="h-7 w-7 text-blue-200" />
                  Trip Itinerary Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(activities as any[])
                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 3) // Show first 3 activities for preview
                  .map((activity: any) => (
                    <div key={activity.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-lg mb-2">{activity.name}</h4>
                          {activity.description && (
                            <p className="text-white/70 text-sm mb-3 leading-relaxed">{activity.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2 text-blue-200">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(activity.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}</span>
                            </div>
                            {activity.location && (
                              <div className="flex items-center gap-2 text-blue-200">
                                <MapPin className="h-4 w-4" />
                                <span>{activity.location}</span>
                              </div>
                            )}
                            {activity.duration && (
                              <div className="flex items-center gap-2 text-blue-200">
                                <Clock className="h-4 w-4" />
                                <span>{activity.duration}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {activity.cost && parseFloat(activity.cost) > 0 && (
                          <div className="bg-green-500/20 backdrop-blur-sm px-3 py-2 rounded-full border border-green-400/30">
                            <span className="text-green-300 font-semibold">${parseFloat(activity.cost).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                
                {activities.length > 3 && (
                  <div className="text-center pt-4">
                    <div className="text-white/60 text-sm">
                      And {activities.length - 3} more activities planned...
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main RSVP Action Section with Glassmorphism */}
        <div className="mb-10">
          <Card className="bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-white/5 to-white/10 p-8 text-center border-b border-white/20">
              <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-6 shadow-xl border border-white/30">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') 
                  ? 'Complete Your RSVP' 
                  : 'RSVP Status'}
              </h2>
              <p className="text-white/80 text-lg max-w-lg mx-auto leading-relaxed">
                {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required')
                  ? `Secure your spot with a $${trip.downPaymentAmount} down payment and join this incredible journey.`
                  : 'Your RSVP is being reviewed by the trip organizer.'
                }
              </p>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Current Status Display with Blue Theme */}
              <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-300/30">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Timer className="h-5 w-5 text-blue-200" />
                      <span className="font-bold text-white">RSVP Status</span>
                    </div>
                    <Badge className={`${getStatusColor()} text-sm px-4 py-2 rounded-full font-semibold`}>
                      {getRSVPStatusMessage()}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <CreditCard className="h-5 w-5 text-green-300" />
                      <span className="font-bold text-white">Payment Status</span>
                    </div>
                    <div className="text-sm font-bold text-white bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                      {getPaymentStatusMessage()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information with Enhanced Blue Styling */}
              {trip.requiresDownPayment && (
                <div className="space-y-4">
                  {/* Hide payment amount display after submission */}
                  {(!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') && (
                    <>
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <DollarSign className="h-6 w-6 text-blue-200" />
                        <h3 className="text-xl font-bold text-white">Down Payment Required</h3>
                      </div>
                      
                      <div className="relative p-6 bg-gradient-to-br from-blue-500/30 to-indigo-600/30 backdrop-blur-md rounded-2xl border border-blue-300/40 shadow-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
                        <div className="relative z-10 text-center">
                          <div className="text-4xl font-bold text-white mb-1">${trip.downPaymentAmount}</div>
                          <div className="text-blue-100 font-medium">Investment in your adventure</div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Enhanced Payment Submission Form */}
                  {(!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') && (
                    <div className="space-y-4">
                      <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 justify-center">
                          <CreditCard className="h-5 w-5 text-blue-200" />
                          <h4 className="text-lg font-bold text-white">Choose Payment Method</h4>
                        </div>
                        
                        {optionsLoading && (
                          <div className="flex flex-col items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-300 border-t-white mb-3"></div>
                            <span className="text-white/80 font-medium">Loading payment options...</span>
                          </div>
                        )}
                        
                        {optionsError && (
                          <div className="bg-red-500/20 backdrop-blur-sm border border-red-300/30 p-4 rounded-2xl">
                            <div className="flex items-center gap-3 mb-2">
                              <AlertCircle className="h-5 w-5 text-red-300" />
                              <span className="font-bold text-red-100">Failed to load payment options</span>
                            </div>
                            <p className="text-red-200 text-sm">Please try again or contact the organizer for assistance.</p>
                          </div>
                        )}
                        
                        {!optionsLoading && !optionsError && (settlementOptions as SettlementOption[]).length === 0 && (
                          <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-300/30 p-4 rounded-2xl">
                            <div className="flex items-center gap-3 mb-2">
                              <AlertCircle className="h-5 w-5 text-yellow-300" />
                              <span className="font-bold text-yellow-100">No payment methods available</span>
                            </div>
                            <p className="text-yellow-200 text-sm">Please contact the organizer to set up payment preferences.</p>
                          </div>
                        )}
                        
                        {!optionsLoading && !optionsError && (settlementOptions as SettlementOption[]).map((option: SettlementOption, index: number) => (
                          <div
                            key={`${option.method}-${index}`}
                            className={`border-2 rounded-2xl p-4 cursor-pointer transition-all duration-500 hover:shadow-xl hover:scale-105 ${
                              selectedMethod === option.method
                                ? 'border-blue-400 bg-blue-500/20 backdrop-blur-sm shadow-xl'
                                : 'border-white/30 bg-white/10 backdrop-blur-sm hover:border-blue-400/50'
                            }`}
                            onClick={() => setSelectedMethod(option.method)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full border-3 flex items-center justify-center transition-all duration-300 ${
                                  selectedMethod === option.method
                                    ? 'border-blue-400 bg-blue-500 shadow-lg'
                                    : 'border-white/50'
                                }`}>
                                  {selectedMethod === option.method && (
                                    <Check className="h-5 w-5 text-white font-bold" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-lg">{option.displayName}</div>
                                  {option.method === 'cash' && (
                                    <div className="text-blue-200 text-sm">
                                      Settle in person with organizer
                                    </div>
                                  )}
                                </div>
                              </div>
                              {option.method !== 'cash' && (
                                <ArrowRight className="h-6 w-6 text-blue-200" />
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {selectedMethod && !showPaymentConfirmation && (
                          <Button 
                            onClick={() => handlePaymentSubmit(selectedMethod)}
                            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-500 shadow-2xl rounded-2xl border border-blue-400/30"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5" />
                              Submit Payment via {formatPaymentMethod(selectedMethod)}
                            </div>
                          </Button>
                        )}
                        
                        {/* Payment Confirmation Dialog */}
                        {showPaymentConfirmation && pendingPaymentMethod && (
                          <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-300/30 p-6 rounded-2xl">
                            <div className="text-center space-y-4">
                              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/30 backdrop-blur-sm rounded-full mx-auto mb-4 border border-blue-300/40">
                                <CheckCircle className="h-8 w-8 text-blue-200" />
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-2">
                                Complete Your Payment
                              </h3>
                              <p className="text-blue-200 text-lg mb-6">
                                {pendingPaymentMethod === 'cash' 
                                  ? 'Please arrange to pay the organizer in person, then mark as paid below.'
                                  : `Please complete your payment on the ${formatPaymentMethod(pendingPaymentMethod)} page that opened, then confirm below.`
                                }
                              </p>
                              
                              <div className="flex gap-4">
                                <Button 
                                  onClick={() => {
                                    setShowPaymentConfirmation(false);
                                    setPendingPaymentMethod(null);
                                  }}
                                  variant="outline"
                                  className="flex-1 py-4 text-lg bg-white/10 border-white/30 text-white hover:bg-white/20"
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => {
                                    submitPaymentMutation.mutate({ paymentMethod: pendingPaymentMethod });
                                  }}
                                  disabled={submitPaymentMutation.isPending}
                                  className="flex-1 py-4 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                >
                                  {submitPaymentMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                      Submitting...
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <Check className="h-5 w-5" />
                                      Mark as Paid
                                    </div>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Payment Status Messages */}
                  {(member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') && (
                    <div className="bg-amber-500/20 backdrop-blur-sm border border-amber-300/30 p-6 rounded-2xl">
                      <div className="flex items-center gap-3 mb-3">
                        <Clock className="h-6 w-6 text-amber-300" />
                        <span className="font-bold text-amber-100 text-lg">Payment Submitted</span>
                      </div>
                      <p className="text-amber-200 leading-relaxed">
                        Your payment has been submitted and is awaiting organizer confirmation.
                        <br /><strong>Next Step:</strong> The organizer needs to confirm your payment before you can access trip features.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Enhanced RSVP Confirmation for trips without payment */}
              {!trip.requiresDownPayment && (
                <div className="text-center">
                  <Button 
                    onClick={() => confirmAttendanceMutation.mutate()}
                    disabled={confirmAttendanceMutation.isPending}
                    className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-500 shadow-2xl rounded-2xl border border-blue-400/30"
                  >
                    {confirmAttendanceMutation.isPending ? (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                        Confirming Attendance...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
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

        {/* Confirmed Attendees */}
        <div className="mb-10">
          <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:bg-white/15">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-blue-200" />
                Confirmed Attendees
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(members as any[])
                    .filter((member: any) => member.status === 'confirmed' || member.userId === trip.organizer)
                    .map((member: any) => (
                      <div key={member.userId} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            {member.user?.name ? member.user.name.charAt(0).toUpperCase() : member.user?.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="text-white font-medium text-sm">
                          {member.user?.name || member.user?.username || 'Anonymous'}
                        </span>
                        {member.userId === trip.organizer ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-xs px-2 py-0.5">
                            Organizer
                          </Badge>
                        ) : (
                          <span className="text-green-300 text-xs font-medium">✓</span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-white/60 text-lg">
                    No confirmed attendees yet. Be the first to join!
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced What Happens Next Section */}
        <Card className="mb-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-xl border border-white/30">
                  <Bell className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">What happens next?</h3>
                <p className="text-white/80 text-lg mb-6 leading-relaxed">
                  You'll receive a notification once your RSVP is confirmed by the organizer. 
                  This exciting adventure is just getting started!
                </p>
                
                <div className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-300/30">
                  <h4 className="font-bold text-white text-xl mb-4 flex items-center gap-3">
                    <Lock className="h-6 w-6 text-blue-300" />
                    Once confirmed, you'll unlock:
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-white/90">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="font-medium">Trip chat and messaging</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="font-medium">Expense tracking and splitting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="font-medium">Activity planning and polls</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="font-medium">Flight coordination</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="font-medium">All trip management features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="font-medium">Real-time updates and notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white/15 backdrop-blur-md rounded-full shadow-2xl border border-white/30 hover:bg-white/20 transition-all duration-300">
            <Heart className="h-6 w-6 text-red-400" />
            <span className="text-white font-bold text-lg">Questions? Contact the trip organizer for assistance.</span>
          </div>
        </div>
      </div>
    </div>
  );
}