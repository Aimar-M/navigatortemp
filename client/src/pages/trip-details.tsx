import { useParams } from "wouter";
import Header from "@/components/header";
import TripTabs from "@/components/trip-tabs";
import MobileNavigation from "@/components/mobile-navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function TripDetailsNew() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <TripTabs tripId={tripId} />
      
      <main className="flex-1 p-4 pb-24 md:pb-4">
        <div className="space-y-4 mb-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
      
      {/* Mobile navigation is already fixed in the component itself */}
      <MobileNavigation />
    </div>
  );
}