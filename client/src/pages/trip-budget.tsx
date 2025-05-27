import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AutoBudgetEstimator from "@/components/budget/AutoBudgetEstimator";
import TripDetailLayout from "@/components/trip-detail-layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function TripBudget() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const { user } = useAuth();

  // Fetch trip details
  const { data: trip, isLoading: isLoadingTrip } = useQuery({
    queryKey: ['/api/trips', tripId],
    enabled: !!tripId,
  });

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

  // Get trip member count
  const { data: members } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });

  const memberCount = members?.length || 1;

  return (
    <TripDetailLayout 
      tripId={tripId}
      title="Smart Budget Planner"
      description={`AI-powered budget estimates for your trip to ${trip.destination}.`}
    >
      <AutoBudgetEstimator 
        tripId={tripId} 
        destination={trip.destination}
        startDate={trip.startDate}
        endDate={trip.endDate}
        memberCount={memberCount}
      />
    </TripDetailLayout>
  );
}