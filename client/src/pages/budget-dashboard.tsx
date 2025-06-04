import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Calendar, DollarSign, TrendingUp, MapPin, Users, Plane } from "lucide-react";

interface TripBudget {
  tripId: number;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  memberCount: number;
  budgetData: {
    accommodation: number;
    food: number;
    transportation: number;
    activities: number;
    incidentals: number;
    total: number;
    currency: string;
  };
  status: 'upcoming' | 'ongoing' | 'past';
}

export default function BudgetDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<'overview' | 'monthly' | 'by-trip'>('overview');

  // Fetch all user trips with budget data
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips", "budget-dashboard"],
    enabled: !!user,
  });

  // Fetch budget data for all trips
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ["/api/budget/dashboard"],
    enabled: !!user,
  });

  // Process real budget data for dashboard visualization
  const processedData = useMemo(() => {
    if (!budgetData || !Array.isArray(budgetData)) return null;
    
    const currentYear = parseInt(selectedYear);
    const yearTrips = budgetData.filter((trip: any) => {
      const tripYear = new Date(trip.startDate).getFullYear();
      return tripYear === currentYear;
    });

    // Calculate totals by category
    const categoryTotals = {
      accommodation: 0,
      food: 0,
      transportation: 0,
      activities: 0,
      incidentals: 0,
      flights: 0
    };

    // Calculate monthly breakdown with individual trip data
    const monthlyData: Record<string, any> = {};
    const tripColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff6b6b', '#8dd1e1', '#d084d0'];
    
    // Process each trip using real budget data
    const processedTrips = yearTrips.map((trip: any, index: number) => {
      const startDate = new Date(trip.startDate);
      const total = trip.budgetData.total;

      // Add to category totals
      Object.entries(trip.budgetData).forEach(([key, value]) => {
        if (key !== 'total' && key !== 'actualSpent' && key !== 'currency' && typeof value === 'number') {
          categoryTotals[key as keyof typeof categoryTotals] += value;
        }
      });

      // Add to monthly data with individual trip tracking
      const monthKey = startDate.toLocaleDateString('en-US', { month: 'short' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { 
          month: monthKey, 
          total: 0, 
          trips: [],
          tripDetails: []
        };
      }
      
      const tripColor = tripColors[index % tripColors.length];
      const tripEntry = {
        name: trip.tripName,
        amount: total,
        color: tripColor,
        destination: trip.destination
      };
      
      monthlyData[monthKey].total += total;
      monthlyData[monthKey].trips.push(tripEntry);
      monthlyData[monthKey].tripDetails.push({
        [`trip_${index}`]: total,
        [`trip_${index}_name`]: trip.tripName,
        [`trip_${index}_color`]: tripColor
      });

      return {
        tripId: trip.tripId,
        tripName: trip.tripName,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        memberCount: trip.memberCount,
        duration: trip.duration,
        budgetData: trip.budgetData,
        status: trip.status
      };
    });

    const totalBudget = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    // Format monthly data for stacked bar chart
    const formattedMonthlyData = Object.values(monthlyData).map((monthData: any) => {
      const barData: any = { month: monthData.month, total: monthData.total };
      
      // Add each trip as a separate data point for stacking
      monthData.trips.forEach((trip: any, index: number) => {
        barData[`trip_${index}`] = trip.amount;
        barData[`trip_${index}_name`] = trip.name;
        barData[`trip_${index}_color`] = trip.color;
      });
      
      return barData;
    }).sort((a: any, b: any) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });

    return {
      trips: processedTrips,
      categoryTotals,
      totalBudget,
      monthlyData: formattedMonthlyData,
      rawMonthlyData: monthlyData,
      upcomingTrips: processedTrips.filter(trip => trip.status === 'upcoming'),
      ongoingTrips: processedTrips.filter(trip => trip.status === 'ongoing'),
      pastTrips: processedTrips.filter(trip => trip.status === 'past')
    };
  }, [budgetData, selectedYear]);

  // Chart data preparation
  const pieChartData = processedData ? Object.entries(processedData.categoryTotals).map(([category, amount]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: amount,
    percentage: ((amount / processedData.totalBudget) * 100).toFixed(1)
  })) : [];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88', '#ff6b6b'];

  // Available years for selection
  const availableYears = useMemo(() => {
    if (!trips || !Array.isArray(trips)) return [new Date().getFullYear().toString()];
    
    const years = new Set<number>();
    trips.forEach((trip: any) => {
      const year = new Date(trip.startDate).getFullYear();
      years.add(year);
    });
    
    // Add current year if not present
    years.add(new Date().getFullYear());
    
    return Array.from(years).sort((a, b) => b - a).map(year => year.toString());
  }, [trips]);

  if (authLoading || tripsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to view your budget dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-4 pb-16 md:pb-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Travel Budget Dashboard</h1>
              <p className="text-gray-600">Track and visualize your travel spending across all trips</p>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="monthly">Monthly View</SelectItem>
                  <SelectItem value="by-trip">By Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          {processedData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Budget {selectedYear}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${processedData.totalBudget.toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Trips</p>
                      <p className="text-2xl font-bold text-gray-900">{processedData.trips.length}</p>
                    </div>
                    <Plane className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming Trips</p>
                      <p className="text-2xl font-bold text-gray-900">{processedData.upcomingTrips.length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg per Trip</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${processedData.trips.length > 0 ? Math.round(processedData.totalBudget / processedData.trips.length).toLocaleString() : '0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts Section */}
          {viewMode === 'overview' && processedData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Spending Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spending Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processedData.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length > 0) {
                            const monthData = processedData.rawMonthlyData[label];
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                <p className="font-semibold">{label}</p>
                                <p className="text-sm text-gray-600 mb-2">
                                  Total: ${monthData?.total?.toLocaleString()}
                                </p>
                                {monthData?.trips?.map((trip: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: trip.color }}
                                    />
                                    <span>{trip.name}: ${trip.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Dynamically render bars for each trip */}
                      {processedData.monthlyData.length > 0 && 
                        Object.keys(processedData.monthlyData[0])
                          .filter(key => key.startsWith('trip_') && !key.includes('_name') && !key.includes('_color'))
                          .map((tripKey, index) => {
                            const colorKey = `${tripKey}_color`;
                            const nameKey = `${tripKey}_name`;
                            const color = processedData.monthlyData[0][colorKey] || COLORS[index % COLORS.length];
                            const tripName = processedData.monthlyData[0][nameKey] || `Trip ${index + 1}`;
                            
                            return (
                              <Bar 
                                key={tripKey} 
                                dataKey={tripKey} 
                                stackId="trips"
                                fill={color}
                                name={tripName}
                              />
                            );
                          })
                      }
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Trip List */}
          {viewMode === 'by-trip' && processedData && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Trips in {selectedYear}</h2>
              {processedData.trips.map((trip) => (
                <Card key={trip.tripId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{trip.tripName}</CardTitle>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {trip.destination}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={trip.status === 'upcoming' ? 'default' : trip.status === 'ongoing' ? 'destructive' : 'secondary'}>
                          {trip.status}
                        </Badge>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          ${trip.budgetData.total.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {Object.entries(trip.budgetData).filter(([key]) => key !== 'total' && key !== 'currency').map(([category, amount]) => (
                        <div key={category} className="text-center">
                          <p className="text-sm text-gray-600 capitalize">{category}</p>
                          <p className="font-semibold">${amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No data state */}
          {processedData && processedData.trips.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips found for {selectedYear}</h3>
                <p className="text-gray-600 mb-4">Start planning your next adventure to see budget insights here.</p>
                <Button onClick={() => window.location.href = '/create-trip'}>
                  Plan a Trip
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
}