import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, Calendar, Users, Info, UserPlus, Edit2, Save, X, Home, Plane } from "lucide-react";
import TripDetailLayout from "@/components/trip-detail-layout";
import UserAvatar from "@/components/user-avatar";
import RSVPPaymentWorkflow from "@/components/rsvp-payment-workflow";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import InviteModal from "@/components/invite-modal";
import TripImageUpload from "@/components/trip-image-upload";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    destination: '',
    description: '',
    startDate: '',
    endDate: '',
    accommodationLink: '',
    airportGateway: ''
  });
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
    cover?: string;
    accommodationLink?: string;
    airportGateway?: string;
    requiresDownPayment?: boolean;
    downPaymentAmount?: string;
  }

  interface TripMember {
    tripId: number;
    userId: number;
    status: string;
    rsvpStatus?: string;
    rsvpDate?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    paymentAmount?: string;
    paymentSubmittedAt?: string;
    paymentConfirmedAt?: string;
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

  // Trip update mutation
  const updateTripMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      return await apiRequest("PUT", `/api/trips/${tripId}`, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
      setIsEditing(false);
      toast({
        title: "Trip updated",
        description: "Trip details have been successfully updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update trip details",
        variant: "destructive"
      });
    }
  });

  // RSVP status update mutation
  const updateRSVPMutation = useMutation({
    mutationFn: async ({ userId, rsvpStatus }: { userId: number; rsvpStatus: string }) => {
      return await apiRequest("PUT", `/api/trips/${tripId}/members/${userId}/rsvp`, { rsvpStatus });
    },
    onSuccess: () => {
      // Refresh all trip-related queries to update access immediately
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips/memberships/pending"] });
      
      toast({
        title: "RSVP updated",
        description: "Your RSVP status has been updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "RSVP update failed",
        description: error.message || "Failed to update RSVP status",
        variant: "destructive"
      });
    }
  });

  // Initialize edit form when trip data loads or editing starts
  const initializeEditForm = () => {
    if (trip) {
      setEditForm({
        name: trip.name,
        destination: trip.destination,
        description: trip.description || '',
        startDate: trip.startDate.split('T')[0], // Convert to YYYY-MM-DD format
        endDate: trip.endDate.split('T')[0],
        accommodationLink: trip.accommodationLink || '',
        airportGateway: trip.airportGateway || ''
      });
    }
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (!isEditing) {
      initializeEditForm();
    }
    setIsEditing(!isEditing);
  };

  // Handle form submission
  const handleSaveChanges = () => {
    // Basic validation
    if (!editForm.name.trim() || !editForm.destination.trim() || !editForm.startDate || !editForm.endDate) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const startDate = new Date(editForm.startDate);
    const endDate = new Date(editForm.endDate);

    if (startDate >= endDate) {
      toast({
        title: "Validation error",
        description: "End date must be after start date",
        variant: "destructive"
      });
      return;
    }

    const updatedData = {
      name: editForm.name.trim(),
      destination: editForm.destination.trim(),
      description: editForm.description.trim(),
      startDate: startDate,
      endDate: endDate,
      accommodationLink: editForm.accommodationLink.trim() || null,
      airportGateway: editForm.airportGateway.trim() || null
    };

    updateTripMutation.mutate(updatedData);
  };

  const isOrganizer = user && trip && trip.organizer === user.id;
  
  // Get current user's membership status
  const currentUserMembership = members.find(member => member.userId === user?.id);
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizer;
  const isPendingMember = currentUserMembership?.rsvpStatus === 'pending';
  const isDeclinedMember = currentUserMembership?.rsvpStatus === 'declined';
  
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
      isConfirmedMember={!!isConfirmedMember}
      description={`Trip to ${trip.destination}`}
    >
      {/* RSVP Status Notice for Non-Confirmed Users */}
      {!isConfirmedMember && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-800">RSVP Required</h3>
                <p className="text-sm text-amber-700">
                  {isPendingMember && "Please confirm your attendance to access trip features like expenses, activities, and chat."}
                  {isDeclinedMember && "You have declined this trip invitation. Contact the organizer if you'd like to change your response."}
                </p>
                {isPendingMember && !trip.requiresDownPayment && (
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      onClick={() => updateRSVPMutation.mutate({ userId: user!.id, rsvpStatus: 'confirmed' })}
                      disabled={updateRSVPMutation.isPending}
                    >
                      Confirm Attendance
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateRSVPMutation.mutate({ userId: user!.id, rsvpStatus: 'declined' })}
                      disabled={updateRSVPMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Workflow for trips requiring down payment */}
      {trip.requiresDownPayment && isPendingMember && user && currentUserMembership && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <RSVPPaymentWorkflow
              tripId={tripId}
              userId={user.id}
              trip={trip}
              member={currentUserMembership}
              isOrganizer={isOrganizer}
              onPaymentSubmitted={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
                toast({
                  title: "Payment submitted",
                  description: "Your payment information has been submitted for review."
                });
              }}
              onPaymentConfirmed={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'members'] });
                queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
                toast({
                  title: "Payment confirmed!",
                  description: "You now have full access to trip features."
                });
              }}
            />
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Trip Details</h2>
              {isOrganizer && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        disabled={updateTripMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveChanges}
                        disabled={updateTripMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateTripMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleEditToggle}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Trip Name */}
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Trip Name</h3>
                  {isEditing ? (
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter trip name"
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-600">{trip.name}</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Dates</h3>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <label className="text-xs text-gray-500">Start Date</label>
                        <Input
                          type="date"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">End Date</label>
                        <Input
                          type="date"
                          value={editForm.endDate}
                          onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      {format(new Date(trip.startDate), "MMM d, yyyy")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Destination */}
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Destination</h3>
                  {isEditing ? (
                    <Input
                      value={editForm.destination}
                      onChange={(e) => setEditForm(prev => ({ ...prev, destination: e.target.value }))}
                      placeholder="Enter destination"
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-600">{trip.destination}</p>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Description</h3>
                  {isEditing ? (
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter trip description (optional)"
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-600">{trip.description || 'No description provided'}</p>
                  )}
                </div>
              </div>

              {/* Accommodation Link */}
              <div className="flex items-start space-x-3">
                <Home className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Accommodation</h3>
                  {isEditing ? (
                    <Input
                      value={editForm.accommodationLink}
                      onChange={(e) => setEditForm(prev => ({ ...prev, accommodationLink: e.target.value }))}
                      placeholder="Enter accommodation booking link (optional)"
                      className="mt-1"
                      type="url"
                    />
                  ) : (
                    <div className="text-gray-600">
                      {trip.accommodationLink ? (
                        <a 
                          href={trip.accommodationLink.startsWith('http') ? trip.accommodationLink : `https://${trip.accommodationLink}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View Accommodation Details
                        </a>
                      ) : (
                        'No accommodation link provided'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Airport Gateway */}
              <div className="flex items-start space-x-3">
                <Plane className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Recommended Airport</h3>
                  {isEditing ? (
                    <Input
                      value={editForm.airportGateway}
                      onChange={(e) => setEditForm(prev => ({ ...prev, airportGateway: e.target.value }))}
                      placeholder="Enter recommended airport (e.g., JFK, LAX)"
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-gray-600">
                      {trip.airportGateway || 'No recommended airport specified'}
                    </p>
                  )}
                </div>
              </div>
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
                                  description: "You've been removed from this trip and it has been archived"
                                });
                                // Navigate to home page since they're no longer a member
                                window.location.href = '/';
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