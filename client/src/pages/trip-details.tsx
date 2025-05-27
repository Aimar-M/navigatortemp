import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, Calendar, Users, Info, UserPlus } from "lucide-react";
import TripDetailLayout from "@/components/trip-detail-layout";
import UserAvatar from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import InviteModal from "@/components/invite-modal";
import TripImageUpload from "@/components/trip-image-upload";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Define trip interface
  interface Trip {
    id: number;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
    organizer: number;
    status: string;
  }

  interface TripMember {
    tripId: number;
    userId: number;
    status: string;
    isOrganizer: boolean;
    user: {
      id: number;
      username: string;
      name?: string;
      email?: string;
      profileImageUrl?: string;
      avatar?: string;
    };
  }

  // Fetch trip details
  const { data: trip, isLoading } = useQuery<Trip>({
    queryKey: [`/api/trips/${tripId}`],
  });

  // Fetch trip members
  const { data: members = [], isLoading: isMembersLoading } = useQuery<TripMember[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });
  
  if (isLoading || !trip) {
    return (
      <TripDetailLayout tripId={tripId}>
        <div className="space-y-4 mb-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </TripDetailLayout>
    );
  }
  
  return (
    <TripDetailLayout 
      tripId={tripId}
      title={trip.name}
      description={`Trip to ${trip.destination}`}
    >
      {/* Trip Image Upload */}
      <TripImageUpload 
        tripId={tripId}
        currentImage={trip.cover}
        isOrganizer={user?.id === trip.organizer}
        onImageUpdate={(imageUrl) => {
          // Update the trip data locally
          queryClient.setQueryData([`/api/trips/${tripId}`], (oldData: any) => ({
            ...oldData,
            cover: imageUrl
          }));
        }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trip Details Card */}
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Trip Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Dates</h3>
                  <p className="text-gray-600">
                    {format(new Date(trip.startDate), "MMM d, yyyy")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Destination</h3>
                  <p className="text-gray-600">{trip.destination}</p>
                </div>
              </div>
              
              {trip.description && (
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Description</h3>
                    <p className="text-gray-600">{trip.description}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Members Card */}
        <Card className="col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Members</h2>
              {/* Only show invite button if current user is the trip organizer */}
              {user && trip.organizer === user.id && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Invite</span>
                  </Button>
                </div>
              )}
            </div>
            
            {isMembersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.userId} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <UserAvatar 
                        user={member.user}
                        className="h-8 w-8"
                      />
                      <div>
                        <button 
                          onClick={() => setLocation(`/user/${member.userId}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                        >
                          {member.user?.name || member.user?.username || 'Anonymous'}
                        </button>
                        {trip.organizer === member.userId && (
                          <span className="text-xs text-blue-600 ml-1">(Organizer)</span>
                        )}
                        <div className={`text-xs ${
                          member.status === 'confirmed' ? 'text-green-600' :
                          member.status === 'declined' ? 'text-red-600' :
                          'text-orange-500'
                        }`}>
                          {member.status === 'confirmed' ? '✓ Attending' :
                           member.status === 'declined' ? '✕ Not attending' :
                           '? Awaiting confirmation'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show attend/decline buttons if this is the current user and status is pending */}
                    {user?.id === member.userId && member.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          onClick={() => {
                            const token = localStorage.getItem('auth_token');
                            toast({
                              title: "Confirming attendance...",
                              description: "Processing your confirmation"
                            });
                            
                            fetch(`/api/trips/${tripId}/members/${user.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ status: 'confirmed' })
                            })
                            .then(response => {
                              if (response.ok) {
                                toast({
                                  title: "Attendance confirmed!",
                                  description: "You're now confirmed for this trip"
                                });
                                // Refresh members data
                                window.location.reload();
                              }
                            })
                            .catch(error => {
                              toast({
                                title: "Error",
                                description: "Failed to confirm attendance",
                                variant: "destructive"
                              });
                            });
                          }}
                        >
                          I'll Attend
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                          onClick={() => {
                            const token = localStorage.getItem('auth_token');
                            toast({
                              title: "Processing response...",
                              description: "Recording your decision"
                            });
                            
                            fetch(`/api/trips/${tripId}/members/${user.id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ status: 'declined' })
                            })
                            .then(response => {
                              if (response.ok) {
                                toast({
                                  title: "Response recorded",
                                  description: "You've declined this trip invitation"
                                });
                                // Refresh members data
                                window.location.reload();
                              }
                            })
                            .catch(error => {
                              toast({
                                title: "Error",
                                description: "Failed to update your response",
                                variant: "destructive"
                              });
                            });
                          }}
                        >
                          Can't Attend
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Invite Modal */}
      <InviteModal 
        tripId={tripId} 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
      />
    </TripDetailLayout>
  );
}