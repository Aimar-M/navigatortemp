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
import navigatorLogo from "@/assets/navigator-logo.svg";
import Lottie from "lottie-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.024] to-white/[0.072] opacity-50"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigator Branding */}
        <div className="flex items-center mb-8">
          <img 
            src={navigatorLogo} 
            alt="Navigator Logo" 
            className="h-8 w-8 mr-2"
          />
          <h1 className="text-2xl font-bold text-white">Navigator</h1>
        </div>
        
        {/* Hero Section */}
        <div className="text-center py-8 relative overflow-hidden mb-8">
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
          
          <div className="relative z-20">
            {/* Translucent backdrop behind content for readability */}
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6 md:p-8 mx-2 sm:mx-4 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-4 sm:mb-6 md:mb-8 shadow-2xl border border-white/30 overflow-hidden animate-bounce" style={{animationDuration: '3s', animationIterationCount: 'infinite'}}>
                <Plane className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                {trip.name}
              </h1>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-white/90 text-xl">
                  <MapPin className="h-6 w-6 drop-shadow-md" />
                  <span className="font-medium drop-shadow-md">{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-lg">
                  <Calendar className="h-5 w-5 drop-shadow-md" />
                  <span className="drop-shadow-md">
                    {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/80 text-lg">
                  <Users className="h-5 w-5 drop-shadow-md" />
                  <span className="drop-shadow-md">{confirmedMembers.length} confirmed</span>
                </div>
              </div>
              
              {trip.description && (
                <p className="text-white/70 text-lg max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                  {trip.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trip Organizer */}
        <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <User className="h-7 w-7 text-blue-200" />
              Trip Organizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border border-white/30">
                <span className="text-white font-bold text-lg">
                  {trip.organizer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-white font-semibold text-lg">{trip.organizer.name}</div>
                <div className="text-white/60">@{trip.organizer.username}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        {activityPreview && activityPreview.length > 0 && (
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <Calendar className="h-7 w-7 text-blue-200" />
                Planned Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityPreview.map((activity) => (
                  <div key={activity.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Activity Details Section */}
                      <div className="flex-1">
                        <div className="text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-blue-100" />
                            <span className="font-semibold text-white text-sm">{activity.name}</span>
                          </div>
                          {activity.description && (
                            <p className="text-white/70 text-xs mb-3 leading-relaxed">{activity.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-2 text-blue-200">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(activity.date), 'MMM d')}</span>
                            </div>
                            {activity.duration && (
                              <div className="flex items-center gap-2 text-blue-200">
                                <Clock className="h-3 w-3" />
                                <span>{activity.duration}</span>
                              </div>
                            )}
                            {activity.location && (
                              <div className="flex items-center gap-2 text-blue-200">
                                <MapPin className="h-3 w-3" />
                                <span>{activity.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Activity Details Section - Right side with border */}
                      <div className="lg:flex-shrink-0 lg:border-l lg:border-white/20 lg:pl-4">
                        <div className="text-center lg:text-right">
                          <div className="flex items-center justify-center lg:justify-end gap-2 mb-2">
                            <Clock className="h-4 w-4 text-blue-200" />
                            <span className="font-semibold text-white text-sm">Activity Details</span>
                          </div>
                          <div className="text-sm font-bold text-white">{format(new Date(activity.date), 'EEEE, MMM d')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Preview Indicator - identical to pending status screen */}
              <div className="mt-6 relative">
                {/* Gradient fade effect */}
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent to-white/5 pointer-events-none rounded-t-xl"></div>
                
                <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-sm rounded-xl p-3 border border-purple-300/30 relative overflow-hidden">
                  {/* Animated background sparkles */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                    <div className="absolute top-6 right-6 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-300"></div>
                    <div className="absolute bottom-3 left-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse delay-700"></div>
                  </div>
                  
                  <div className="relative z-10 text-center">
                    {/* Animated dots indicating more content */}
                    <div className="flex items-center justify-center gap-1">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce delay-150"></div>
                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce delay-300"></div>
                      </div>
                      <span className="text-white/70 text-xs ml-2 font-medium">More amazing experiences await</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        {trip.requiresDownPayment && (
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <DollarSign className="h-7 w-7 text-blue-200" />
                Payment Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-gradient-to-r from-blue-600/30 to-indigo-600/30 backdrop-blur-md rounded-xl p-4 border border-blue-300/50 shadow-lg">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Payment Info Section */}
                  <div className="flex-1">
                    <div className="text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-100" />
                        <span className="font-semibold text-white text-sm">Down Payment Required</span>
                      </div>
                      <p className="text-white/70 text-xs mb-3 leading-relaxed">
                        A down payment is required to secure your spot on this trip.
                      </p>
                    </div>
                  </div>

                  {/* Payment Amount Section */}
                  <div className="lg:flex-shrink-0 lg:border-l lg:border-white/20 lg:pl-4">
                    <div className="text-center lg:text-right">
                      <div className="flex items-center justify-center lg:justify-end gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-200" />
                        <span className="font-semibold text-white text-sm">Amount Due</span>
                      </div>
                      <div className="text-2xl font-bold text-white">${trip.downPaymentAmount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmed Attendees */}
        <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <CheckCircle className="h-7 w-7 text-blue-200" />
              Confirmed Attendees ({confirmedMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {confirmedMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {confirmedMembers.map((member) => (
                  <div key={member.userId} className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/40 shadow-lg">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-xs">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white font-semibold text-sm drop-shadow-sm">
                      {member.user.name}
                    </span>
                    {member.userId === trip.organizer.id ? (
                      <Badge className="bg-amber-500/30 text-amber-200 border-amber-400/50 text-xs px-2 py-0.5 shadow-sm">
                        Organizer
                      </Badge>
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-300 drop-shadow-sm" />
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

        {/* RSVP Action Section */}
        <Card className="mb-8 bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-white/5 to-white/10 p-8 text-center border-b border-white/20">
            <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-6 shadow-xl border border-white/30">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Join This Trip
            </h2>
            <p className="text-white/80 text-lg max-w-lg mx-auto leading-relaxed">
              You're invited to join this amazing adventure! Create an account or sign in to confirm your attendance.
            </p>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Button 
                onClick={handleSignUpRedirect}
                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-500 shadow-2xl rounded-2xl border border-blue-400/30"
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Create Account & Join
              </Button>
              
              <Button 
                onClick={handleSignInRedirect}
                variant="outline"
                className="w-full py-6 text-lg font-bold bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-2xl"
              >
                <User className="h-5 w-5 mr-3" />
                Sign In & Join
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-white/60 text-sm">
                Already have an account? Just sign in to confirm your attendance.
              </p>
            </div>
          </CardContent>
        </Card>



        {/* Footer */}
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white/15 backdrop-blur-md rounded-full shadow-2xl border border-white/30 hover:bg-white/20 transition-all duration-300">
            <Heart className="h-6 w-6 text-red-400" />
            <span className="text-white font-bold text-lg">Questions? Contact {trip.organizer.name} for assistance.</span>
          </div>
        </div>
      </div>
    </div>
  );
}