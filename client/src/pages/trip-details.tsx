import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { MapPin, Calendar, Users, Info, UserPlus, Edit2, Save, X, Home, Plane, UserMinus, Trash2, Plus } from "lucide-react";
import TripDetailLayout from "@/components/trip-detail-layout";
import UserAvatar from "@/components/user-avatar";
import RSVPPaymentWorkflow from "@/components/rsvp-payment-workflow";
import OrganizerReviewDashboard from "@/components/organizer-review-dashboard";
import PendingStatusScreen from "@/components/pending-status-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import InviteModal from "@/components/invite-modal";
import TripImageUpload from "@/components/trip-image-upload";
import { EnhancedMemberRemovalDialog } from "@/components/EnhancedMemberRemovalDialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Helper functions for accommodation links with custom names
function parseAccommodationLink(link: string): { name: string; url: string } {
  // Check if the link contains custom name (format: "Name||URL")
  if (link.includes('||')) {
    const [name, url] = link.split('||');
    return { name: name || '', url: url || '' };
  }
  
  // For legacy links without custom names, generate a default name
  if (link.startsWith('http')) {
    try {
      const domain = new URL(link).hostname.replace('www.', '');
      return { name: domain, url: link };
    } catch {
      return { name: 'Accommodation Link', url: link };
    }
  }
  
  return { name: 'Accommodation Link', url: link };
}

function formatAccommodationLink(name: string, url: string): string {
  // Store as "Name||URL" format
  if (name && url) {
    return `${name}||${url}`;
  } else if (url) {
    return url;
  } else if (name) {
    return `${name}||`;
  }
  return '';
}

function getDisplayName(linkData: { name: string; url: string }, index: number): string {
  // If no custom name provided, use fallback
  if (!linkData.name || linkData.name.trim() === '') {
    return `Accommodation ${index + 1}`;
  }
  return linkData.name;
}

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
    accommodationLinks: [''],
    airportGateway: ''
  });
  const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null);
  const [removeActivities, setRemoveActivities] = useState(false);
  const [removeExpenses, setRemoveExpenses] = useState(false);
  const [enhancedRemovalDialog, setEnhancedRemovalDialog] = useState<{
    isOpen: boolean;
    userId: number;
    userName: string;
  }>({ isOpen: false, userId: 0, userName: '' });
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
    accommodationLinks?: string[];
    airportGateway?: string;
    requiresDownPayment?: boolean;
    downPaymentAmount?: string;
    adminOnlyItinerary?: boolean;
    removalLogicVersion?: number;
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
    isAdmin?: boolean;
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

  // Admin settings update mutation
  const updateAdminSettingsMutation = useMutation({
    mutationFn: async (settings: { adminOnlyItinerary: boolean }) => {
      return await apiRequest("PATCH", `/api/trips/${tripId}/admin-settings`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
      toast({
        title: "Settings updated",
        description: "Admin settings have been successfully updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update admin settings",
        variant: "destructive"
      });
    }
  });

  // Member admin status update mutation
  const updateMemberAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      return await apiRequest("PATCH", `/api/trips/${tripId}/members/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      toast({
        title: "Admin access updated",
        description: "Member admin access has been successfully updated"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update admin access",
        variant: "destructive"
      });
    }
  });

  // Member removal mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      removeActivities, 
      removeExpenses 
    }: { 
      userId: number; 
      removeActivities: boolean; 
      removeExpenses: boolean; 
    }) => {
      return await apiRequest("DELETE", `/api/trips/${tripId}/members/${userId}`, {
        removeActivities,
        removeExpenses
      });
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
      
      const memberName = memberToRemove?.user?.name || memberToRemove?.user?.username || 'Member';
      toast({
        title: "Member removed",
        description: `${memberName} has been removed. Their items were handled as requested.`,
        duration: 5000,
      });
      
      setMemberToRemove(null);
      setRemoveActivities(false);
      setRemoveExpenses(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove member",
        description: error.message || "Something went wrong",
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
        accommodationLinks: trip.accommodationLinks && trip.accommodationLinks.length > 0 ? trip.accommodationLinks : [''],
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
      accommodationLinks: editForm.accommodationLinks.filter(link => link.trim() !== ''),
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
  const isCurrentUserAdmin = currentUserMembership?.isAdmin || isOrganizer;

  // Helper function to check if a member can be demoted (ensure at least one admin remains)
  const canDemoteMember = (userId: number) => {
    const adminCount = members.filter(member => member.isAdmin || member.userId === trip?.organizer).length;
    const isLastAdmin = adminCount <= 1 && (members.find(m => m.userId === userId)?.isAdmin || userId === trip?.organizer);
    return !isLastAdmin;
  };
  
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
  
  // Show Pending Status Screen for users with pending RSVP status
  if (isPendingMember && currentUserMembership && !isOrganizer) {
    return (
      <TripDetailLayout 
        tripId={tripId}
        title={trip.name}
        isConfirmedMember={false}
        description={`Trip to ${trip.destination}`}
      >
        <PendingStatusScreen 
          trip={trip}
          member={currentUserMembership}
        />
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
      {/* RSVP Status Notice for Declined Users */}
      {isDeclinedMember && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800">RSVP Declined</h3>
                <p className="text-sm text-red-700">
                  You have declined this trip invitation. Contact the organizer if you'd like to change your response.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizer Review Dashboard for pending payments */}
      {isOrganizer && members && (
        <OrganizerReviewDashboard
          tripId={tripId}
          members={members}
          requiresDownPayment={!!trip.requiresDownPayment}
        />
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

              {/* Accommodation Links */}
              <div className="flex items-start space-x-3">
                <Home className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Accommodation</h3>
                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      {editForm.accommodationLinks.map((link, index) => {
                        // Parse the link to extract name and URL
                        const linkData = parseAccommodationLink(link);
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={linkData.name}
                              onChange={(e) => {
                                const newLinks = [...editForm.accommodationLinks];
                                newLinks[index] = formatAccommodationLink(e.target.value, linkData.url);
                                setEditForm(prev => ({ ...prev, accommodationLinks: newLinks }));
                              }}
                              placeholder="Accommodation Name"
                              className="flex-1"
                            />
                            <Input
                              value={linkData.url}
                              onChange={(e) => {
                                const newLinks = [...editForm.accommodationLinks];
                                newLinks[index] = formatAccommodationLink(linkData.name, e.target.value);
                                setEditForm(prev => ({ ...prev, accommodationLinks: newLinks }));
                              }}
                              placeholder="Enter accommodation booking link (optional)"
                              type="url"
                              className="flex-1"
                            />
                            {editForm.accommodationLinks.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newLinks = editForm.accommodationLinks.filter((_, i) => i !== index);
                                  setEditForm(prev => ({ ...prev, accommodationLinks: newLinks }));
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditForm(prev => ({ 
                            ...prev, 
                            accommodationLinks: [...prev.accommodationLinks, '||'] 
                          }));
                        }}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Another Link
                      </Button>
                    </div>
                  ) : (
                    <div className="text-gray-600">
                      {trip.accommodationLinks && trip.accommodationLinks.length > 0 ? (
                        <div className="space-y-2">
                          {trip.accommodationLinks.map((link, index) => {
                            const linkData = parseAccommodationLink(link);
                            const displayName = getDisplayName(linkData, index);
                            return (
                              <div key={index}>
                                {linkData.url ? (
                                  <a 
                                    href={linkData.url.startsWith('http') ? linkData.url : `https://${linkData.url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline block"
                                  >
                                    {displayName}
                                  </a>
                                ) : (
                                  <span className="text-gray-600">{displayName}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        'No accommodation links provided'
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Airport Gateway */}
              <div className="flex items-start space-x-3">
                <Plane className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium">Recommended Airports</h3>
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

            {/* Admin Settings - Only visible to admins */}
            {isCurrentUserAdmin && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <Label htmlFor="admin-only-toggle" className="text-sm font-medium">
                      Only Admins Can Add to Itinerary
                    </Label>
                    <p className="text-xs text-gray-600">
                      When enabled, only trip admins can add, edit, or delete itinerary items
                    </p>
                  </div>
                  <Switch
                    id="admin-only-toggle"
                    checked={trip.adminOnlyItinerary || false}
                    onCheckedChange={(checked) => {
                      updateAdminSettingsMutation.mutate({ adminOnlyItinerary: checked });
                    }}
                    disabled={updateAdminSettingsMutation.isPending}
                  />
                </div>
              </div>
            )}
            
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
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => setLocation(`/user/${member.userId}`)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                          >
                            {member.user?.name || member.user?.username || 'Anonymous'}
                          </button>
                          {trip.organizer === member.userId && (
                            <span className="text-xs text-blue-600 ml-1">(Organizer)</span>
                          )}
                          {member.isAdmin && trip.organizer !== member.userId && (
                            <span className="text-xs text-purple-600 ml-1">(Admin)</span>
                          )}
                        </div>
                        <div className={`text-xs ${
                          member.status === 'confirmed' ? 'text-green-600' :
                          member.status === 'declined' ? 'text-red-600' :
                          'text-orange-500'
                        }`}>
                          {member.status === 'confirmed' ? '✓ Attending' :
                           member.status === 'declined' ? '✕ Not attending' :
                           '? Awaiting confirmation'}
                        </div>
                        
                        {/* Admin Access Toggle - Only visible to admins, not for organizers */}
                        {isCurrentUserAdmin && trip.organizer !== member.userId && (
                          <div className="flex items-center space-x-2 mt-1">
                            <Label htmlFor={`admin-toggle-${member.userId}`} className="text-xs text-gray-600">
                              Admin Access
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Switch
                                      id={`admin-toggle-${member.userId}`}
                                      checked={member.isAdmin || false}
                                      onCheckedChange={(checked) => {
                                        if (!checked && !canDemoteMember(member.userId)) {
                                          toast({
                                            title: "Cannot remove admin",
                                            description: "At least one admin is required per trip",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        updateMemberAdminMutation.mutate({ 
                                          userId: member.userId, 
                                          isAdmin: checked 
                                        });
                                      }}
                                      disabled={updateMemberAdminMutation.isPending}
                                      className="scale-75"
                                    />
                                  </div>
                                </TooltipTrigger>
                                {!canDemoteMember(member.userId) && member.isAdmin && (
                                  <TooltipContent>
                                    <p>At least one admin is required per trip</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Remove Member Button - Only visible to admins, not for themselves or organizer */}
                    {isCurrentUserAdmin && 
                     member.userId !== user?.id && 
                     member.userId !== trip.organizer && (
                      <div className="ml-2">
                        {/* Enhanced removal for version 2+ trips */}
                        {(trip?.removalLogicVersion || 0) >= 2 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              // Check if this is the last admin
                              const adminCount = members.filter(m => m.isAdmin || m.userId === trip?.organizer).length;
                              const isLastAdmin = adminCount <= 1 && member.isAdmin;
                              
                              if (isLastAdmin) {
                                toast({
                                  title: "Cannot remove member",
                                  description: "Cannot remove the last admin from the trip",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              setEnhancedRemovalDialog({
                                isOpen: true,
                                userId: member.userId,
                                userName: member.user?.name || member.user?.username || 'Unknown'
                              });
                            }}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                  // Check if this is the last admin
                                  const adminCount = members.filter(m => m.isAdmin || m.userId === trip?.organizer).length;
                                  const isLastAdmin = adminCount <= 1 && member.isAdmin;
                                  
                                  if (isLastAdmin) {
                                    toast({
                                      title: "Cannot remove member",
                                      description: "Cannot remove the last admin from the trip",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  // Legacy removal system
                                  setMemberToRemove(member);
                                  setRemoveActivities(false);
                                  setRemoveExpenses(false);
                                }}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Member</AlertDialogTitle>
                              <AlertDialogDescription asChild>
                                <div className="space-y-4">
                                  <p>
                                    This will remove <strong>{member.user?.name || member.user?.username}</strong> from the trip. 
                                    Please choose what to do with their submitted activities and expenses.
                                  </p>
                                  
                                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-1">
                                        <Label htmlFor="remove-activities" className="text-sm font-medium">
                                          Remove this member's itinerary activities
                                        </Label>
                                        <p className="text-xs text-gray-600">
                                          If off: Keep activities but remove their RSVP and mark as "Created by removed user"
                                        </p>
                                      </div>
                                      <Switch
                                        id="remove-activities"
                                        checked={removeActivities}
                                        onCheckedChange={setRemoveActivities}
                                      />
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-1">
                                        <Label htmlFor="remove-expenses" className="text-sm font-medium">
                                          Remove this member's submitted expenses
                                        </Label>
                                        <p className="text-xs text-gray-600">
                                          If off: Keep expenses but mark as "Submitted by removed user" and prevent editing
                                        </p>
                                      </div>
                                      <Switch
                                        id="remove-expenses"
                                        checked={removeExpenses}
                                        onCheckedChange={setRemoveExpenses}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setMemberToRemove(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (memberToRemove) {
                                    removeMemberMutation.mutate({
                                      userId: memberToRemove.userId,
                                      removeActivities,
                                      removeExpenses
                                    });
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={removeMemberMutation.isPending}
                              >
                                {removeMemberMutation.isPending ? "Removing..." : "Confirm Removal"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </div>
                    )}
                    
                    {/* Show attend/decline buttons if this is the current user */}
                    {user?.id === member.userId && (member.status === 'pending' || member.status === 'confirmed') && 
                     !(trip?.requiresDownPayment === false && member.rsvpStatus === 'confirmed') && (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant={member.status === 'confirmed' ? "default" : "outline"}
                          className={member.status === 'confirmed' 
                            ? "bg-green-600 text-white border-green-600 cursor-default" 
                            : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          }
                          disabled={member.status === 'confirmed'}
                          onClick={member.status === 'pending' ? () => {
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
                          } : undefined}
                        >
                          I'll Attend
                        </Button>
                        {member.status === 'pending' && (
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
                        )}
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
      
      {/* Enhanced Member Removal Dialog */}
      <EnhancedMemberRemovalDialog
        tripId={tripId}
        userId={enhancedRemovalDialog.userId}
        userName={enhancedRemovalDialog.userName}
        isOpen={enhancedRemovalDialog.isOpen}
        onClose={() => setEnhancedRemovalDialog({ isOpen: false, userId: 0, userName: '' })}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/members`] });
          queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
          queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/expenses`] });
          queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] });
        }}
      />
    </TripDetailLayout>
  );
}