import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Calendar, DollarSign, Info, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AutoBudgetEstimatorProps {
  tripId: number;
  destination: string;
  startDate: string;
  endDate: string;
  memberCount: number;
  activities?: Array<{
    id: number;
    name: string;
    cost: string;
    date: string;
  }>;
}

interface CountryData {
  name: string;
  region: string;
  currencies: Record<string, any>;
  capital: string[];
}

interface BudgetEstimate {
  accommodation: number;
  food: number;
  transportation: number;
  activities: number;
  incidentals: number;
  total: number;
  currency: string;
  perPerson: number;
}

const AutoBudgetEstimator: React.FC<AutoBudgetEstimatorProps> = ({
  tripId,
  destination,
  startDate,
  endDate,
  memberCount,
  activities = []
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [editableEstimate, setEditableEstimate] = useState<BudgetEstimate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValues, setInputValues] = useState({
    accommodation: '',
    food: '',
    transportation: '',
    activities: '',
    incidentals: ''
  });
  const { toast } = useToast();

  // Calculate number of nights using actual trip dates
  const nights = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Calculate the difference in days (nights = end date - start date)
    const diffTime = end.getTime() - start.getTime();
    const calculatedNights = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    console.log('Date calculation:', { startDate, endDate, diffTime, calculatedNights });
    return Math.max(1, calculatedNights);
  }, [startDate, endDate]);

  // Sync editable estimate with original estimate
  useEffect(() => {
    if (estimate) {
      setEditableEstimate({ ...estimate });
      setInputValues({
        accommodation: estimate.accommodation.toString(),
        food: estimate.food.toString(),
        transportation: estimate.transportation.toString(),
        activities: estimate.activities.toString(),
        incidentals: estimate.incidentals.toString()
      });
    }
  }, [estimate]);

  // Current estimate to use for calculations and charts
  const currentEstimate = editableEstimate || estimate;

  const handleEditChange = (category: string, value: string) => {
    if (!editableEstimate) return;
    
    // Update input values for proper display
    setInputValues(prev => ({ ...prev, [category]: value }));
    
    // Convert to number for calculations
    let numValue = 0;
    if (value !== '') {
      numValue = parseFloat(value);
      if (isNaN(numValue)) numValue = 0;
    }
    
    const updatedEstimate = { ...editableEstimate, [category]: numValue };
    
    // Recalculate total and per person
    const total = updatedEstimate.accommodation + updatedEstimate.food + 
                 updatedEstimate.transportation + updatedEstimate.activities + 
                 updatedEstimate.incidentals;
    updatedEstimate.total = total;
    updatedEstimate.perPerson = total / memberCount;
    
    setEditableEstimate(updatedEstimate);
  };

  // Calculate total activity costs from actual itinerary
  const totalActivityCosts = useMemo(() => {
    return activities.reduce((total, activity) => {
      const cost = parseFloat(activity.cost) || 0;
      return total + cost;
    }, 0);
  }, [activities]);

  // Regional cost multipliers based on economic data
  const getRegionalMultiplier = (region: string): number => {
    const multipliers: Record<string, number> = {
      'Europe': 1.2,
      'North America': 1.1,
      'Asia': 0.7,
      'Africa': 0.6,
      'South America': 0.8,
      'Oceania': 1.3,
      'Antarctica': 2.0
    };
    return multipliers[region] || 1.0;
  };

  // Base daily costs in USD (moderate budget)
  const baseCosts = {
    accommodation: 80, // per night
    food: 45, // per day
    transportation: 25, // per day
    activities: 30, // per day
    incidentals: 20 // per day
  };

  const fetchCountryData = async (destination: string) => {
    try {
      // Clean and parse destination
      const cleanDestination = destination.toLowerCase().trim();
      const searchTerms = [];
      
      // Extract country name from common formats
      if (cleanDestination.includes(',')) {
        // Format: "Paris, France" -> extract "France"
        const parts = cleanDestination.split(',');
        const country = parts[parts.length - 1].trim();
        searchTerms.push(country);
      }
      
      // Add the full destination as fallback
      searchTerms.push(cleanDestination);
      
      // Add common country mappings
      const countryMappings: Record<string, string> = {
        'usa': 'united states',
        'america': 'united states',
        'us': 'united states',
        'uk': 'united kingdom',
        'britain': 'united kingdom',
        'england': 'united kingdom',
        'dubai': 'united arab emirates',
        'uae': 'united arab emirates',
        'hong kong': 'china',
        'macau': 'china',
        'puerto rico': 'united states',
        'hawaii': 'united states',
        'alaska': 'united states'
      };
      
      // Add mapped countries
      for (const [key, value] of Object.entries(countryMappings)) {
        if (cleanDestination.includes(key)) {
          searchTerms.unshift(value); // Add to beginning for priority
        }
      }

      let countryInfo = null;
      
      for (const term of searchTerms) {
        try {
          const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(term)}?fields=name,region,currencies,capital`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              countryInfo = data[0];
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }

      return countryInfo;
    } catch (error) {
      console.error('Error fetching country data:', error);
      return null;
    }
  };

  const calculateEstimate = async () => {
    setIsLoading(true);
    
    try {
      // Check if destination is recognizable
      if (!destination || destination.length < 2) {
        toast({
          title: "Destination not recognized",
          description: "Please ask the trip organizer to update the destination with a recognizable country or city name for accurate budget estimates.",
          variant: "destructive",
        });
        setEstimate(null);
        setIsLoading(false);
        return;
      }

      // Always ensure we have valid basic values first
      const validNights = Math.max(1, isNaN(nights) ? 1 : nights);
      const validMemberCount = Math.max(1, isNaN(memberCount) ? 1 : memberCount);
      
      const country = await fetchCountryData(destination);
      setCountryData(country);

      let regionalMultiplier = 1.0;
      let currency = 'USD'; // Always use USD for consistency

      if (country && country.region) {
        regionalMultiplier = getRegionalMultiplier(country.region);
        
        // Keep currency as USD for standardized comparison
        // Note: All estimates are shown in USD regardless of destination currency
      } else {
        // If we can't fetch country data, show helpful message
        toast({
          title: "Destination not recognized",
          description: `We couldn't find economic data for "${destination}". Please ask the trip organizer to enter a more specific destination (e.g., "Paris, France" or "Tokyo, Japan").`,
          variant: "destructive",
        });
        setEstimate(null);
        setIsLoading(false);
        return;
      }

      // Ensure we have valid numbers with additional safety checks
      const validMultiplier = isNaN(regionalMultiplier) ? 1.0 : regionalMultiplier;

      // Calculate per-person costs first, then multiply by number of travelers
      const perPersonAccommodation = Math.round(baseCosts.accommodation * validMultiplier * validNights);
      const perPersonFood = Math.round(baseCosts.food * validMultiplier * (validNights + 1)); // +1 for departure day
      const perPersonTransportation = Math.round(baseCosts.transportation * validMultiplier * (validNights + 1));
      
      // Use actual activity costs if available, otherwise use estimates
      const perPersonActivities = totalActivityCosts > 0 
        ? Math.round(totalActivityCosts / validMemberCount)
        : Math.round(baseCosts.activities * validMultiplier * (validNights + 1));
        
      const perPersonIncidentals = Math.round(baseCosts.incidentals * validMultiplier * (validNights + 1));

      // Calculate total costs for the entire group
      const accommodationCost = perPersonAccommodation * validMemberCount;
      const foodCost = perPersonFood * validMemberCount;
      const transportationCost = perPersonTransportation * validMemberCount;
      const activitiesCost = totalActivityCosts > 0 
        ? Math.round(totalActivityCosts)
        : perPersonActivities * validMemberCount;
      const incidentalsCost = perPersonIncidentals * validMemberCount;

      const totalCost = accommodationCost + foodCost + transportationCost + activitiesCost + incidentalsCost;
      const perPersonCost = Math.round(totalCost / validMemberCount);

      const budgetEstimate: BudgetEstimate = {
        accommodation: accommodationCost,
        food: foodCost,
        transportation: transportationCost,
        activities: activitiesCost,
        incidentals: incidentalsCost,
        total: totalCost,
        currency: currency,
        perPerson: perPersonCost
      };

      setEstimate(budgetEstimate);

      toast({
        title: "Budget estimate generated!",
        description: `Estimated budget for ${destination} calculated successfully.`
      });

    } catch (error) {
      console.error('Error calculating estimate:', error);
      toast({
        title: "Estimation failed",
        description: "Could not generate budget estimate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (destination && startDate && endDate && memberCount > 0) {
      calculateEstimate();
    }
  }, [destination, startDate, endDate, memberCount]);

  const formatCurrency = (amount: number, currency: string) => {
    try {
      // Validate currency code and format
      const validCurrency = currency && currency.length === 3 ? currency : 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      // Fallback to USD if currency is invalid
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Automatic Budget Estimate
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {destination}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {nights} nights
            </div>
            <Badge variant="outline">{memberCount} travelers</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Calculating budget estimate...
            </div>
          ) : currentEstimate ? (
            <div className="space-y-6">
              {countryData && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Info className="h-4 w-4" />
                  Based on {countryData.region} region pricing data
                </div>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Budget Breakdown</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  {isEditing ? 'Done Editing' : 'Edit Amounts'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Accommodation</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="accommodation">Total Amount ($)</Label>
                      <Input
                        id="accommodation"
                        type="number"
                        value={inputValues.accommodation}
                        onChange={(e) => handleEditChange('accommodation', e.target.value)}
                        className="text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(currentEstimate.accommodation, currentEstimate.currency)}
                      </p>
                      <p className="text-sm text-blue-600">
                        {Math.max(1, nights || 1)} {(nights || 1) === 1 ? 'night' : 'nights'} • ${Math.round(currentEstimate.accommodation / Math.max(1, nights || 1))}/night
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Food & Dining</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="food">Total Amount ($)</Label>
                      <Input
                        id="food"
                        type="number"
                        value={inputValues.food}
                        onChange={(e) => handleEditChange('food', e.target.value)}
                        className="text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(currentEstimate.food, currentEstimate.currency)}
                      </p>
                      <p className="text-sm text-green-600">
                        {Math.max(1, (nights || 1) + 1)} {((nights || 1) + 1) === 1 ? 'day' : 'days'} • ${Math.round(currentEstimate.food / Math.max(1, (nights || 1) + 1))}/day
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Transportation</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="transportation">Total Amount ($)</Label>
                      <Input
                        id="transportation"
                        type="number"
                        value={currentEstimate.transportation}
                        onChange={(e) => handleEditChange('transportation', e.target.value)}
                        className="text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-purple-700">
                        {formatCurrency(currentEstimate.transportation, currentEstimate.currency)}
                      </p>
                      <p className="text-sm text-purple-600">
                        {Math.max(1, (nights || 1) + 1)} {((nights || 1) + 1) === 1 ? 'day' : 'days'} • ${Math.round(currentEstimate.transportation / Math.max(1, (nights || 1) + 1))}/day
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900">Activities</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="activities">Total Amount ($)</Label>
                      <Input
                        id="activities"
                        type="number"
                        value={inputValues.activities}
                        onChange={(e) => handleEditChange('activities', e.target.value)}
                        className="text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-orange-700">
                        {formatCurrency(currentEstimate.activities, currentEstimate.currency)}
                      </p>
                      <p className="text-sm text-orange-600">
                        {Math.max(1, (nights || 1) + 1)} {((nights || 1) + 1) === 1 ? 'day' : 'days'} • ${Math.round(currentEstimate.activities / Math.max(1, (nights || 1) + 1))}/day
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Incidentals</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="incidentals">Total Amount ($)</Label>
                      <Input
                        id="incidentals"
                        type="number"
                        value={inputValues.incidentals}
                        onChange={(e) => handleEditChange('incidentals', e.target.value)}
                        className="text-lg font-bold"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-gray-700">
                        {formatCurrency(currentEstimate.incidentals, currentEstimate.currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {Math.max(1, (nights || 1) + 1)} {((nights || 1) + 1) === 1 ? 'day' : 'days'} • ${Math.round(currentEstimate.incidentals / Math.max(1, (nights || 1) + 1))}/day
                      </p>
                    </>
                  )}
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <h4 className="font-medium text-indigo-900">Per Person (Total)</h4>
                  <p className="text-2xl font-bold text-indigo-700">
                    {formatCurrency(currentEstimate.perPerson, currentEstimate.currency)}
                  </p>
                  <p className="text-sm text-indigo-600">Individual total cost</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-2">Total Estimated Budget</h3>
                <p className="text-3xl font-bold">
                  {formatCurrency(currentEstimate.total, currentEstimate.currency)}
                </p>
                <p className="text-blue-100 mt-2">
                  For {memberCount} travelers • {nights} nights in {destination}
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Estimates based on moderate budget travel in {countryData?.region || 'the destination region'}</li>
                  <li>• Prices may vary significantly by season and specific location</li>
                  <li>• Does not include flights to/from destination</li>
                  <li>• Consider adding 10-20% buffer for unexpected expenses</li>
                </ul>
              </div>

              <Button 
                onClick={calculateEstimate}
                variant="outline" 
                className="w-full"
              >
                Recalculate Estimate
              </Button>

              {/* Interactive Charts */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Visual Budget Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pie" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="pie">Pie Chart</TabsTrigger>
                      <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pie" className="space-y-4">
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Accommodation', value: currentEstimate.accommodation, fill: '#8884d8' },
                              { name: 'Food', value: currentEstimate.food, fill: '#82ca9d' },
                              { name: 'Transport', value: currentEstimate.transportation, fill: '#ffc658' },
                              { name: 'Activities', value: currentEstimate.activities, fill: '#ff7300' },
                              { name: 'Incidentals', value: currentEstimate.incidentals, fill: '#00ff88' }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={120}
                            dataKey="value"
                          >
                            {[
                              { name: 'Accommodation', value: estimate.accommodation, fill: '#8884d8' },
                              { name: 'Food', value: estimate.food, fill: '#82ca9d' },
                              { name: 'Transport', value: estimate.transportation, fill: '#ffc658' },
                              { name: 'Activities', value: estimate.activities, fill: '#ff7300' },
                              { name: 'Incidentals', value: estimate.incidentals, fill: '#00ff88' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => [`$${Math.round(Number(value))}`, name]} 
                            contentStyle={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '6px' }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="bar" className="space-y-4">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart 
                          data={[
                            { category: 'Accommodation', amount: currentEstimate.accommodation, fill: '#8884d8' },
                            { category: 'Food', amount: currentEstimate.food, fill: '#82ca9d' },
                            { category: 'Transport', amount: currentEstimate.transportation, fill: '#ffc658' },
                            { category: 'Activities', amount: currentEstimate.activities, fill: '#ff7300' },
                            { category: 'Incidentals', amount: currentEstimate.incidentals, fill: '#00ff88' }
                          ]} 
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [`$${Math.round(Number(value))}`, name]} 
                            contentStyle={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '6px' }}
                          />
                          <Bar dataKey="amount">
                            {[
                              { category: 'Accommodation', amount: estimate.accommodation, fill: '#8884d8' },
                              { category: 'Food', amount: estimate.food, fill: '#82ca9d' },
                              { category: 'Transport', amount: estimate.transportation, fill: '#ffc658' },
                              { category: 'Activities', amount: estimate.activities, fill: '#ff7300' },
                              { category: 'Incidentals', amount: estimate.incidentals, fill: '#00ff88' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <Button onClick={calculateEstimate}>
                Generate Budget Estimate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoBudgetEstimator;