import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import TripDetailLayout from "@/components/trip-detail-layout";
import PollsSection from "@/components/polls/PollsSection";

export default function Polls() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId,
  });

  // Fetch trip members to check RSVP status
  const { data: members = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId && !!user,
  });

  // Check user's RSVP status
  const isOrganizer = user && trip && (trip as any).organizer === (user as any).id;
  const currentUserMembership = (members as any[]).find((member: any) => member.userId === (user as any)?.id);
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizer;
  
  const isLoading = authLoading || tripLoading;
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trip not found</h1>
          <p className="text-gray-600">This trip may have been deleted or you don't have access to it.</p>
        </div>
      </div>
    );
  }
  
  return (
    <TripDetailLayout 
      tripId={tripId} 
      title="Polls" 
      description="Create and participate in polls for your trip"
      isConfirmedMember={isConfirmedMember as boolean}
    >
      <PollsSection tripId={tripId} />
    </TripDetailLayout>
  );
}