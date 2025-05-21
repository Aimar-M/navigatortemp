import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/header";
import TripTabs from "@/components/trip-tabs";
import BudgetTabs from "@/components/budget/BudgetTabs";
import MobileNavigation from "@/components/mobile-navigation";
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

  // Fetch trip members
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/trips', tripId, 'members'],
    enabled: !!tripId,
  });

  if (isLoadingTrip || isLoadingMembers) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <TripTabs tripId={tripId} />
        <main className="flex-1 p-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
        <MobileNavigation />
      </div>
    );
  }

  // Check if current user is the trip organizer
  const isOrganizer = trip?.organizer === user?.id;

  // Filter confirmed members
  const confirmedMembers = members?.filter((member: any) => member.status === 'confirmed') || [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <TripTabs tripId={tripId} />
      
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Trip Budget</h1>
            <p className="text-gray-600">
              Track expenses and manage flight information for your trip to {trip?.destination}.
            </p>
          </div>

          {user && (
            <BudgetTabs 
              tripId={tripId} 
              currentUserId={user.id} 
              isOrganizer={isOrganizer}
            />
          )}
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}