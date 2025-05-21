import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Plane, Search, Plus } from "lucide-react";

// Define form schema for flight search
const flightSearchSchema = z.object({
  departureCity: z.string().min(2, "Please enter a departure city"),
  arrivalCity: z.string().min(2, "Please enter an arrival city"),
  date: z.date({
    required_error: "Please select a date",
  }),
});

type FlightSearchFormData = z.infer<typeof flightSearchSchema>;

// Define schema for flight booking
const flightBookingSchema = z.object({
  airline: z.string().min(1, "Airline is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  departureAirport: z.string().min(1, "Departure airport is required"),
  departureCity: z.string().min(1, "Departure city is required"),
  departureTime: z.date({
    required_error: "Departure time is required",
  }),
  arrivalAirport: z.string().min(1, "Arrival airport is required"),
  arrivalCity: z.string().min(1, "Arrival city is required"),
  arrivalTime: z.date({
    required_error: "Arrival time is required",
  }),
  price: z.string().optional(),
  currency: z.string().default("USD"),
  bookingReference: z.string().optional(),
  seatNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Define type for flight search results
type FlightSearchResult = {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  price: number;
  currency: string;
};

interface FlightSearchProps {
  tripId: number;
}

const FlightSearch: React.FC<FlightSearchProps> = ({ tripId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchResults, setSearchResults] = useState<FlightSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightSearchResult | null>(null);

  // Form for flight search
  const searchForm = useForm<FlightSearchFormData>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: {
      departureCity: "",
      arrivalCity: "",
      date: new Date(),
    },
  });

  // Mutation for saving a flight to trip
  const saveFlightMutation = useMutation({
    mutationFn: async (flightData: any) => {
      return await apiRequest(`/api/trips/${tripId}/flights`, {
        method: "POST",
        data: flightData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Flight saved",
        description: "Flight information has been added to your trip.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'flights'] });
      setSelectedFlight(null);
    },
    onError: (error) => {
      toast({
        title: "Error saving flight",
        description: "There was an error saving the flight information. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving flight:", error);
    },
  });

  // Handle flight search
  const onSearchSubmit = async (data: FlightSearchFormData) => {
    setIsSearching(true);
    try {
      const formattedDate = format(data.date, "yyyy-MM-dd");
      const response = await apiRequest(`/api/flights/search?departureCity=${encodeURIComponent(data.departureCity)}&arrivalCity=${encodeURIComponent(data.arrivalCity)}&date=${formattedDate}`, {
        method: "GET",
      });
      setSearchResults(response || []);
    } catch (error) {
      console.error("Flight search error:", error);
      toast({
        title: "Search failed",
        description: "Unable to search for flights. Please try again later.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle saving a flight
  const handleSaveFlight = (flight: FlightSearchResult) => {
    const flightData = {
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      departureAirport: flight.departureAirport,
      departureCity: flight.departureCity,
      departureTime: new Date(flight.departureTime),
      arrivalAirport: flight.arrivalAirport,
      arrivalCity: flight.arrivalCity,
      arrivalTime: new Date(flight.arrivalTime),
      price: flight.price.toString(),
      currency: flight.currency,
      bookingStatus: "confirmed",
    };

    saveFlightMutation.mutate(flightData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search for Flights</CardTitle>
          <CardDescription>
            Find flights for your trip and save the details to share with others.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={searchForm.control}
                  name="departureCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={searchForm.control}
                  name="arrivalCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival City</FormLabel>
                      <FormControl>
                        <Input placeholder="Los Angeles" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={searchForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Departure Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Flights
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Flight Search Results</CardTitle>
            <CardDescription>
              Select a flight to add to your trip.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((flight, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-4 md:p-6 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{flight.airline}</div>
                        <div className="text-sm text-muted-foreground">
                          Flight {flight.flightNumber}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <div className="text-lg font-semibold">
                            {format(new Date(flight.departureTime), "HH:mm")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {flight.departureCity}
                          </div>
                          <div className="text-xs">
                            {flight.departureAirport}
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          <div className="relative w-full">
                            <div className="border-t border-dashed border-gray-300 absolute w-full top-1/2"></div>
                            <div className="flex justify-center">
                              <Plane className="text-blue-500 rotate-90 bg-white relative z-10" />
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 text-right">
                          <div className="text-lg font-semibold">
                            {format(new Date(flight.arrivalTime), "HH:mm")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {flight.arrivalCity}
                          </div>
                          <div className="text-xs">
                            {flight.arrivalAirport}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-6 bg-gray-50 md:w-48 flex flex-col justify-between">
                      <div>
                        <div className="text-lg font-semibold">
                          {flight.currency} {flight.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          per person
                        </div>
                      </div>
                      <Button 
                        className="mt-4 w-full"
                        onClick={() => handleSaveFlight(flight)}
                        disabled={saveFlightMutation.isPending}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Trip
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isSearching && (
        <Card>
          <CardHeader>
            <CardTitle>Searching for Flights...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FlightSearch;