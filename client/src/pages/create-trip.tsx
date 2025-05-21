import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import TripForm from "@/components/trip-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateTrip() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create a New Trip</h1>
          <TripForm 
            onComplete={() => navigate("/")} 
          />
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
