import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { 
  Plane, Calendar, Search, PlusCircle, 
  DollarSign, Building, Utensils, Ticket, 
  Home, Bus, ShoppingBag, PieChart
} from "lucide-react";

interface ComprehensiveBudgetViewProps {
  tripId: number;
  destination: string;
}

const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().min(1, "Currency is required"),
  paidBy: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

const flightSchema = z.object({
  airline: z.string().min(1, "Airline is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  departureCity: z.string().min(1, "Departure city is required"),
  arrivalCity: z.string().min(1, "Arrival city is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  price: z.string().optional(),
  currency: z.string().optional(),
});

const ComprehensiveBudgetView: React.FC<ComprehensiveBudgetViewProps> = ({ tripId, destination }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [totalBudget, setTotalBudget] = useState<string>("0");

  // Fetch trip activities to show their costs
  const { data: activities } = useQuery({
    queryKey: ['/api/trips', tripId, 'activities'],
    enabled: !!tripId,
  });

  // Expense form
  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: "",
      category: "accommodation",
      amount: "",
      currency: "USD",
      paidBy: "",
      date: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  // Flight form
  const flightForm = useForm<z.infer<typeof flightSchema>>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      airline: "",
      flightNumber: "",
      departureCity: "",
      arrivalCity: destination,
      departureDate: new Date().toISOString().split('T')[0],
      price: "",
      currency: "USD",
    },
  });

  const onSubmitExpense = (data: z.infer<typeof expenseSchema>) => {
    // Add the new expense to our local state
    setExpenses([
      ...expenses,
      {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      },
    ]);
    setShowExpenseForm(false);
    expenseForm.reset();
  };

  const onSubmitFlight = (data: z.infer<typeof flightSchema>) => {
    // Add the new flight to our local state
    setFlights([
      ...flights,
      {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
      },
    ]);
    setShowFlightForm(false);
    flightForm.reset();
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
        price: "299",
        currency: "USD",
      },
      {
        id: 2,
        airline: "Global Airways",
        flightNumber: "GA456",
        departureCity: "Chicago",
        arrivalCity: destination,
        departureDate: "2025-06-15",
        price: "349",
        currency: "USD",
      },
      {
        id: 3,
        airline: "Express Air",
        flightNumber: "EA789",
        departureCity: "Los Angeles",
        arrivalCity: destination,
        departureDate: "2025-06-16",
        price: "399",
        currency: "USD",
      },
    ];

    setFlights(mockFlights);
  };

  // Calculate total expenses
  const getTotalExpenses = () => {
    let total = 0;
    expenses.forEach(expense => {
      if (expense.amount && expense.currency === "USD") {
        total += parseFloat(expense.amount);
      }
    });
    
    flights.forEach(flight => {
      if (flight.price && flight.currency === "USD") {
        total += parseFloat(flight.price);
      }
    });

    // Include activities costs if available
    if (activities && Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        if (activity.cost && activity.currency === "USD") {
          total += parseFloat(activity.cost);
        }
      });
    }

    return total.toFixed(2);
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "accommodation":
        return <Home className="h-4 w-4" />;
      case "food":
        return <Utensils className="h-4 w-4" />;
      case "transportation":
        return <Bus className="h-4 w-4" />;
      case "activities":
        return <Ticket className="h-4 w-4" />;
      case "shopping":
        return <ShoppingBag className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Calculate expenses by category
  const getExpensesByCategory = () => {
    const categories: {[key: string]: number} = {
      accommodation: 0,
      food: 0,
      transportation: 0,
      activities: 0,
      shopping: 0,
      other: 0,
    };

    expenses.forEach(expense => {
      if (expense.amount && expense.currency === "USD") {
        const category = expense.category || "other";
        categories[category] = (categories[category] || 0) + parseFloat(expense.amount);
      }
    });

    // Add flights to transportation
    flights.forEach(flight => {
      if (flight.price && flight.currency === "USD") {
        categories.transportation = (categories.transportation || 0) + parseFloat(flight.price);
      }
    });

    // Include activities
    if (activities && Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        if (activity.cost && activity.currency === "USD") {
          categories.activities = (categories.activities || 0) + parseFloat(activity.cost);
        }
      });
    }

    return categories;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Input 
                className="max-w-[100px]" 
                placeholder="Budget" 
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)} 
              />
              <span className="text-2xl font-bold">USD</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalExpenses()}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget && parseFloat(totalBudget) > 0
                ? `${Math.round((parseFloat(getTotalExpenses()) / parseFloat(totalBudget)) * 100)}% of budget`
                : "Set a budget to track"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Flight Costs
            </CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${flights.reduce((total, flight) => total + (flight.price ? parseFloat(flight.price) : 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {flights.length} {flights.length === 1 ? "flight" : "flights"} added
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Activities
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${activities && Array.isArray(activities) 
                ? activities.reduce((total, activity: any) => total + (activity.cost ? parseFloat(activity.cost) : 0), 0).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {activities && Array.isArray(activities) ? activities.length : 0} planned activities
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">
            <DollarSign className="h-4 w-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="flights">
            <Plane className="h-4 w-4 mr-2" />
            Flights
          </TabsTrigger>
          <TabsTrigger value="breakdown">
            <PieChart className="h-4 w-4 mr-2" />
            Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Expenses</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowExpenseForm(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {showExpenseForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add Expense</CardTitle>
                <CardDescription>
                  Track your expenses for this trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4">
                    <FormField
                      control={expenseForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expense Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Hotel Booking" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="accommodation">Accommodation</SelectItem>
                                <SelectItem value="food">Food & Dining</SelectItem>
                                <SelectItem value="transportation">Transportation</SelectItem>
                                <SelectItem value="activities">Activities</SelectItem>
                                <SelectItem value="shopping">Shopping</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="CAD">CAD</SelectItem>
                                <SelectItem value="AUD">AUD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={expenseForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowExpenseForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Expense</Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Activity expenses from trip plan */}
          {activities && Array.isArray(activities) && activities.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Planned Activity Costs</h4>
              <div className="space-y-3">
                {activities.map((activity: any) => (
                  <Card key={activity.id} className="overflow-hidden">
                    <div className="p-4 flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          <Ticket className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {activity.cost ? (
                          <p className="font-semibold">${parseFloat(activity.cost).toFixed(2)}</p>
                        ) : (
                          <p className="text-muted-foreground text-sm">No cost specified</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* User added expenses */}
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Card key={expense.id} className="overflow-hidden">
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-2 rounded-full mr-3">
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div>
                        <p className="font-medium">{expense.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${parseFloat(expense.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{expense.currency}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="font-medium text-xl mb-2">No expenses added yet</h3>
                <p className="text-gray-500 mb-4">
                  Start tracking your expenses for this trip
                </p>
                <Button onClick={() => setShowExpenseForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add First Expense
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flights" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Flights</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFlightForm(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Flight
            </Button>
          </div>

          {showFlightForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add Flight Information</CardTitle>
                <CardDescription>
                  Add your flight details to include in your budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...flightForm}>
                  <form onSubmit={flightForm.handleSubmit(onSubmitFlight)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={flightForm.control}
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
                        control={flightForm.control}
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
                        control={flightForm.control}
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
                        control={flightForm.control}
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
                      control={flightForm.control}
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={flightForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={flightForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="CAD">CAD</SelectItem>
                                <SelectItem value="AUD">AUD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowFlightForm(false)}
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

          <Card className="mb-6">
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

              {/* Display Flights */}
              {flights.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium mb-2">Available Flights</h3>
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
                            ${flight.price}
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setFlights(prev => [
                                ...prev.filter(f => f.id !== flight.id),
                                { ...flight, createdAt: new Date().toISOString() }
                              ]);
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
                <div className="flex flex-col items-center justify-center text-center pt-4 pb-4">
                  <Search className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="font-medium text-xl mb-2">Search for flights</h3>
                  <p className="text-gray-500">
                    Search for flights to see available options and prices
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Summary</CardTitle>
                <CardDescription>Breakdown of all trip expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(getExpensesByCategory()).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          {getCategoryIcon(category)}
                        </div>
                        <span className="capitalize">{category}</span>
                      </div>
                      <div className="font-semibold">${amount.toFixed(2)}</div>
                    </div>
                  ))}
                  
                  <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between font-bold">
                    <span>Total</span>
                    <span>${getTotalExpenses()}</span>
                  </div>

                  {totalBudget && parseFloat(totalBudget) > 0 && (
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Budget</span>
                        <span>${totalBudget}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Remaining</span>
                        <span>${(parseFloat(totalBudget) - parseFloat(getTotalExpenses())).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Tips</CardTitle>
                <CardDescription>Helpful tips to manage your travel budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start pb-2 border-b border-gray-100">
                    <div className="bg-primary/10 p-2 rounded-full mr-3 shrink-0">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Set a daily spending limit</p>
                      <p className="text-sm text-muted-foreground">
                        Divide your budget by the number of days to get a daily allowance
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start pb-2 border-b border-gray-100">
                    <div className="bg-primary/10 p-2 rounded-full mr-3 shrink-0">
                      <Building className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Look for accommodations with kitchens</p>
                      <p className="text-sm text-muted-foreground">
                        Save on dining costs by preparing some meals yourself
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-3 shrink-0">
                      <Plane className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Book flights in advance</p>
                      <p className="text-sm text-muted-foreground">
                        Flights are typically cheaper when booked 2-3 months ahead
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveBudgetView;