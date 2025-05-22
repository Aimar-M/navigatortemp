import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, CalendarPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import TripTabs from "@/components/trip-tabs";
import ActivityCard from "@/components/activity-card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Itinerary() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    duration: "",
    cost: "",
  });
  
  // Helper function to generate an array of dates between start and end dates
  const getDaysBetweenDates = (startDate: Date, endDate: Date): string[] => {
    const dates: string[] = [];
    // Clone the start date to avoid modifying the original date
    const currentDate = new Date(startDate);
    
    // Set hours to 0 to compare dates only
    currentDate.setHours(0, 0, 0, 0);
    const lastDate = new Date(endDate);
    lastDate.setHours(0, 0, 0, 0);
    
    // Add each date until we reach the end date
    while (currentDate <= lastDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Fetch trip details
  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    queryFn: async () => {
      // Get auth token for token-based authentication
      const token = localStorage.getItem('auth_token');
      
      // Add token to authorization header
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${tripId}`, {
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch trip");
      return response.json();
    },
    enabled: !!tripId && !!user,
  });

  // Fetch trip activities
  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/activities`],
    queryFn: async () => {
      // Get auth token for token-based authentication
      const token = localStorage.getItem('auth_token');
      
      // Add token to authorization header
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch activities");
      return response.json();
    },
    enabled: !!tripId && !!user,
  });

  // Check if user is organizer
  const isOrganizer = trip && user && trip.organizer === user.id;

  // Group activities by date
  const groupedActivities = activities
    ? activities.reduce((grouped: Record<string, any[]>, activity: any) => {
        console.log("Processing activity:", activity);
        const date = formatDate(new Date(activity.date));
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(activity);
        return grouped;
      }, {})
    : {};
    
  console.log("Grouped activities:", groupedActivities);

  // Sort dates
  const sortedDates = Object.keys(groupedActivities).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      date: "",
      location: "",
      duration: "",
      cost: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!formData.name || !formData.date) {
        toast({
          title: "Missing information",
          description: "Please provide a name and date for the activity",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Format date properly
      let dateValue = formData.date;
      
      // Create a proper date object
      const dateObj = new Date(dateValue);
      if (isNaN(dateObj.getTime())) {
        toast({
          title: "Invalid date",
          description: "Please enter a valid date and time",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Always use ISO format for consistency
      dateValue = dateObj.toISOString();
      
      // Prepare data for submission
      const activityData = {
        name: formData.name,
        description: formData.description,
        date: dateValue,
        location: formData.location,
        tripId,
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        cost: formData.cost,
      };

      // Get auth token for our token-based authentication
      const token = localStorage.getItem('auth_token');
      
      console.log("Submitting activity data:", activityData);
      
      // Use direct fetch with authentication headers instead of apiRequest
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        method: 'POST',
        headers,
        body: JSON.stringify(activityData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create activity: ${errorData.message || response.status}`);
      }
      
      const createdActivity = await response.json();
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      
      // UI updates
      setIsAddActivityModalOpen(false);
      resetForm();
      
      toast({
        title: "Activity created",
        description: "Your activity has been added to the itinerary",
      });
    } catch (error) {
      console.error("Error creating activity:", error);
      
      // Show more specific error message if possible
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      toast({
        title: "Error creating activity",
        description: errorMessage.includes(":") ? 
          errorMessage.split(":")[1].trim() : 
          "There was a problem creating your activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (isTripLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trip not found</h1>
          <p className="text-gray-600 mb-4">The trip you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Trip Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center">
                <h2 className="text-xl font-bold text-gray-900">{trip.name}</h2>
              </div>
              <p className="text-sm text-gray-600">Itinerary</p>
            </div>
            {isOrganizer && (
              <Button onClick={() => setIsAddActivityModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <TripTabs tripId={tripId} />

        {/* Itinerary Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-8">
          {isActivitiesLoading ? (
            <div className="space-y-6">
              {[1, 2].map((dayIndex) => (
                <div key={dayIndex} className="mb-6">
                  <Skeleton className="h-6 w-40 mb-3" />
                  <div className="space-y-3">
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
                </div>
              ))}
            </div>
          ) : sortedDates.length > 0 ? (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date} className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{date}</h3>
                  <div className="space-y-3">
                    {groupedActivities[date]
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((activity: any) => (
                        <ActivityCard
                          key={activity.id}
                          id={activity.id}
                          name={activity.name}
                          description={activity.description}
                          date={activity.date}
                          location={activity.location}
                          confirmedCount={activity.rsvps?.filter((r: any) => r.status === 'going').length || 0}
                          totalCount={activity.rsvps?.length || 0}
                          rsvps={activity.rsvps}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarPlus className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700">No activities planned yet</h3>
              <p className="text-gray-500 mt-1 mb-4 max-w-md">
                Plan your trip by adding activities to your itinerary.
              </p>
              {isOrganizer && (
                <Button onClick={() => setIsAddActivityModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Activity
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <MobileNavigation />

      {/* Add Activity Modal */}
      <Dialog open={isAddActivityModalOpen} onOpenChange={setIsAddActivityModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Create a new activity for your trip itinerary.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-2">
              <div className="grid gap-3">
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">
                    Activity Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Sagrada Familia Tour"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="date" className="text-sm font-medium text-gray-700 mb-1 block">
                    Date & Time
                  </label>
                  <div className="space-y-2">
                    <Input
                      type="datetime-local"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      min={trip?.startDate ? new Date(trip.startDate).toISOString().slice(0, 16) : undefined}
                      max={trip?.endDate ? new Date(new Date(trip.endDate).setHours(23, 59)).toISOString().slice(0, 16) : undefined}
                      required
                    />
                    
                    {/* Quick date selection options */}
                    {trip && trip.startDate && trip.endDate && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">Quick select from trip dates:</div>
                        {/* Generate buttons for first few days of the trip */}
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const days = getDaysBetweenDates(new Date(trip.startDate), new Date(trip.endDate));
                            
                            // Only show max 4 days for cleaner UI
                            return days.slice(0, Math.min(4, days.length)).map((day: string, index: number) => {
                              const formattedDate = new Date(day);
                              // Set to noon by default for better UX
                              formattedDate.setHours(12, 0, 0, 0);
                              
                              const dateValue = formattedDate.toISOString().slice(0, 16);
                              
                              // Format like "Tue, May 12"
                              const dateFormatter = new Intl.DateTimeFormat('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              });
                              const formattedDateStr = dateFormatter.format(formattedDate);
                              
                              return (
                                <Button
                                  key={day}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs px-2 py-1 h-auto flex flex-col items-center"
                                  onClick={() => setFormData(prev => ({ ...prev, date: dateValue }))}
                                >
                                  <span className="font-medium">Day {index + 1}</span>
                                  <span className="text-gray-500">{formattedDateStr}</span>
                                </Button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="text-sm font-medium text-gray-700 mb-1 block">
                    Location
                  </label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Activity location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-1 block">
                      Duration (minutes)
                    </label>
                    <Input
                      type="number"
                      id="duration"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="e.g., 120"
                    />
                  </div>

                  <div>
                    <label htmlFor="cost" className="text-sm font-medium text-gray-700 mb-1 block">
                      Cost
                    </label>
                    <Input
                      id="cost"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      placeholder="e.g., $25 per person"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="text-sm font-medium text-gray-700 mb-1 block">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide details about this activity"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddActivityModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name || !formData.date}>
                {isSubmitting ? "Adding..." : "Add Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
