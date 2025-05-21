import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import ComprehensiveBudgetView from "@/components/budget/ComprehensiveBudgetView";
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

  // Get trip destination or use a fallback
  const destination = trip?.destination || "your destination";

  return (
    <TripDetailLayout 
      tripId={tripId}
      title="Trip Budget"
      description={`Plan and track all expenses for your trip to ${destination}.`}
    >
      <ComprehensiveBudgetView 
        tripId={tripId} 
        destination={destination}
      />
    </TripDetailLayout>
  );
}