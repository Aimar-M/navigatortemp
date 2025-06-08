import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Search, Plus } from "lucide-react";
import TripCard from "@/components/trip-card";
import EnhancedTripCard from "@/components/enhanced-trip-card";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trips
  const { data: tripsData, isLoading } = useQuery({
    queryKey: ["/api/trips"],
    enabled: !!user,
  });
  const trips = Array.isArray(tripsData) ? tripsData : [];

  // Fetch pending invitations
  const { data: pendingInvitationsData, isLoading: pendingInvitationsLoading } = useQuery({
    queryKey: ["/api/trips/memberships/pending"],
    enabled: !!user,
  });
  const pendingInvitations = Array.isArray(pendingInvitationsData) ? pendingInvitationsData : [];

  // Define mutations for pinning and archiving trips
  const pinTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      if (!user) throw new Error("Not authenticated");
      
      const trip = trips.find((t: any) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");
      
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !trip.isPinned })
      });
      if (!response.ok) throw new Error('Failed to update trip');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Trip pin status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });
  
  const archiveTripMutation = useMutation({
    mutationFn: async (tripId: number) => {
      if (!user) throw new Error("Not authenticated");
      
      const trip = trips.find((t: any) => t.id === tripId);
      if (!trip) throw new Error("Trip not found");
      
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !trip.isArchived })
      });
      if (!response.ok) throw new Error('Failed to update trip');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "Success",
        description: "Trip archive status updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  });

  // Group trips by simplified categories (past, upcoming, and invitations)
  const currentDate = new Date();
  
  // Get pending invitation trip IDs to filter them out of other sections
  const pendingInvitationTripIds = pendingInvitations.map((invitation: any) => 
    invitation.membership?.tripId || invitation.tripId
  );
  
  // Helper to sort trips by pinned status first, then by date proximity
  const sortTripsByPinnedAndProximity = (tripA: any, tripB: any) => {
    // Pinned trips always come first
    if (tripA.isPinned && !tripB.isPinned) {
      return -1;
    }
    if (!tripA.isPinned && tripB.isPinned) {
      return 1;
    }
    
    // If both are pinned or both are not pinned, sort by date proximity
    const dateA = new Date(tripA.startDate);
    const dateB = new Date(tripB.startDate);
    const diffA = Math.abs(currentDate.getTime() - dateA.getTime());
    const diffB = Math.abs(currentDate.getTime() - dateB.getTime());
    return diffA - diffB;
  };

  // Filter trips based on search and exclude pending invitations
  const filteredTrips = trips.filter((trip: any) => 
    !pendingInvitationTripIds.includes(trip.id) &&
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (showArchived ? trip.isArchived : !trip.isArchived)
  );

  // Categorize and sort trips
  const upcomingTrips = filteredTrips
    .filter((trip: any) => new Date(trip.endDate) >= currentDate)
    .sort(sortTripsByPinnedAndProximity);
    
  const pastTrips = filteredTrips
    .filter((trip: any) => new Date(trip.endDate) < currentDate)
    .sort(sortTripsByPinnedAndProximity);

  const allTrips = filteredTrips.sort(sortTripsByPinnedAndProximity);

  // Show loading skeleton while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  // If user is not authenticated, show landing page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Navigator
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              The ultimate group travel financial management platform
            </p>
            <div className="space-x-4">
              <Button asChild size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasTripsToShow = filteredTrips.length > 0 || pendingInvitations.length > 0;

  const renderTripGrid = (tripList: any[], showPendingInvitations = false) => {
    const tripsToRender = showPendingInvitations ? pendingInvitations : tripList;
    
    if (tripsToRender.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {showPendingInvitations ? "No pending invitations" : "No trips found"}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tripsToRender.map((trip: any) => (
          <TripCard
            key={trip.id}
            trip={showPendingInvitations ? trip.trip || trip : trip}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your group travels and expenses
            </p>
          </div>
          
          <Button asChild className="whitespace-nowrap">
            <Link href="/trips/new">
              <Plus className="w-4 h-4 mr-2" />
              New Trip
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search trips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Main Content */}
        {isLoading || pendingInvitationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : hasTripsToShow ? (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All Trips</TabsTrigger>
              <TabsTrigger value="invitations" className="relative">
                Invitations
                {pendingInvitations.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingInvitations.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-6">
              {renderTripGrid(upcomingTrips)}
            </TabsContent>
            
            <TabsContent value="past" className="mt-6">
              {renderTripGrid(pastTrips)}
            </TabsContent>
            
            <TabsContent value="all" className="mt-6">
              {renderTripGrid(allTrips)}
            </TabsContent>
            
            <TabsContent value="invitations" className="mt-6">
              {renderTripGrid([], true)}
            </TabsContent>
          </Tabs>
        ) : (
          /* Empty State */
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No trips yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start planning your first group adventure!
              </p>
              <Button asChild>
                <Link href="/trips/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNavigation />
    </div>
  );
}