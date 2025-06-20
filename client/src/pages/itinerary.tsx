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

import { Plus, MapPin, Clock, DollarSign, Users, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import ActivityCard from "@/components/activity-card";
import TripDetailLayout from "@/components/trip-detail-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define interfaces
interface Trip {
  id: number;
  name: string;
  organizer: number;
  adminOnlyItinerary?: boolean;
}

interface TripMember {
  tripId: number;
  userId: number;
  status: string;
  rsvpStatus?: string;
  isOrganizer: boolean;
  isAdmin?: boolean;
}

function Itinerary() {
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
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'day'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const [activityFormData, setActivityFormData] = useState({
    name: "",
    description: "",
    date: "",
    startTime: "",
    activityType: "",
    activityLink: "",
    location: "",
    duration: "",
    cost: "",
    paymentType: "free",
    maxParticipants: "",
    checkInDate: "",
    checkOutDate: ""
  });

  // Fetch trip details
  const { data: trip, isLoading: isTripLoading } = useQuery<Trip>({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId && !!user,
  });

  // Fetch trip members to check RSVP status
  const { data: members = [] } = useQuery<TripMember[]>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId && !!user,
  });

  // Check user's RSVP status and admin permissions
  const isOrganizerUser = user && trip && trip.organizer === (user as any).id;
  const currentUserMembership = members.find((member: TripMember) => member.userId === (user as any)?.id);
  const isCurrentUserAdmin = currentUserMembership?.isAdmin || isOrganizerUser;
  const canAddToItinerary = !trip?.adminOnlyItinerary || isCurrentUserAdmin;
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizerUser;

  // Fetch trip activities
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/activities`],
    enabled: !!tripId && !!user,
  });

  // Expand accommodation activities across multiple days and add checkout notifications
  const expandAccommodationActivities = (activities: any[]) => {
    const expandedActivities: any[] = [];
    
    activities.forEach((activity: any) => {
      if (activity.activityType === "Accommodation" && activity.checkInDate && activity.checkOutDate) {
        // Create entries for each day from check-in to day before check-out
        const checkInDate = new Date(activity.checkInDate);
        const checkOutDate = new Date(activity.checkOutDate);
        
        const currentDate = new Date(checkInDate);
        while (currentDate < checkOutDate) {
          expandedActivities.push({
            ...activity,
            date: new Date(currentDate),
            displayDate: new Date(currentDate),
            isAccommodationEntry: true
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Add checkout notification on checkout day
        expandedActivities.push({
          id: `checkout-${activity.id}`,
          name: `Check out of ${activity.name}`,
          description: ``,
          date: new Date(checkOutDate),
          displayDate: new Date(checkOutDate),
          isCheckoutNotification: true,
          originalAccommodation: activity
        });
      } else {
        // Regular activity - add as is
        expandedActivities.push({
          ...activity,
          displayDate: new Date(activity.date),
          isAccommodationEntry: false,
          isCheckoutNotification: false
        });
      }
    });
    
    return expandedActivities;
  };

  // Sort activities chronologically by date and reorganize by type
  const sortedActivities = expandAccommodationActivities(activities as any[]).sort((a: any, b: any) => {
    // First sort by date
    const dateA = new Date(a.displayDate);
    const dateB = new Date(b.displayDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // Within the same day: checkout notifications first, then regular activities, then accommodations last
    const getTypeOrder = (item: any) => {
      if (item.isCheckoutNotification) return 0;
      if (item.isAccommodationEntry) return 2;
      return 1; // regular activities
    };
    
    const typeOrderA = getTypeOrder(a);
    const typeOrderB = getTypeOrder(b);
    
    if (typeOrderA !== typeOrderB) {
      return typeOrderA - typeOrderB;
    }
    
    // If same type and dates, sort by start time
    // Activities without start time come last within the same type
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    
    // Convert time strings to comparable format (HH:MM to minutes)
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // Group activities by day for day separators and day view
  const groupActivitiesByDay = (activities: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    
    activities.forEach((activity: any) => {
      const dayKey = activity.displayDate.toISOString().split('T')[0];
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(activity);
    });
    
    return grouped;
  };

  const activitiesByDay = groupActivitiesByDay(sortedActivities);

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

  // Get current trip day if trip is active
  const getCurrentTripDay = () => {
    if (!(trip as any)?.startDate) return null;
    
    const today = new Date();
    const tripStartDate = new Date((trip as any).startDate);
    const diffTime = today.getTime() - tripStartDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // If trip has started and is ongoing
    if (diffDays >= 0 && diffDays < tripDays.length) {
      return diffDays + 1; // Convert to 1-based day number
    }
    
    return null;
  };

  const currentTripDay = getCurrentTripDay();



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
        startTime: "",
        activityType: "",
        activityLink: "",
        location: "",
        duration: "",
        cost: "",
        paymentType: "free",
        maxParticipants: "",
        checkInDate: "",
        checkOutDate: ""
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
    // Validate required fields based on activity type
    if (activityFormData.activityType === "Accommodation") {
      if (!activityFormData.name || !activityFormData.checkInDate || !activityFormData.checkOutDate) {
        toast({
          title: "Missing information",
          description: "Please provide activity name, check-in date, and check-out date",
          variant: "destructive"
        });
        return;
      }

      // Validate check-out is after check-in
      const checkInIndex = tripDays.findIndex(day => day.value === activityFormData.checkInDate);
      const checkOutIndex = tripDays.findIndex(day => day.value === activityFormData.checkOutDate);
      
      if (checkOutIndex <= checkInIndex) {
        toast({
          title: "Invalid dates",
          description: "Check-out date must be after check-in date",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (!activityFormData.name || !activityFormData.date) {
        toast({
          title: "Missing information",
          description: "Please provide at least activity name and date",
          variant: "destructive"
        });
        return;
      }
    }

    // Validate cost is required when payment type is not free or included
    if (!["free", "included"].includes(activityFormData.paymentType) && (!activityFormData.cost || parseFloat(activityFormData.cost) <= 0)) {
      toast({
        title: "Cost required",
        description: "Please provide a cost when the activity is not free or included",
        variant: "destructive"
      });
      return;
    }

    // Validate website is required when payment type is "pay in advance"
    if (activityFormData.paymentType === "pay_in_advance" && !activityFormData.activityLink) {
      toast({
        title: "Website required",
        description: "Please provide a website link for advance payment activities",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare activity data based on type
      let activityData: any = {
        ...activityFormData,
        cost: activityFormData.cost ? activityFormData.cost : null,
        maxParticipants: activityFormData.maxParticipants ? parseInt(activityFormData.maxParticipants) : null,
      };

      // For accommodation, convert check-in/check-out to proper date format and set the main date field
      if (activityFormData.activityType === "Accommodation") {
        const checkInDay = tripDays.find(day => day.value === activityFormData.checkInDate);
        const checkOutDay = tripDays.find(day => day.value === activityFormData.checkOutDate);
        
        if (checkInDay && checkOutDay) {
          activityData.checkInDate = checkInDay.date;
          activityData.checkOutDate = checkOutDay.date;
          activityData.date = checkInDay.date; // Set main date to check-in date
        }
      }

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
      isConfirmedMember={isConfirmedMember as boolean}
    >
      <div className="space-y-6">
        {/* Activities Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-1">
              <Button 
                onClick={() => setIsAddActivityModalOpen(true)}
                disabled={!isConfirmedMember || !canAddToItinerary}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Itinerary
              </Button>
              {trip?.adminOnlyItinerary && !isCurrentUserAdmin && (
                <p className="text-xs text-gray-500">
                  Only trip admins can add to the itinerary
                </p>
              )}
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="text-xs px-3 py-1"
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setViewMode('day');
                  // Auto-select current day if trip is active
                  if (currentTripDay && !selectedDay) {
                    setSelectedDay(currentTripDay);
                  } else if (!selectedDay) {
                    setSelectedDay(1); // Default to first day
                  }
                }}
                className="text-xs px-3 py-1"
              >
                Day View
              </Button>
            </div>
          </div>

          {/* Day Selector for Day View */}
          {viewMode === 'day' && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Select Day:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentIndex = tripDays.findIndex(d => d.dayNumber === selectedDay);
                  if (currentIndex > 0) {
                    setSelectedDay(tripDays[currentIndex - 1].dayNumber);
                  }
                }}
                disabled={!selectedDay || tripDays.findIndex(d => d.dayNumber === selectedDay) === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select
                value={selectedDay?.toString() || ""}
                onValueChange={(value) => setSelectedDay(parseInt(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a day..." />
                </SelectTrigger>
                <SelectContent>
                  {tripDays.map((day) => (
                    <SelectItem key={day.dayNumber} value={day.dayNumber.toString()}>
                      {day.label} {currentTripDay === day.dayNumber && "(Today)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentIndex = tripDays.findIndex(d => d.dayNumber === selectedDay);
                  if (currentIndex < tripDays.length - 1) {
                    setSelectedDay(tripDays[currentIndex + 1].dayNumber);
                  }
                }}
                disabled={!selectedDay || tripDays.findIndex(d => d.dayNumber === selectedDay) === tripDays.length - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Activities List */}
          <div className="space-y-4">
            {isActivitiesLoading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>Loading activities...</p>
                </CardContent>
              </Card>
            ) : sortedActivities.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No activities planned yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start planning your trip by adding some activities!
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              // List View - with day separators
              Object.entries(activitiesByDay)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([dateKey, dayActivities]) => {
                  const dayDate = new Date(dateKey);
                  const tripDay = tripDays.find(day => 
                    day.date.toISOString().split('T')[0] === dateKey
                  );
                  
                  return (
                    <div key={dateKey} className="space-y-3">
                      {/* Day Separator */}
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-shrink-0">
                          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                            {tripDay?.dayNumber || '?'}
                          </div>
                        </div>
                        <div className="flex-grow">
                          <h3 className="font-medium text-lg">
                            {tripDay?.label || dayDate.toLocaleDateString('en-US', { 
                              weekday: 'long', month: 'short', day: 'numeric' 
                            })}
                          </h3>
                          {currentTripDay === tripDay?.dayNumber && (
                            <span className="text-sm text-primary font-medium">Today</span>
                          )}
                        </div>
                        <div className="h-px bg-border flex-grow"></div>
                      </div>
                      
                      {/* Activities for this day */}
                      <div className="space-y-3 ml-11">
                        {dayActivities.map((activity: any) => {
                          if (activity.isCheckoutNotification) {
                            return (
                              <Card key={activity.id} className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="text-amber-600">
                                      <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <h4 className="font-medium text-amber-800">{activity.name}</h4>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }
                          
                          return (
                            <ActivityCard 
                              key={activity.id}
                              id={activity.id}
                              name={activity.name}
                              description={activity.description}
                              date={activity.date}
                              startTime={activity.startTime}
                              activityType={activity.activityType}
                              activityLink={activity.activityLink}
                              location={activity.location}
                              duration={activity.duration}
                              cost={activity.cost}
                              paymentType={activity.paymentType}
                              maxParticipants={activity.maxParticipants}
                              confirmedCount={activity.confirmedCount || 0}
                              totalCount={activity.totalCount || 0}
                              rsvps={activity.rsvps || []}
                              createdBy={activity.createdBy}
                              isAccommodationEntry={activity.isAccommodationEntry}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
            ) : (
              // Day View - single day activities
              selectedDay && activitiesByDay[tripDays.find(d => d.dayNumber === selectedDay)?.date.toISOString().split('T')[0] || ''] ? (
                <div className="space-y-3">
                  {activitiesByDay[tripDays.find(d => d.dayNumber === selectedDay)?.date.toISOString().split('T')[0] || ''].map((activity: any) => {
                    if (activity.isCheckoutNotification) {
                      return (
                        <Card key={activity.id} className="border-amber-200 bg-amber-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="text-amber-600">
                                <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-amber-800">{activity.name}</h4>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    
                    return (
                      <ActivityCard 
                        key={activity.id}
                        id={activity.id}
                        name={activity.name}
                        description={activity.description}
                        date={activity.date}
                        startTime={activity.startTime}
                        activityType={activity.activityType}
                        activityLink={activity.activityLink}
                        location={activity.location}
                        duration={activity.duration}
                        cost={activity.cost}
                        paymentType={activity.paymentType}
                        maxParticipants={activity.maxParticipants}
                        confirmedCount={activity.confirmedCount || 0}
                        totalCount={activity.totalCount || 0}
                        rsvps={activity.rsvps || []}
                        createdBy={activity.createdBy}
                        isAccommodationEntry={activity.isAccommodationEntry}
                      />
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activities planned for this day.</p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={isAddActivityModalOpen} onOpenChange={setIsAddActivityModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Itinerary Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="activity-name">Title *</Label>
              <Input
                id="activity-name"
                value={activityFormData.name}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Visit Museum, Beach Day, etc."
              />
            </div>

            {/* Description */}
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

            {/* Category */}
            <div>
              <Label htmlFor="activity-type">Category</Label>
              <Select
                value={activityFormData.activityType}
                onValueChange={(value) => setActivityFormData(prev => ({ ...prev, activityType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Attraction">Attraction</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Activity">Activity</SelectItem>
                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trip Day & Start Time OR Check In & Check Out for Accommodation */}
            {activityFormData.activityType === "Accommodation" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="activity-checkin">Check In *</Label>
                  <Select
                    value={activityFormData.checkInDate}
                    onValueChange={(value) => setActivityFormData(prev => ({ ...prev, checkInDate: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select check-in day..." />
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
                  <Label htmlFor="activity-checkout">Check Out *</Label>
                  <Select
                    value={activityFormData.checkOutDate}
                    onValueChange={(value) => setActivityFormData(prev => ({ ...prev, checkOutDate: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select check-out day..." />
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="activity-start-time">Start Time</Label>
                  <Input
                    id="activity-start-time"
                    type="time"
                    step="300"
                    value={activityFormData.startTime}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    placeholder="HH:MM"
                  />
                </div>
              </div>
            )}

            {/* Payment Type & Cost */}
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="included">Included</SelectItem>
                    <SelectItem value="payment_onsite">Payment Onsite</SelectItem>
                    <SelectItem value="pay_in_advance">Pay in advance (via link)</SelectItem>
                    <SelectItem value="prepaid">Prepaid by Organizer (group cost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="activity-cost">
                  Cost {["free", "included"].includes(activityFormData.paymentType) ? "(optional)" : "*"}
                </Label>
                <Input
                  id="activity-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={activityFormData.cost}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder={["free", "included"].includes(activityFormData.paymentType) ? "0.00" : "Enter cost amount"}
                  required={!["free", "included"].includes(activityFormData.paymentType)}
                  className={!["free", "included"].includes(activityFormData.paymentType) && !activityFormData.cost ? "border-red-300" : ""}
                />
                {!["free", "included"].includes(activityFormData.paymentType) && !activityFormData.cost && (
                  <p className="text-sm text-red-600 mt-1">Cost is required for paid activities</p>
                )}
              </div>
            </div>

            {/* More Details Button - Mobile Only */}
            <div className="md:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="w-full flex items-center justify-center gap-2"
              >
                {showMoreDetails ? "Hide Details" : "Add More Details"}
                {showMoreDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            {/* Additional Details - Always visible on desktop, toggleable on mobile */}
            <div className={`space-y-4 ${showMoreDetails ? 'block' : 'hidden md:block'}`}>
              {/* Duration & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="activity-duration">Duration</Label>
                  <Input
                    id="activity-duration"
                    value={activityFormData.duration}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 2 hours, Half day"
                  />
                </div>

                <div>
                  <Label htmlFor="activity-location">Location</Label>
                  <Input
                    id="activity-location"
                    value={activityFormData.location}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Where is this activity?"
                  />
                </div>
              </div>

              {/* Website & Registration Cap */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="activity-link">
                    Website {activityFormData.paymentType === "pay_in_advance" ? "*" : ""}
                  </Label>
                  <Input
                    id="activity-link"
                    type="url"
                    value={activityFormData.activityLink}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, activityLink: e.target.value }))}
                    placeholder="https://example.com/activity-booking"
                    required={activityFormData.paymentType === "pay_in_advance"}
                    className={activityFormData.paymentType === "pay_in_advance" && !activityFormData.activityLink ? "border-red-300" : ""}
                  />
                  {activityFormData.paymentType === "pay_in_advance" && !activityFormData.activityLink && (
                    <p className="text-sm text-red-600 mt-1">Website link is required for advance payment activities</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="activity-max-participants">Registration cap (optional)</Label>
                  <Input
                    id="activity-max-participants"
                    type="number"
                    min="1"
                    value={activityFormData.maxParticipants}
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    placeholder="e.g., 10"
                  />
                </div>
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
                    startTime: "",
                    activityType: "",
                    activityLink: "",
                    location: "",
                    duration: "",
                    cost: "",
                    paymentType: "free",
                    maxParticipants: "",
                    checkInDate: "",
                    checkOutDate: ""
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

export default Itinerary;