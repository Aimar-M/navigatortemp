import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, Calendar, Users, DollarSign, CheckCircle, 
  AlertCircle, Clock, Bell, Lock, Heart, User, UserPlus, Plane 
} from "lucide-react";
import { format } from "date-fns";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";
import navigatorText from "@assets/ab_Navigator2-09_1749673915685.png";
import Lottie from "lottie-react";
import EnhancedItineraryPreview from "@/components/enhanced-itinerary-preview";

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
        "o": {"a": 0, "k": 100},
        "r": {"a": 0, "k": 0},
        "p": {
          "a": 1,
          "k": [
            {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 0, "s": [100, 100, 0]},
            {"i": {"x": 0.833, "y": 0.833}, "o": {"x": 0.167, "y": 0.167}, "t": 90, "s": [120, 80, 0]},
            {"t": 180, "s": [100, 100, 0]}
          ]
        },
        "a": {"a": 0, "k": [0, 0, 0]},
        "s": {"a": 0, "k": [100, 100, 100]}
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "rc",
              "d": 1,
              "s": {"a": 0, "k": [20, 4]},
              "p": {"a": 0, "k": [0, 0]},
              "r": {"a": 0, "k": 2}
            },
            {
              "ty": "fl",
              "c": {"a": 0, "k": [1, 1, 1, 1]},
              "o": {"a": 0, "k": 100}
            }
          ]
        }
      ],
      "ip": 0,
      "op": 180,
      "st": 0
    }
  ]
};

interface InvitationData {
  invitation: {
    id: number;
    token: string;
    expiresAt: string | null;
  };
  trip: {
    id: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    description: string;
    requiresDownPayment: boolean;
    downPaymentAmount: number;
    cover?: string;
    organizer: {
      id: number;
      name: string;
      username: string;
    };
  };
  activities: Array<{
    id: number;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
  }>;
  members: Array<{
    userId: number;
    status: string;
    user: {
      id: number;
      name: string;
      username: string;
    };
  }>;
}

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();

  const { data: invitationData, isLoading, error } = useQuery<InvitationData>({
    queryKey: [`/api/invite/${token}`],
    enabled: !!token,
  });

  // Fetch activities preview for the trip
  const { data: activityPreview = [] } = useQuery<any[]>({
    queryKey: [`/api/trips/${invitationData?.trip.id}/activities/preview`],
    enabled: !!invitationData?.trip.id,
  });


  const handleSignUpRedirect = () => {
    // Store the invitation token for after authentication
    localStorage.setItem('pendingInvitation', token || '');
    setLocation('/register');
  };

  const handleSignInRedirect = () => {
    // Store the invitation token for after authentication
    localStorage.setItem('pendingInvitation', token || '');
    setLocation('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Invitation</h1>
            <p className="text-white/80 mb-6">
              This invitation link is invalid, expired, or has been deactivated.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full bg-white/20 border border-white/30 text-white hover:bg-white/30"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { trip, members } = invitationData;
  const confirmedMembers = members?.filter(member => 
    member.status === 'confirmed' || member.userId === trip.organizer.id
  ) || [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F9FF' }}>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Navigator Branding */}
        <div className="flex items-center mb-8">
          <img 
            src={navigatorLogo} 
            alt="Navigator Logo" 
            className="h-8 w-8 mr-2"
          />
          <img 
            src={navigatorText} 
            alt="Navigator" 
            className="h-6"
          />
        </div>
        
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden shadow-lg mb-8" style={{ backgroundColor: '#0E4272' }}>
          {/* Trip Photo Background */}
          {trip.cover && (
            <div className="absolute inset-0 z-0">
              <img 
                src={trip.cover} 
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
                     background: 'radial-gradient(ellipse at center, transparent 40%, black 100%)',
                     opacity: 0.3
                   }}></div>
            </div>
          )}
          
          {/* Subtle Lottie Animation */}
          <div className="absolute top-0 right-2 sm:right-4 md:right-8 opacity-30 z-10">
            <Lottie 
              animationData={travelAnimation} 
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32"
              loop={true}
              autoplay={true}
            />
          </div>
          
          {/* Hero Content */}
          <div className="relative z-10 px-4 sm:px-8 py-8 sm:py-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16">
                <Lottie 
                  animationData={travelAnimation} 
                  loop={true}
                  className="w-full h-full"
                />
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight drop-shadow-lg">
              You're Invited!
            </h1>
            
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 inline-block shadow-2xl border border-white/30 mx-auto max-w-lg">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
                {trip.name}
              </h2>
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-white/90 text-sm sm:text-base">
                {trip.destination && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.destination}</span>
                  </div>
                )}
                {(trip.startDate || trip.endDate) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {trip.startDate && format(new Date(trip.startDate), 'MMM d')}
                      {trip.startDate && trip.endDate && ' - '}
                      {trip.endDate && format(new Date(trip.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trip Organizer */}
        <Card className="mb-8 bg-white rounded-2xl shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-3" style={{ color: '#1A1A1A' }}>
              <User className="h-7 w-7" style={{ color: '#3A8DFF' }} />
              Trip Organizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#FF9F43' }}>
                <span className="text-white font-bold text-lg">
                  {trip.organizer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-semibold text-lg" style={{ color: '#1A1A1A' }}>{trip.organizer.name}</div>
                <div style={{ color: '#4B5A6A' }}>@{trip.organizer.username}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Trip Itinerary Preview with Day View */}
        {activityPreview && activityPreview.length > 0 && (
          <EnhancedItineraryPreview 
            activities={activityPreview as any[]}
            tripName={trip.name}
            className="mb-8"
          />
        )}

        {/* Payment Information */}
        {trip.requiresDownPayment && (
          <Card className="mb-8 bg-white rounded-2xl shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-3" style={{ color: '#1A1A1A' }}>
                <DollarSign className="h-7 w-7" style={{ color: '#3A8DFF' }} />
                Payment Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="rounded-xl p-4 border" style={{ backgroundColor: '#F5F9FF', borderColor: '#CED6E0' }}>
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Payment Info Section */}
                  <div className="flex-1">
                    <div className="text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <DollarSign className="h-4 w-4" style={{ color: '#3A8DFF' }} />
                        <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>Down Payment Required</span>
                      </div>
                      <p className="text-xs mb-3 leading-relaxed" style={{ color: '#4B5A6A' }}>
                        A down payment is required to secure your spot on this trip.
                      </p>
                    </div>
                  </div>

                  {/* Payment Amount Section */}
                  <div className="lg:flex-shrink-0 lg:border-l lg:pl-4" style={{ borderColor: '#CED6E0' }}>
                    <div className="text-center lg:text-right">
                      <div className="flex items-center justify-center lg:justify-end gap-2 mb-2">
                        <DollarSign className="h-4 w-4" style={{ color: '#3A8DFF' }} />
                        <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>Amount Due</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>${trip.downPaymentAmount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmed Attendees */}
        <Card className="mb-8 bg-white rounded-2xl shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold flex items-center gap-3" style={{ color: '#1A1A1A' }}>
              <CheckCircle className="h-7 w-7" style={{ color: '#3A8DFF' }} />
              Confirmed Attendees ({confirmedMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confirmedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {confirmedMembers.map((member) => (
                  <div key={member.userId} className="inline-flex items-center gap-2 rounded-full px-4 py-2 border shadow-lg" style={{ backgroundColor: '#F5F9FF', borderColor: '#CED6E0' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#3A8DFF' }}>
                      <span className="text-white font-bold text-xs">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                      {member.user.name}
                    </span>
                    {member.userId === trip.organizer.id ? (
                      <Badge className="text-xs px-2 py-0.5 shadow-sm border-0" style={{ backgroundColor: '#FF9F43', color: 'white' }}>
                        Organizer
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4" style={{ color: '#27AE60' }} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-lg" style={{ color: '#4B5A6A' }}>
                  No confirmed attendees yet. Be the first to join!
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RSVP Action Section */}
        <Card className="mb-8 bg-white rounded-2xl shadow-lg border-0 overflow-hidden">
          <div className="p-6 text-center" style={{ backgroundColor: '#3A8DFF' }}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 shadow-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Join This Trip
            </h2>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Button 
                onClick={handleSignUpRedirect}
                className="w-full py-4 text-base font-semibold text-white transform hover:scale-105 transition-all duration-300 shadow-md rounded-xl border-0"
                style={{ backgroundColor: '#0E4272' }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account & Join
              </Button>
              
              <Button 
                onClick={handleSignInRedirect}
                variant="outline"
                className="w-full py-4 text-base font-semibold rounded-xl border-2 hover:bg-opacity-10 transition-all duration-300"
                style={{ borderColor: '#0E4272', color: '#0E4272' }}
              >
                <User className="h-4 w-4 mr-2" />
                Sign In & Join
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-full shadow-lg border-0 transition-all duration-300">
            <Heart className="h-6 w-6" style={{ color: '#FF9F43' }} />
            <span className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Questions? Contact {trip.organizer.name} for assistance.</span>
          </div>
        </div>
      </div>
    </div>
  );
}