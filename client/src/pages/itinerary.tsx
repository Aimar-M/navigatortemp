import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, CalendarPlus, Plane, Clock, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TripDetailLayout from "@/components/trip-detail-layout";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function Itinerary() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id!);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [isAddFlightModalOpen, setIsAddFlightModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flightBookingStatus, setFlightBookingStatus] = useState("unknown"); // "booked" | "not_booked" | "unknown"
  
  const [activityFormData, setActivityFormData] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    duration: "",
    cost: "",
  });

  const [flightFormData, setFlightFormData] = useState({
    flightNumber: "",
    arrivalDate: "",
  });

  // Fetch trip details
  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId && !!user,
  });

  // Fetch trip activities
  const { data: activities = [], isLoading: isActivitiesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/activities`],
    enabled: !!tripId && !!user,
  });

  // Fetch flight information
  const { data: flights = [], isLoading: isFlightsLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/flights`],
    enabled: !!tripId && !!user,
  });

  // Check if current user has added flight info
  const userFlight = flights.find((flight: any) => flight.userId === user?.id);

  // Check if user is organizer
  const isOrganizer = trip && user && trip.organizer === user.id;

  // Add flight mutation
  const addFlightMutation = useMutation({
    mutationFn: async (flightData: any) => {
      return await apiRequest("POST", `/api/trips/${tripId}/flights`, flightData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      setIsAddFlightModalOpen(false);
      setFlightFormData({
        flightNumber: "",
        arrivalDate: "",
      });
      setFlightBookingStatus("unknown");
      toast({
        title: "Flight information added",
        description: "Your flight details have been saved successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add flight information",
        variant: "destructive"
      });
    }
  });

  // Handle adding new activity
  const handleAddActivity = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/trips/${tripId}/activities`, activityFormData);
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      setIsAddActivityModalOpen(false);
      setActivityFormData({
        name: "",
        description: "",
        date: "",
        location: "",
        duration: "",
        cost: "",
      });
      toast({
        title: "Activity added",
        description: "The activity has been added to the itinerary."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add activity",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };

  // Handle adding flight information
  const handleAddFlight = () => {
    if (!flightFormData.flightNumber || !flightFormData.arrivalDate) {
      toast({
        title: "Missing information",
        description: "Please enter your flight number and arrival date",
        variant: "destructive"
      });
      return;
    }

    const flightData = {
      flightNumber: flightFormData.flightNumber.toUpperCase().trim(),
      arrivalDate: flightFormData.arrivalDate,
      status: "booked"
    };

    addFlightMutation.mutate(flightData);
  };

  if (isTripLoading || isActivitiesLoading || isFlightsLoading || !user || !trip) {
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
      description={`Plan your activities and manage flights for ${trip.name}`}
    >
      <Tabs defaultValue="activities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="flights">Flight Information</TabsTrigger>
        </TabsList>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Trip Activities</h2>
                <p className="text-muted-foreground">
                  {isOrganizer ? "Manage activities for your group" : "View planned activities"}
                </p>
              </div>
              {isOrganizer && (
                <Button onClick={() => setIsAddActivityModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              )}
            </div>

            {activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity: any) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    canEdit={isOrganizer}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No activities planned yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {isOrganizer ? "Start planning your trip by adding activities" : "Activities will appear here once the organizer adds them"}
                  </p>
                  {isOrganizer && (
                    <Button onClick={() => setIsAddActivityModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Activity
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Flights Tab */}
        <TabsContent value="flights">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Flight Information</h2>
                <p className="text-muted-foreground">Manage your flight details and view group flights</p>
              </div>
              {!userFlight && (
                <Button onClick={() => setIsAddFlightModalOpen(true)}>
                  <Plane className="h-4 w-4 mr-2" />
                  Add Flight Info
                </Button>
              )}
            </div>

            {/* User's Flight Status */}
            {userFlight ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Your Flight Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Flight</p>
                        <p className="font-medium">{userFlight.airline !== 'TBD' ? userFlight.airline : ''} {userFlight.flightNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-medium">{userFlight.flightDetails?.flightStatus || 'Scheduled'}</p>
                      </div>
                    </div>
                    
                    {userFlight.departureAirport !== 'TBD' && userFlight.arrivalAirport !== 'TBD' && (
                      <div className="space-y-3">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Departure</p>
                            <p className="font-medium">{userFlight.departureAirport} ({userFlight.departureCity})</p>
                            <p className="text-sm text-muted-foreground">
                              {userFlight.flightDetails?.departureTime ? 
                                new Date(userFlight.flightDetails.departureTime).toLocaleString() : 
                                new Date(userFlight.departureTime).toLocaleString()
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Arrival</p>
                            <p className="font-medium">{userFlight.arrivalAirport} ({userFlight.arrivalCity})</p>
                            <p className="text-sm text-muted-foreground">
                              {userFlight.flightDetails?.arrivalTime ? 
                                new Date(userFlight.flightDetails.arrivalTime).toLocaleString() : 
                                new Date(userFlight.arrivalTime).toLocaleString()
                              }
                            </p>
                          </div>
                        </div>
                        
                        {(userFlight.flightDetails?.gate || userFlight.flightDetails?.terminal) && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Gate</p>
                              <p className="font-medium">{userFlight.flightDetails?.gate || 'TBD'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Terminal</p>
                              <p className="font-medium">{userFlight.flightDetails?.terminal || 'TBD'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {userFlight.flightDetails?.hasRealTimeData && (
                      <div className="text-xs text-green-600">
                        ✓ Real-time flight data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No flight information added</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your flight details to help coordinate with your group
                  </p>
                  <Button onClick={() => setIsAddFlightModalOpen(true)}>
                    <Plane className="h-4 w-4 mr-2" />
                    Add Flight Details
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Group Flight Information */}
            {flights && flights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Group Flight Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {flights.map((flight: any) => (
                      <div key={flight.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{flight.user?.name || flight.user?.username}</p>
                          <Badge variant={(flight.flightDetails?.status === "booked" || flight.flightNumber) ? "default" : "secondary"}>
                            {(flight.flightDetails?.status === "booked" || flight.flightNumber) ? "Booked" : "Searching"}
                          </Badge>
                        </div>
                        {(flight.flightDetails?.status === "booked" || flight.flightNumber) && (
                          <div className="space-y-2">
                            <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <p>Flight: {flight.airline !== 'TBD' ? flight.airline : ''} {flight.flightNumber}</p>
                              <p>Status: {flight.flightDetails?.flightStatus || 'Scheduled'}</p>
                            </div>
                            
                            {flight.flightDetails?.verifiedAirline && (
                              <div className="text-sm text-green-600">
                                ✓ Airline verified: {flight.flightDetails.verifiedAirline}
                              </div>
                            )}
                            
                            {flight.flightDetails?.userProvidedArrivalDate && (
                              <div className="text-sm text-muted-foreground">
                                User provided date: {new Date(flight.flightDetails.userProvidedArrivalDate).toLocaleDateString()}
                              </div>
                            )}
                            
                            {flight.flightDetails?.delay > 0 && (
                              <div className="text-xs text-orange-600">
                                ⚠ Delayed by {flight.flightDetails.delay} minutes
                              </div>
                            )}
                            
                            {flight.flightDetails?.hasRealTimeData && (
                              <div className="text-xs text-green-600">
                                ✓ Real-time data
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Activity Dialog */}
      <Dialog open={isAddActivityModalOpen} onOpenChange={setIsAddActivityModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
            <DialogDescription>Add an activity to the trip itinerary</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Activity Name</Label>
              <Input
                value={activityFormData.name}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Visit Eiffel Tower"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={activityFormData.description}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the activity..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={activityFormData.date}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Duration</Label>
                <Input
                  value={activityFormData.duration}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 2 hours"
                />
              </div>
            </div>
            
            <div>
              <Label>Location</Label>
              <Input
                value={activityFormData.location}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Activity location"
              />
            </div>
            
            <div>
              <Label>Cost (optional)</Label>
              <Input
                value={activityFormData.cost}
                onChange={(e) => setActivityFormData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="e.g., $25 per person"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddActivityModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddActivity}
              disabled={isSubmitting || !activityFormData.name || !activityFormData.date}
            >
              {isSubmitting ? "Adding..." : "Add Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Flight Dialog */}
      <Dialog open={isAddFlightModalOpen} onOpenChange={setIsAddFlightModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Flight Information</DialogTitle>
            <DialogDescription>
              Add your flight details to coordinate with your group
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Flight Booking Status */}
            <div>
              <Label className="text-base font-medium">Have you already booked your flight?</Label>
              <RadioGroup 
                value={flightBookingStatus} 
                onValueChange={setFlightBookingStatus}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="booked" id="booked" />
                  <Label htmlFor="booked">Yes, I have booked my flight</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_booked" id="not_booked" />
                  <Label htmlFor="not_booked">No, I need to book a flight</Label>
                </div>
              </RadioGroup>
            </div>

            {flightBookingStatus === "booked" && (
              <div className="space-y-4">
                <div>
                  <Label>Flight Number</Label>
                  <Input
                    value={flightFormData.flightNumber}
                    onChange={(e) => setFlightFormData(prev => ({ ...prev, flightNumber: e.target.value }))}
                    placeholder="e.g., AA123, BA456, etc."
                  />
                </div>

                <div>
                  <Label>Arrival Date</Label>
                  <Input
                    type="date"
                    value={flightFormData.arrivalDate}
                    onChange={(e) => setFlightFormData(prev => ({ ...prev, arrivalDate: e.target.value }))}
                    placeholder="When does your flight arrive?"
                  />
                </div>
              </div>
            )}

            {flightBookingStatus === "not_booked" && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Flight Search & Booking</h3>
                    <p className="text-muted-foreground mb-4">
                      We'll help you find and book the best flights for your trip
                    </p>
                    <Badge variant="secondary">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Flight API integration required
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFlightModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFlight}
              disabled={addFlightMutation.isPending || flightBookingStatus === "unknown"}
            >
              {addFlightMutation.isPending ? "Saving..." : 
               flightBookingStatus === "booked" ? "Save Flight Details" : 
               flightBookingStatus === "not_booked" ? "Search Flights" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TripDetailLayout>
  );
}