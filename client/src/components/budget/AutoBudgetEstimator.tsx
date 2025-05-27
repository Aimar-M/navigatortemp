import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, DollarSign, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoBudgetEstimatorProps {
  tripId: number;
  destination: string;
  startDate: string;
  endDate: string;
  memberCount: number;
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
  memberCount
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<BudgetEstimate | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const { toast } = useToast();

  // Calculate number of nights
  const nights = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

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
      const country = await fetchCountryData(destination);
      setCountryData(country);

      let regionalMultiplier = 1.0;
      let currency = 'USD';

      if (country) {
        regionalMultiplier = getRegionalMultiplier(country.region);
        
        // Get primary currency
        if (country.currencies) {
          const currencyCode = Object.keys(country.currencies)[0];
          currency = currencyCode || 'USD';
        }
      }

      // Ensure we have valid numbers
      const validNights = Math.max(1, nights || 1);
      const validMemberCount = Math.max(1, memberCount || 1);
      const validMultiplier = regionalMultiplier || 1.0;

      // Calculate estimates based on regional costs
      const accommodationCost = Math.round(baseCosts.accommodation * validMultiplier * validNights);
      const foodCost = Math.round(baseCosts.food * validMultiplier * (validNights + 1)); // +1 for departure day
      const transportationCost = Math.round(baseCosts.transportation * validMultiplier * (validNights + 1));
      const activitiesCost = Math.round(baseCosts.activities * validMultiplier * (validNights + 1));
      const incidentalsCost = Math.round(baseCosts.incidentals * validMultiplier * (validNights + 1));

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
          ) : estimate ? (
            <div className="space-y-6">
              {countryData && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Info className="h-4 w-4" />
                  Based on {countryData.region} region pricing data
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Accommodation</h4>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(estimate.accommodation, estimate.currency)}
                  </p>
                  <p className="text-sm text-blue-600">{nights} nights</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900">Food & Dining</h4>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(estimate.food, estimate.currency)}
                  </p>
                  <p className="text-sm text-green-600">{nights + 1} days</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900">Transportation</h4>
                  <p className="text-2xl font-bold text-purple-700">
                    {formatCurrency(estimate.transportation, estimate.currency)}
                  </p>
                  <p className="text-sm text-purple-600">Local transport</p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900">Activities</h4>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(estimate.activities, estimate.currency)}
                  </p>
                  <p className="text-sm text-orange-600">Tours & attractions</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Incidentals</h4>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatCurrency(estimate.incidentals, estimate.currency)}
                  </p>
                  <p className="text-sm text-gray-600">Misc expenses</p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <h4 className="font-medium text-indigo-900">Per Person</h4>
                  <p className="text-2xl font-bold text-indigo-700">
                    {formatCurrency(estimate.perPerson, estimate.currency)}
                  </p>
                  <p className="text-sm text-indigo-600">Individual cost</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-2">Total Estimated Budget</h3>
                <p className="text-3xl font-bold">
                  {formatCurrency(estimate.total, estimate.currency)}
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