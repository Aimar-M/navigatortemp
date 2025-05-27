import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Edit, MapPin, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDateRange, getMemberStatusColor } from "@/lib/utils";
import ActivityCard from "@/components/activity-card";
import UserAvatar from "@/components/user-avatar";
import InviteModal from "@/components/invite-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/header";
import TripTabs from "@/components/trip-tabs";
import MobileNavigation from "@/components/mobile-navigation";

export default function TripDetailFixed() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Fetch trip details
  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: ['/api/trips', tripId],
    enabled: !!tripId && !!user,
  });

  // Fetch trip members
  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['/api/trips', tripId, 'members'],
    enabled: !!tripId && !!user,
  });

  // Fetch trip activities
  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['/api/trips', tripId, 'activities'],
    enabled: !!tripId && !!user,
  });

  // Check if user is organizer
  const isOrganizer = trip && user && trip.organizer === user.id;

  // Sort activities by date
  const upcomingActivities = activities 
    ? activities
        .filter((activity: any) => new Date(activity.date) >= new Date())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
    : [];

  if (!user) {
    navigate("/login");
    return null;
  }

  if (isTripLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <TripTabs tripId={tripId} />
        <main className="flex-1 p-4 pb-16 md:pb-4">
          <div className="flex justify-center items-center py-12">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-md">
          <MobileNavigation />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <TripTabs tripId={tripId} />
        <main className="flex-1 p-4 pb-16 md:pb-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Trip not found</h1>
            <p className="text-gray-600">
              The trip you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>
          <div className="flex justify-center mt-6">
            <Button onClick={() => navigate("/")}>Return Home</Button>
          </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-md">
          <MobileNavigation />
        </div>
      </div>
    );
  }

  const confirmedMembers = members?.filter((member: any) => member.status === 'confirmed') || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <TripTabs tripId={tripId} />
      
      <main className="flex-1 p-4 pb-16 md:pb-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Trip Header Details */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center">
                  <h2 className="text-xl font-bold text-gray-900">{trip.name}</h2>
                  {isOrganizer && (
                    <button className="ml-2 text-gray-400 hover:text-gray-600">
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-600">
                  {formatDateRange(trip.startDate, trip.endDate)} • {confirmedMembers.length} people
                </p>
                {trip.destination && (
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    {trip.destination}
                  </p>
                )}
              </div>
              {isOrganizer && (
                <Button onClick={() => setIsInviteModalOpen(true)}>
                  Invite Friends
                </Button>
              )}
            </div>
          </div>
          
          {/* Trip Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Trip Cover Photo Card */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
              <img 
                src={trip.cover || "https://images.unsplash.com/photo-1583422409516-2895a77efded?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&h=600"}
                alt={`${trip.destination} view`} 
                className="w-full h-48 md:h-64 object-cover" 
              />
              <div className="p-4">
                <p className="text-gray-700">
                  {trip.description || `Explore ${trip.destination} with friends! This trip will be an amazing adventure filled with great experiences and memories.`}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs font-medium">
                    {trip.destination}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs font-medium">
                    {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Travel Party Card */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-primary-600" />
                  Travel Party
                </h3>
              </div>
              <div className="p-4">
                {isMembersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-3 space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="flex flex-col space-y-3">
                    {members.map((member: any) => (
                      <div key={member.userId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <UserAvatar
                            user={member.user}
                            className="h-10 w-10"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                            <p className={`text-xs ${getMemberStatusColor(member.status)}`}>
                              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                              {member.userId === trip.organizer && " • Trip Organizer"}
                            </p>
                          </div>
                        </div>
                        
                        {/* Show accept/decline buttons for the current user if their status is pending */}
                        {member.userId === user?.id && member.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="default" 
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('auth_token');
                                  const headers: Record<string, string> = {
                                    'Content-Type': 'application/json'
                                  };
                                  if (token) {
                                    headers['Authorization'] = `Bearer ${token}`;
                                  }
                                  
                                  const response = await fetch(`/api/trips/${tripId}/members/${user.id}`, {
                                    method: 'PUT',
                                    headers,
                                    body: JSON.stringify({ status: 'confirmed' })
                                  });
                                  
                                  if (!response.ok) throw new Error('Failed to accept invitation');
                                  
                                  // Refresh the members data
                                  window.location.reload();
                                } catch (error) {
                                  console.error('Error accepting invitation:', error);
                                }
                              }}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('auth_token');
                                  const headers: Record<string, string> = {
                                    'Content-Type': 'application/json'
                                  };
                                  if (token) {
                                    headers['Authorization'] = `Bearer ${token}`;
                                  }
                                  
                                  const response = await fetch(`/api/trips/${tripId}/members/${user.id}`, {
                                    method: 'PUT',
                                    headers,
                                    body: JSON.stringify({ status: 'declined' })
                                  });
                                  
                                  if (!response.ok) throw new Error('Failed to decline invitation');
                                  
                                  // Navigate back to home page after declining
                                  navigate('/');
                                } catch (error) {
                                  console.error('Error declining invitation:', error);
                                }
                              }}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-2">No members found.</p>
                )}
              </div>
            </div>

            {/* Upcoming Activities Card */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 mr-2 text-primary-600"
                  >
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Upcoming Activities
                </h3>
              </div>
              <div className="p-4">
                {isActivitiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardContent className="p-3">
                          <div className="flex justify-between">
                            <div>
                              <Skeleton className="h-3 w-20 mb-1" />
                              <Skeleton className="h-5 w-40 mb-1" />
                              <Skeleton className="h-4 w-60" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : upcomingActivities.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingActivities.map((activity: any) => (
                      <ActivityCard
                        key={activity.id}
                        id={activity.id}
                        name={activity.name}
                        description={activity.description}
                        date={activity.date}
                        location={activity.location}
                        confirmedCount={activity.rsvps?.filter((r: any) => r.status === 'going').length || 0}
                        totalCount={members?.filter((m: any) => m.status === 'confirmed').length || 0}
                      />
                    ))}

                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/trips/${tripId}/itinerary`)}
                      >
                        View Full Itinerary
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 mb-2">No upcoming activities planned yet.</p>
                    {isOrganizer && (
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/trips/${tripId}/itinerary`)}
                      >
                        Add Activities
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Quick Links</h3>
              </div>
              <div className="p-4 flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => navigate(`/trips/${tripId}/chat`)}
                >
                  Group Chat
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => navigate(`/trips/${tripId}/itinerary`)}
                >
                  Itinerary
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => navigate(`/trips/${tripId}/budget`)}
                >
                  Budget
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">Sign up for activities, explore the destination, and connect with your travel companions!</p>
          </div>
        </div>
      </main>
      
      {/* Fixed Mobile Navigation - always visible at the bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-md">
        <MobileNavigation />
      </div>
      
      {/* Invite Modal */}
      <InviteModal 
        tripId={tripId} 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </div>
  );
}