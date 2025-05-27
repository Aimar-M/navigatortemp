import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AutoBudgetEstimator from "@/components/budget/AutoBudgetEstimator";
import BudgetChart from "@/components/budget/BudgetChart";
import TripDetailLayout from "@/components/trip-detail-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function TripBudget() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const { user } = useAuth();

  // Fetch trip details
  const { data: trip, isLoading: isLoadingTrip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId,
  });

  // Get trip member count
  const { data: members } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });

  // Fetch trip activities
  const { data: activities } = useQuery({
    queryKey: [`/api/trips/${tripId}/activities`],
    enabled: !!tripId,
  });

  const memberCount = members?.length || 1;

  if (isLoadingTrip) {
    return (
      <TripDetailLayout tripId={tripId}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </TripDetailLayout>
    );
  }

  if (!trip) {
    return (
      <TripDetailLayout tripId={tripId}>
        <div className="text-center py-8">
          <p className="text-gray-500">Trip not found</p>
        </div>
      </TripDetailLayout>
    );
  }

  // Debug trip data
  console.log('Trip data for budget:', {
    trip,
    startDate: trip?.startDate,
    endDate: trip?.endDate,
    destination: trip?.destination,
    memberCount,
    activities
  });

  // Prepare budget data for the interactive chart
  const budgetData = {
    categories: {
      accommodation: 800,
      flights: 600,
      food: 400,
      activities: 300,
      transport: 200
    },
    totalBudget: 2300,
    actualSpent: 450,
    dailyBreakdown: [
      { day: "Day 1", budget: 150, spent: 120 },
      { day: "Day 2", budget: 200, spent: 180 },
      { day: "Day 3", budget: 180, spent: 150 },
      { day: "Day 4", budget: 160, spent: 0 },
      { day: "Day 5", budget: 140, spent: 0 }
    ]
  };

  return (
    <TripDetailLayout 
      tripId={tripId}
      title="Smart Budget Planner"
      description={`AI-powered budget estimates for your trip to ${trip?.destination || 'your destination'}.`}
    >
      <div className="space-y-8">
        <AutoBudgetEstimator 
          tripId={tripId} 
          destination={trip?.destination || ''}
          startDate={trip?.startDate || ''}
          endDate={trip?.endDate || ''}
          memberCount={memberCount}
          activities={Array.isArray(activities) ? activities : []}
        />
        
        <BudgetChart budgetData={budgetData} />
      </div>
    </TripDetailLayout>
  );
}