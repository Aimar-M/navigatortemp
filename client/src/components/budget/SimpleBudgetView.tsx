import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plane, Calendar, Search, PlusCircle } from "lucide-react";

interface SimpleBudgetViewProps {
  tripId: number;
  destination: string;
}

const flightSchema = z.object({
  airline: z.string().min(1, "Airline is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  departureCity: z.string().min(1, "Departure city is required"),
  arrivalCity: z.string().min(1, "Arrival city is required"),
  departureDate: z.string().min(1, "Departure date is required"),
});

const SimpleBudgetView: React.FC<SimpleBudgetViewProps> = ({ tripId, destination }) => {
  const [flights, setFlights] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      airline: "",
      flightNumber: "",
      departureCity: "",
      arrivalCity: destination,
      departureDate: "",
    },
  });

  const onSubmit = (data: z.infer<typeof flightSchema>) => {
    // Add the new flight to our local state
    setFlights([
      ...flights,
      {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      },
    ]);
    setShowForm(false);
    form.reset();
  };

  const searchFlights = () => {
    // Simulate searching for flights
    const mockFlights = [
      {
        id: 1,
        airline: "SkyAir",
        flightNumber: "SA123",
        departureCity: "New York",
        arrivalCity: destination,
        departureDate: "2025-06-15",
        price: "$299",
      },
      {
        id: 2,
        airline: "Global Airways",
        flightNumber: "GA456",
        departureCity: "Chicago",
        arrivalCity: destination,
        departureDate: "2025-06-15",
        price: "$349",
      },
      {
        id: 3,
        airline: "Express Air",
        flightNumber: "EA789",
        departureCity: "Los Angeles",
        arrivalCity: destination,
        departureDate: "2025-06-16",
        price: "$399",
      },
    ];

    setFlights(mockFlights);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="flights">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flights">
            <Plane className="h-4 w-4 mr-2" />
            My Flights
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Find Flights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flights" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Saved Flights</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowForm(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Flight
            </Button>
          </div>

          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add Flight Information</CardTitle>
                <CardDescription>
                  Add your flight details to share with trip members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="airline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Airline</FormLabel>
                            <FormControl>
                              <Input placeholder="Delta Airlines" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="flightNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flight Number</FormLabel>
                            <FormControl>
                              <Input placeholder="DL123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
                        name="arrivalCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Arrival City</FormLabel>
                            <FormControl>
                              <Input placeholder={destination} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="departureDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departure Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Flight</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {flights.length > 0 ? (
            <div className="space-y-4">
              {flights.map((flight) => (
                <Card key={flight.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold">{flight.airline}</p>
                        <p className="text-sm text-gray-500">Flight {flight.flightNumber}</p>
                      </div>
                      {flight.price && (
                        <p className="font-semibold text-lg">{flight.price}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-4">
                      <div className="flex-1">
                        <p className="font-medium">{flight.departureCity}</p>
                        <p className="text-sm text-gray-500">{flight.departureDate}</p>
                      </div>
                      
                      <div className="flex-1 flex justify-center">
                        <div className="w-16 h-0.5 bg-gray-300 relative">
                          <Plane className="absolute -top-[10px] text-blue-500 transform rotate-90 w-5 h-5" />
                        </div>
                      </div>
                      
                      <div className="flex-1 text-right">
                        <p className="font-medium">{flight.arrivalCity}</p>
                        <p className="text-sm text-gray-500">Destination</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <Plane className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="font-medium text-xl mb-2">No flights added yet</h3>
                <p className="text-gray-500 mb-4">
                  Add your flight details or search for flights to {destination}
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Flight Details
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Flights to {destination}</CardTitle>
              <CardDescription>
                Search for available flights to your destination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel>From</FormLabel>
                    <Input placeholder="Departure City" />
                  </div>
                  <div>
                    <FormLabel>To</FormLabel>
                    <Input placeholder={destination} defaultValue={destination} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Departure Date</FormLabel>
                    <div className="flex">
                      <Input type="date" className="rounded-r-none" />
                      <Button className="rounded-l-none" variant="outline">
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" onClick={searchFlights}>
                      <Search className="h-4 w-4 mr-2" />
                      Search Flights
                    </Button>
                  </div>
                </div>
              </div>

              {flights.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium mb-2">Search Results</h3>
                  {flights.map((flight) => (
                    <Card key={flight.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row border-b border-gray-100">
                        <div className="p-4 md:p-6 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{flight.airline}</div>
                            <div className="text-sm text-muted-foreground">
                              Flight {flight.flightNumber}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center">
                            <div className="flex-1">
                              <p className="font-medium">{flight.departureCity}</p>
                              <p className="text-sm text-gray-500">{flight.departureDate}</p>
                            </div>
                            
                            <div className="flex-1 flex justify-center">
                              <div className="w-16 h-0.5 bg-gray-300 relative">
                                <Plane className="absolute -top-[10px] text-blue-500 transform rotate-90 w-5 h-5" />
                              </div>
                            </div>
                            
                            <div className="flex-1 text-right">
                              <p className="font-medium">{flight.arrivalCity}</p>
                              <p className="text-sm text-gray-500">Destination</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 md:p-6 bg-gray-50 md:w-48 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start">
                          <div className="text-lg font-semibold">
                            {flight.price}
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setFlights(prev => [
                                ...prev.filter(f => f.id !== flight.id),
                                { ...flight, createdAt: new Date().toISOString() }
                              ]);
                              setShowForm(false);
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center pt-8 pb-8">
                  <Search className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="font-medium text-xl mb-2">No search results yet</h3>
                  <p className="text-gray-500">
                    Search for flights to see available options
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleBudgetView;