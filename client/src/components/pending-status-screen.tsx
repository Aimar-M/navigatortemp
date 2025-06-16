import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CreditCard, Clock, CheckCircle, AlertCircle, Bell, Timer, DollarSign, Check, ArrowRight, Lock, Heart, Plane, MapPin, Calendar, CalendarDays, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import Lottie from "lottie-react";
import EnhancedItineraryPreview from "@/components/enhanced-itinerary-preview";

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
    cover?: string;
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
  "nm": "Travel Animation",
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
        "r": {"a": 0, "k": 0, "ix": 10},
        "p": {
          "a": 1,
          "k": [
            {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 0, "s": [50, 100, 0]},
            {"t": 180, "s": [150, 100, 0]}
          ],
          "ix": 2
        },
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
                  "i": [[0, 0], [0, 0], [0, 0]],
                  "o": [[0, 0], [0, 0], [0, 0]],
                  "v": [[-10, 0], [10, -5], [10, 5]],
                  "c": true
                },
                "ix": 2
              }
            },
            {
              "ty": "fl",
              "c": {"a": 0, "k": [0.2, 0.5, 1, 1], "ix": 4},
              "o": {"a": 0, "k": 100, "ix": 5},
              "r": 1,
              "bm": 0,
              "nm": "Fill 1",
              "mn": "ADBE Vector Graphic - Fill",
              "hd": false
            }
          ],
          "nm": "Plane Shape",
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string | null>(null);

  // Fetch settlement options for paying the trip organizer
  const { data: settlementOptions, isLoading: optionsLoading, error: optionsError } = useQuery({
    queryKey: [`/api/trips/${trip.id}/settlement-options/${trip.organizer}`, trip.downPaymentAmount || member?.paymentAmount],
    queryFn: async () => {
      if (!trip.organizer) return [];
      
      // Build URL with amount parameter if available
      let url = `/api/trips/${trip.id}/settlement-options/${trip.organizer}`;
      const amount = trip.downPaymentAmount || member?.paymentAmount;
      if (amount) {
        url += `?amount=${amount}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch settlement options');
      return response.json();
    },
    enabled: !!trip.organizer && (!!trip.requiresDownPayment || !!member?.paymentAmount),
  });

  // Fetch trip members for the confirmed attendees section
  const { data: members } = useQuery({
    queryKey: [`/api/trips/${trip.id}/members`],
  });

  // Fetch activities preview for the trip
  const { data: activityPreview = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${trip.id}/activities/preview`],
    enabled: !!trip.id,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async ({ paymentMethod }: { paymentMethod: string }) => {
      return await apiRequest('POST', `/api/trips/${trip.id}/members/${user?.id}/payment`, { 
        paymentMethod,
        paymentAmount: trip.downPaymentAmount 
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted",
        description: "Your payment has been submitted and is pending confirmation.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip.id}/members`] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      setShowPaymentConfirmation(false);
      setPendingPaymentMethod(null);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to submit payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSubmit = (method: string) => {
    if (method === 'cash') {
      setShowPaymentConfirmation(true);
      setPendingPaymentMethod(method);
    } else {
      const option = (settlementOptions as SettlementOption[])?.find(opt => opt.method === method);
      if (option?.paymentLink) {
        window.open(option.paymentLink, '_blank');
      }
      setShowPaymentConfirmation(true);
      setPendingPaymentMethod(method);
    }
  };

  const confirmAttendanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PUT', `/api/trips/${trip.id}/members/${user?.id}/rsvp`, { 
        rsvpStatus: 'confirmed' 
      });
    },
    onSuccess: () => {
      toast({
        title: "RSVP Confirmed",
        description: "Your attendance has been confirmed! Welcome to the trip.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${trip.id}/members`] });
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
    if (trip.requiresDownPayment) {
      if (!member.paymentStatus || member.paymentStatus === 'not_required') {
        return 'Payment Required';
      } else if (member.paymentStatus === 'submitted' || member.paymentStatus === 'pending') {
        return 'Payment Pending Review';
      } else if (member.paymentStatus === 'confirmed') {
        return 'Payment Confirmed - Welcome!';
      } else if (member.paymentStatus === 'rejected') {
        return 'Payment Rejected - Try Again';
      }
    } else {
      if (member.rsvpStatus === 'pending') {
        return 'RSVP Pending';
      } else if (member.rsvpStatus === 'confirmed') {
        return 'RSVP Confirmed';
      }
    }
    return 'Status Unknown';
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
    <div className="min-h-screen" style={{ backgroundColor: '#F5F9FF' }}>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden shadow-lg" style={{ backgroundColor: '#0E4272' }}>
          {/* Trip Photo Background */}
          {(trip as any).cover && (
            <div className="absolute inset-0 z-0">
              <img 
                src={(trip as any).cover} 
                alt={`${trip.name} cover`} 
                className="w-full h-full object-cover"
              />
              {/* Dark overlay for better text readability */}
              <div className="absolute inset-0 bg-black/40"></div>
              {/* Soft edge fade masks */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent via-transparent to-black/60" 
                   style={{
                     mask: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
                     WebkitMask: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
                   }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent via-transparent to-black/60"
                   style={{
                     mask: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                     WebkitMask: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
                   }}></div>
              {/* Corner fade effects */}
              <div className="absolute inset-0"
                   style={{
                     background: 'radial-gradient(circle at top left, transparent 70%, rgba(0,0,0,0.4) 100%), radial-gradient(circle at top right, transparent 70%, rgba(0,0,0,0.4) 100%), radial-gradient(circle at bottom left, transparent 70%, rgba(0,0,0,0.4) 100%), radial-gradient(circle at bottom right, transparent 70%, rgba(0,0,0,0.4) 100%)'
                   }}></div>
            </div>
          )}
          
          {/* Hero Content */}
          <div className="relative z-10 px-8 py-16 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16">
                <Lottie 
                  animationData={travelAnimation} 
                  loop={true}
                  className="w-full h-full"
                />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
              {trip.name}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-white/90">
              {trip.destination && (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/30">
                  <MapPin className="h-4 w-4" />
                  <span>{trip.destination}</span>
                </div>
              )}
              {(trip.startDate || trip.endDate) && (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-white/30">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {trip.startDate && new Date(trip.startDate).toLocaleDateString()}
                    {trip.startDate && trip.endDate && ' - '}
                    {trip.endDate && new Date(trip.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-white/90 text-lg max-w-2xl mx-auto leading-relaxed">
              Your adventure awaits.
            </p>
          </div>
        </div>

        {/* Trip Details Card */}
        {trip.description && (
          <Card className="bg-white rounded-2xl shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-3" style={{ color: '#1A1A1A' }}>
                <Plane className="h-7 w-7" style={{ color: '#3A8DFF' }} />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed" style={{ color: '#4B5A6A' }}>{trip.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Itinerary Preview */}
        {activityPreview && activityPreview.length > 0 && (
          <EnhancedItineraryPreview
            activities={activityPreview as any[]}
            tripName={trip.name}
            className="mb-10"
          />
        )}

        {/* Main RSVP Action Section */}
        <Card className="bg-white rounded-2xl shadow-lg border-0">
          <CardContent className="p-6 space-y-6">
            {/* Status Display */}
            <div className="rounded-xl p-4 border" style={{ backgroundColor: '#F5F9FF', borderColor: '#CED6E0' }}>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Status Section */}
                <div className="flex-1">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                      <Timer className="h-4 w-4" style={{ color: '#3A8DFF' }} />
                      <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                        {trip.requiresDownPayment ? 'RSVP Status - Payment Required' : 'RSVP Status'}
                      </span>
                    </div>
                    <Badge 
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') ? '#FF9F43' : '#28A745',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      {getRSVPStatusMessage()}
                    </Badge>
                  </div>
                </div>

                {/* Payment Amount Section */}
                {trip.requiresDownPayment && (!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') && (
                  <div className="lg:flex-shrink-0 lg:border-l lg:pl-4" style={{ borderColor: '#CED6E0' }}>
                    <div className="text-center lg:text-right">
                      <div className="flex items-center justify-center lg:justify-end gap-2 mb-2">
                        <DollarSign className="h-4 w-4" style={{ color: '#3A8DFF' }} />
                        <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>Down Payment Required</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>${trip.downPaymentAmount}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            {trip.requiresDownPayment && (
              <div className="space-y-3">
                {/* Payment Method Selection */}
                {(!member.paymentStatus || member.paymentStatus === 'rejected' || member.paymentStatus === 'not_required') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 justify-center">
                      <CreditCard className="h-4 w-4" style={{ color: '#3A8DFF' }} />
                      <h4 className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Choose Payment Method</h4>
                    </div>
                      
                    {optionsLoading && (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent mr-2" style={{ borderColor: '#3A8DFF', borderTopColor: 'transparent' }}></div>
                        <span className="text-sm" style={{ color: '#4B5A6A' }}>Loading payment options...</span>
                      </div>
                    )}
                    
                    {optionsError && (
                      <div className="p-3 rounded-xl border" style={{ backgroundColor: '#FDF2F2', borderColor: '#E74C3C' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-4 w-4" style={{ color: '#E74C3C' }} />
                          <span className="font-semibold text-sm" style={{ color: '#E74C3C' }}>Failed to load payment options</span>
                        </div>
                        <p className="text-xs" style={{ color: '#4B5A6A' }}>Please try again or contact the organizer for assistance.</p>
                      </div>
                    )}
                    
                    {!optionsLoading && !optionsError && (settlementOptions as SettlementOption[]).length === 0 && (
                      <div className="p-3 rounded-xl border" style={{ backgroundColor: '#FFF8E1', borderColor: '#FF9F43' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="h-4 w-4" style={{ color: '#FF9F43' }} />
                          <span className="font-semibold text-sm" style={{ color: '#FF9F43' }}>No payment methods available</span>
                        </div>
                        <p className="text-xs" style={{ color: '#4B5A6A' }}>Please contact the organizer to set up payment preferences.</p>
                      </div>
                    )}
                      
                    {!optionsLoading && !optionsError && (settlementOptions as SettlementOption[]).map((option: SettlementOption, index: number) => (
                      <div
                        key={`${option.method}-${index}`}
                        className="border rounded-xl p-4 cursor-pointer transition-all duration-300"
                        style={{
                          borderColor: selectedMethod === option.method ? '#3A8DFF' : '#CED6E0',
                          backgroundColor: selectedMethod === option.method ? '#F5F9FF' : '#FFFFFF'
                        }}
                        onClick={() => setSelectedMethod(option.method)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                              style={{
                                borderColor: selectedMethod === option.method ? '#3A8DFF' : '#CED6E0',
                                backgroundColor: selectedMethod === option.method ? '#3A8DFF' : 'transparent'
                              }}
                            >
                              {selectedMethod === option.method && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{option.displayName}</div>
                              {option.method === 'cash' && (
                                <div className="text-xs" style={{ color: '#4B5A6A' }}>
                                  Settle in person with organizer
                                </div>
                              )}
                            </div>
                          </div>
                          {option.method !== 'cash' && (
                            <ArrowRight className="h-4 w-4" style={{ color: '#4B5A6A' }} />
                          )}
                        </div>
                      </div>
                    ))}
                      
                    {selectedMethod && !showPaymentConfirmation && (
                      <Button 
                        onClick={() => handlePaymentSubmit(selectedMethod)}
                        className="w-full py-4 text-sm font-semibold rounded-xl transition-all duration-300"
                        style={{ 
                          backgroundColor: '#3A8DFF',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Submit Payment via {formatPaymentMethod(selectedMethod)}
                        </div>
                      </Button>
                    )}
                    
                    {/* Payment Confirmation Dialog */}
                    {showPaymentConfirmation && pendingPaymentMethod && (
                      <div className="p-4 rounded-xl border" style={{ backgroundColor: '#F5F9FF', borderColor: '#3A8DFF' }}>
                        <div className="text-center space-y-3">
                          <div 
                            className="flex items-center justify-center w-12 h-12 rounded-full mx-auto border"
                            style={{ backgroundColor: '#3A8DFF', borderColor: '#3A8DFF' }}
                          >
                            <CheckCircle className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
                            Complete Your Payment
                          </h3>
                          <p className="text-sm" style={{ color: '#4B5A6A' }}>
                            {pendingPaymentMethod === 'cash' 
                              ? 'Please arrange to pay the organizer in person, then mark as paid below.'
                              : `Please complete your payment on the ${formatPaymentMethod(pendingPaymentMethod)} page that opened, then confirm below.`
                            }
                          </p>
                          
                          <div className="flex gap-3">
                            <Button 
                              onClick={() => {
                                setShowPaymentConfirmation(false);
                                setPendingPaymentMethod(null);
                              }}
                              variant="outline"
                              className="flex-1 py-3 text-sm"
                              style={{ 
                                backgroundColor: 'white',
                                borderColor: '#CED6E0',
                                color: '#4B5A6A'
                              }}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => {
                                submitPaymentMutation.mutate({ paymentMethod: pendingPaymentMethod });
                              }}
                              disabled={submitPaymentMutation.isPending}
                              className="flex-1 py-3 text-sm"
                              style={{ 
                                backgroundColor: '#28A745',
                                color: 'white',
                                border: 'none'
                              }}
                            >
                              {submitPaymentMutation.isPending ? (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  Submitting...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4" />
                                  Mark as Paid
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* RSVP Confirmation for trips without payment */}
            {!trip.requiresDownPayment && (
              <div className="text-center">
                <Button 
                  onClick={() => confirmAttendanceMutation.mutate()}
                  disabled={confirmAttendanceMutation.isPending}
                  className="w-full py-4 text-sm font-semibold transition-all duration-300 rounded-xl"
                  style={{ 
                    backgroundColor: '#3A8DFF',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {confirmAttendanceMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Confirming Attendance...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Confirm Attendance
                    </div>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmed Attendees */}
        <Card className="bg-white rounded-2xl shadow-lg border-0 mb-10">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-3" style={{ color: '#1A1A1A' }}>
              <CheckCircle className="h-7 w-7" style={{ color: '#3A8DFF' }} />
              Confirmed Attendees
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(members) && members.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(members as any[])
                  .filter((member: any) => member.status === 'confirmed' || member.userId === trip.organizer)
                  .map((member: any) => (
                    <div key={member.userId} className="inline-flex items-center gap-2 rounded-full px-3 py-2 border" style={{ backgroundColor: '#F5F9FF', borderColor: '#CED6E0' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3A8DFF' }}>
                        <span className="text-white font-bold text-xs">
                          {member.user?.name ? member.user.name.charAt(0).toUpperCase() : member.user?.username?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="font-medium text-sm" style={{ color: '#1A1A1A' }}>
                        {member.user?.name || member.user?.username || 'Anonymous'}
                      </span>
                      {member.userId === trip.organizer ? (
                        <Badge className="text-xs px-2 py-0.5 border-0" style={{ backgroundColor: '#FF9F43', color: 'white' }}>
                          Organizer
                        </Badge>
                      ) : (
                        <span className="text-xs font-medium" style={{ color: '#28A745' }}>✓</span>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-3" style={{ color: '#4B5A6A' }} />
                <div className="text-lg" style={{ color: '#4B5A6A' }}>
                  No confirmed attendees yet. Be the first to join!
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What Happens Next Section */}
        <Card className="mb-10 bg-white rounded-2xl shadow-lg border-0">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-xl border" style={{ backgroundColor: '#3A8DFF', borderColor: '#3A8DFF' }}>
                  <Bell className="h-6 w-6 md:h-8 md:w-8 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight" style={{ color: '#1A1A1A' }}>What happens next?</h3>
                <p className="text-lg mb-6 leading-relaxed" style={{ color: '#4B5A6A' }}>
                  You'll receive a notification once your RSVP is confirmed by the organizer. 
                  This exciting adventure is just getting started!
                </p>
                
                <div className="rounded-2xl p-6 border shadow-lg" style={{ backgroundColor: '#F5F9FF', borderColor: '#CED6E0' }}>
                  <h4 className="font-bold text-xl mb-4 flex items-center gap-3" style={{ color: '#1A1A1A' }}>
                    <Lock className="h-6 w-6" style={{ color: '#3A8DFF' }} />
                    Once confirmed, you'll unlock:
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 font-medium">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#28A745' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>Trip chat and messaging</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#28A745' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>Expense tracking and splitting</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#28A745' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>Activity planning and polls</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#28A745' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>Flight coordination</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#28A745' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>All trip management features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#28A745' }} />
                      <span className="font-medium" style={{ color: '#1A1A1A' }}>Real-time updates and notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-full shadow-lg border transition-all duration-300" style={{ borderColor: '#CED6E0' }}>
            <Heart className="h-6 w-6" style={{ color: '#E74C3C' }} />
            <span className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Questions? Contact the trip organizer for assistance.</span>
          </div>
        </div>
      </div>
    </div>
  );
}