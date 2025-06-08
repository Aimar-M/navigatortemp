import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { Plus, MapPin, Clock, DollarSign, Users, Calendar } from "lucide-react";
import ActivityCard from "@/components/activity-card";
import TripDetailLayout from "@/components/trip-detail-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Itinerary() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id!);
  const { toast } = useToast();
  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false
  });
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activityFormData, setActivityFormData] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    duration: "",
    cost: "",
    paymentType: "free",
    maxParticipants: "",
  });

  // Fetch trip details
  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId && !!user,
  });

  // Fetch trip members to check RSVP status
  const { data: members = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId && !!user,
  });

  // Check user's RSVP status
  const isOrganizerUser = user && trip && (trip as any).organizer === (user as any).id;
  const currentUserMembership = (members as any[]).find((member: any) => member.userId === (user as any)?.id);
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizerUser;

  // Fetch trip activities
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/activities`],
    enabled: !!tripId && !!user,
  });

  // Generate trip days for the date selector
  const generateTripDays = () => {
    if (!(trip as any)?.startDate || !(trip as any)?.endDate) return [];
    
    const startDate = new Date((trip as any).startDate);
    const endDate = new Date((trip as any).endDate);
    const days = [];
    
    const currentDate = new Date(startDate);
    let dayNumber = 1;
    
    while (currentDate <= endDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      days.push({
        value: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
        label: `Day ${dayNumber} - ${dayName}, ${monthDay}`,
        dayNumber,
        date: new Date(currentDate)
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
      dayNumber++;
    }
    
    return days;
  };

  const tripDays = generateTripDays();



  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      return await apiRequest("POST", `/api/trips/${tripId}/activities`, activityData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      setIsAddActivityModalOpen(false);
      setActivityFormData({
        name: "",
        description: "",
        date: "",
        location: "",
        duration: "",
        cost: "",
        paymentType: "free",
        maxParticipants: "",
      });
      toast({
        title: "Activity added",
        description: "Your activity has been added to the itinerary."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add activity",
        variant: "destructive"
      });
    }
  });

  const handleAddActivity = async () => {
    if (!activityFormData.name || !activityFormData.date) {
      toast({
        title: "Missing information",
        description: "Please provide at least activity name and date",
        variant: "destructive"
      });
      return;
    }

    // Validate cost is required when payment type is not free
    if (activityFormData.paymentType !== "free" && (!activityFormData.cost || parseFloat(activityFormData.cost) <= 0)) {
      toast({
        title: "Cost required",
        description: "Please provide a cost when the activity is not free",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const activityData = {
        ...activityFormData,
        cost: activityFormData.cost ? activityFormData.cost : null,
        maxParticipants: activityFormData.maxParticipants ? parseInt(activityFormData.maxParticipants) : null,
      };

      addActivityMutation.mutate(activityData);
    } catch (error) {
      console.error("Error adding activity:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTripLoading || isActivitiesLoading || !user || !trip) {
    return (
      <TripDetailLayout tripId={tripId}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </TripDetailLayout>
    );
  }

  return (
    <TripDetailLayout 
      tripId={tripId}
      title="Itinerary"
      description={`Plan your activities for ${(trip as any)?.name || 'this trip'}`}
      isConfirmedMember={isConfirmedMember}
    >
      <div className="space-y-6">
        {/* Activities Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Trip Activities</h2>
              <p className="text-muted-foreground">Plan and organize your trip activities</p>
            </div>
            <Button 
              onClick={() => setIsAddActivityModalOpen(true)}
              disabled={!isConfirmedMember}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {isActivitiesLoading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>Loading activities...</p>
                </CardContent>
              </Card>
            ) : (activities as any[]).length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activities planned yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start planning your trip by adding some activities!
                  </p>
                </CardContent>
              </Card>
            ) : (
              (activities as any[]).map((activity: any) => (
                <ActivityCard 
                  key={activity.id} 
                  id={activity.id}
                  name={activity.name}
                  description={activity.description}
                  date={activity.date}
                  location={activity.location}
                  duration={activity.duration}
                  cost={activity.cost}
                  paymentType={activity.paymentType}
                  maxParticipants={activity.maxParticipants}
                  confirmedCount={activity.confirmedCount || 0}
                  totalCount={activity.totalCount || 0}
                  rsvps={activity.rsvps || []}
                  createdBy={activity.createdBy}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isAddActivityModalOpen} onOpenChange={setIsAddActivityModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="activity-name">Activity Name *</Label>
              <Input
                id="activity-name"
                value={activityFormData.name}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Visit Museum, Beach Day, etc."
              />
            </div>

            <div>
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                value={activityFormData.description}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what you'll be doing..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity-date">Trip Day *</Label>
                <Select
                  value={activityFormData.date}
                  onValueChange={(value) => setActivityFormData(prev => ({ ...prev, date: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tripDays.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activity-duration">Duration</Label>
                <Input
                  id="activity-duration"
                  value={activityFormData.duration}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 2 hours, Half day"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activity-location">Location</Label>
                <Input
                  id="activity-location"
                  value={activityFormData.location}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Where is this activity?"
                />
              </div>

              <div>
                <Label htmlFor="activity-payment-type">Payment Type</Label>
                <Select 
                  value={activityFormData.paymentType} 
                  onValueChange={(value) => setActivityFormData(prev => ({ ...prev, paymentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="payment_onsite">Payment Onsite</SelectItem>
                    <SelectItem value="prepaid">Prepaid by Activity Creator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activity-cost">
                  Cost {activityFormData.paymentType === "free" ? "(optional)" : "*"}
                </Label>
                <Input
                  id="activity-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={activityFormData.cost}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder={activityFormData.paymentType === "free" ? "0.00" : "Enter cost amount"}
                  required={activityFormData.paymentType !== "free"}
                  className={activityFormData.paymentType !== "free" && !activityFormData.cost ? "border-red-300" : ""}
                />
                {activityFormData.paymentType !== "free" && !activityFormData.cost && (
                  <p className="text-sm text-red-600 mt-1">Cost is required for paid activities</p>
                )}
              </div>

              <div>
                <Label htmlFor="activity-max-participants">Registration cap on participants (optional)</Label>
                <Input
                  id="activity-max-participants"
                  type="number"
                  min="1"
                  value={activityFormData.maxParticipants}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                  placeholder="e.g., 10"
                />
                <p className="text-sm text-gray-500 mt-1">Leave empty for unlimited participants</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddActivityModalOpen(false);
                  setActivityFormData({
                    name: "",
                    description: "",
                    date: "",
                    location: "",
                    duration: "",
                    cost: "",
                    paymentType: "free",
                    maxParticipants: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddActivity}
                disabled={isSubmitting || addActivityMutation.isPending}
              >
                {isSubmitting || addActivityMutation.isPending ? "Adding..." : "Add Activity"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TripDetailLayout>
  );
}