import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  MapPin, Calendar, Users, DollarSign, CheckCircle, 
  AlertCircle, Clock, Bell, Lock, Heart, User, UserPlus 
} from "lucide-react";
import { format } from "date-fns";
import navigatorLogo from "@/assets/navigator-logo.svg";

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

  const { trip, activities, members } = invitationData;
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
        
        {/* Trip Header */}
        <Card className="mb-8 bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-white/5 to-white/10 p-8 text-center border-b border-white/20">
            <div className="flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-6 shadow-xl border border-white/30">
              <MapPin className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">{trip.name}</h1>
            <p className="text-white/80 text-xl mb-4">{trip.destination}</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">
                  {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="font-medium">{confirmedMembers.length} confirmed</span>
              </div>
            </div>
          </div>

          {trip.description && (
            <CardContent className="p-6">
              <p className="text-white/80 text-lg leading-relaxed text-center">
                {trip.description}
              </p>
            </CardContent>
          )}
        </Card>

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
        {activities && activities.length > 0 && (
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <Calendar className="h-7 w-7 text-blue-200" />
                Planned Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
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
                            {activity.time && (
                              <div className="flex items-center gap-2 text-blue-200">
                                <Clock className="h-3 w-3" />
                                <span>{activity.time}</span>
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
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        {trip.requiresDownPayment && (
          <Card className="mb-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <DollarSign className="h-7 w-7 text-green-300" />
                Payment Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="relative p-6 bg-gradient-to-br from-green-500/30 to-emerald-600/30 backdrop-blur-md rounded-2xl border border-green-300/40 shadow-xl mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
                  <div className="relative z-10">
                    <div className="text-4xl font-bold text-white mb-1">${trip.downPaymentAmount}</div>
                    <div className="text-green-100 font-medium">Down payment required</div>
                  </div>
                </div>
                <p className="text-white/70">
                  A down payment is required to secure your spot on this trip.
                </p>
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