import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Edit, MoreVertical, Trash2, Plane } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// We'll import UserAvatar from the correct path later
import UserAvatar from "../user-avatar";

type FlightWithUser = {
  id: number;
  tripId: number;
  userId: number;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  price: string | null;
  currency: string;
  bookingReference: string | null;
  bookingStatus: string;
  seatNumber: string | null;
  notes: string | null;
  flightDetails: any | null;
  createdAt: string;
  updatedAt: string;
  // User details added by API
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
};

interface FlightInfoProps {
  tripId: number;
  currentUserId: number;
}

const FlightInfo: React.FC<FlightInfoProps> = ({ tripId, currentUserId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFlight, setSelectedFlight] = useState<FlightWithUser | null>(null);

  // Fetch flights for this trip
  const { data: flights, isLoading, error } = useQuery({
    queryKey: ['/api/trips', tripId, 'flights'],
    enabled: !!tripId,
  });

  // Mutation for deleting a flight
  const deleteFlightMutation = useMutation({
    mutationFn: async (flightId: number) => {
      return await apiRequest(`/api/flights/${flightId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Flight deleted",
        description: "The flight has been successfully deleted.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'flights'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting flight",
        description: "There was an error deleting the flight information. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting flight:", error);
    }
  });

  const handleDelete = (flight: FlightWithUser) => {
    if (window.confirm("Are you sure you want to delete this flight information?")) {
      deleteFlightMutation.mutate(flight.id);
    }
  };

  // Check if user can edit/delete a flight
  const canModifyFlight = (flight: FlightWithUser) => {
    return flight.userId === currentUserId;
  };

  // Calculate flight duration safely
  const getFlightDuration = (departure: string, arrival: string) => {
    try {
      const departureTime = new Date(departure);
      const arrivalTime = new Date(arrival);
      
      // Check if dates are valid
      if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
        return "Duration unknown";
      }
      
      const durationMs = arrivalTime.getTime() - departureTime.getTime();
      
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error("Error calculating flight duration:", error);
      return "Duration unknown";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Flight Information</h3>
          <Skeleton className="h-9 w-24" />
        </div>
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Flights</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was an error loading the flight information. Please try again later.</p>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'flights'] })}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Flight Information</h3>
      </div>

      {flights && flights.length > 0 ? (
        <div className="space-y-4">
          {flights.map((flight: FlightWithUser) => (
            <Card key={flight.id} className="overflow-hidden">
              <div className="p-6 relative">
                {canModifyFlight(flight) && (
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(flight)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Flight
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <div className="flex items-center mb-4">
                  <UserAvatar user={flight.user} />
                  <div className="ml-2">
                    <span className="text-sm font-medium">
                      {flight.user?.name || flight.user?.username || "Unknown User"}
                    </span>
                    <div className="text-xs text-gray-500">
                      {format(new Date(flight.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium">{flight.airline}</div>
                  <div className="text-sm text-muted-foreground">
                    Flight {flight.flightNumber}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <div className="text-lg font-semibold">
                      {(() => {
                        try {
                          const date = new Date(flight.departureTime);
                          return isNaN(date.getTime()) ? "Time N/A" : format(date, "HH:mm");
                        } catch (e) {
                          return "Time N/A";
                        }
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        try {
                          const date = new Date(flight.departureTime);
                          return isNaN(date.getTime()) ? "Date N/A" : format(date, "MMM d, yyyy");
                        } catch (e) {
                          return "Date N/A";
                        }
                      })()}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {flight.departureCity || "City N/A"}
                    </div>
                    <div className="text-xs">
                      {flight.departureAirport || "Airport N/A"}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <div className="relative w-full text-center">
                      <div className="border-t border-dashed border-gray-300 absolute w-full top-1/2"></div>
                      <div className="flex justify-center mb-2">
                        <Plane className="text-blue-500 rotate-90 bg-white relative z-10" />
                      </div>
                      <div className="text-xs text-gray-500 relative z-10 bg-white inline-block px-2">
                        {getFlightDuration(flight.departureTime, flight.arrivalTime)}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 text-right">
                    <div className="text-lg font-semibold">
                      {(() => {
                        try {
                          const date = new Date(flight.arrivalTime);
                          return isNaN(date.getTime()) ? "Time N/A" : format(date, "HH:mm");
                        } catch (e) {
                          return "Time N/A";
                        }
                      })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        try {
                          const date = new Date(flight.arrivalTime);
                          return isNaN(date.getTime()) ? "Date N/A" : format(date, "MMM d, yyyy");
                        } catch (e) {
                          return "Date N/A";
                        }
                      })()}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {flight.arrivalCity || "City N/A"}
                    </div>
                    <div className="text-xs">
                      {flight.arrivalAirport || "Airport N/A"}
                    </div>
                  </div>
                </div>

                {(flight.price || flight.bookingReference || flight.seatNumber) && (
                  <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
                    {flight.price && (
                      <div>
                        <div className="text-sm text-gray-500">Price</div>
                        <div>{flight.currency} {parseFloat(flight.price).toFixed(2)}</div>
                      </div>
                    )}
                    {flight.bookingReference && (
                      <div>
                        <div className="text-sm text-gray-500">Booking Reference</div>
                        <div>{flight.bookingReference}</div>
                      </div>
                    )}
                    {flight.seatNumber && (
                      <div>
                        <div className="text-sm text-gray-500">Seat</div>
                        <div>{flight.seatNumber}</div>
                      </div>
                    )}
                  </div>
                )}

                {flight.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">Notes</div>
                    <div className="mt-1">{flight.notes}</div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Flight Information</CardTitle>
            <CardDescription>
              No flights have been added to this trip yet. Use the flight search to find and add flights.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default FlightInfo;