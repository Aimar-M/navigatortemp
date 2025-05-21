import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Search, Plus } from "lucide-react";
import TripCard from "@/components/trip-card";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const token = user ? localStorage.getItem('auth_token') : null;
  
  // Use React Query with proper dependencies to avoid setState during render
  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/trips", !!user, token],
    queryFn: async () => {
      if (!user || !token) return [];
      
      // Add token to authorization header
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      const response = await fetch("/api/trips", { headers });
      if (!response.ok) throw new Error("Failed to fetch trips");
      return response.json();
    },
    enabled: !!user && !!token,
  });
  
  // Fetch pending invitations (trip memberships with "pending" status)
  const { data: pendingInvitations, isLoading: pendingInvitationsLoading } = useQuery({
    queryKey: ["/api/trips/invitations/pending", !!user, token],
    queryFn: async () => {
      if (!user || !token) return [];
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      // This would be the endpoint for pending invitations
      const response = await fetch("/api/trips/memberships/pending", { headers });
      if (!response.ok) throw new Error("Failed to fetch pending invitations");
      
      const data = await response.json();
      
      // Set notification indicator if there are pending invitations
      if (data.length > 0) {
        setHasNewNotifications(true);
      }
      
      return data;
    },
    enabled: !!user && !!token,
  });

  // Group trips by simplified categories (past, upcoming, and invitations)
  const currentDate = new Date();
  
  // Get pending invitation trip IDs to filter them out of other sections
  const pendingInvitationTripIds = pendingInvitations?.map((invitation: any) => 
    invitation.membership.tripId
  ) || [];
  
  // Past trips = trips with end date before current date (excluding pending invitations)
  const pastTrips = trips?.filter((trip: any) => {
    const endDate = new Date(trip.endDate);
    return endDate < currentDate && 
      !pendingInvitationTripIds.includes(trip.id) &&
      (searchTerm === "" || 
        trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
  }) || [];
  
  // Upcoming trips = trips with end date on or after current date (excluding pending invitations)
  const upcomingTrips = trips?.filter((trip: any) => {
    const endDate = new Date(trip.endDate);
    return endDate >= currentDate && 
      !pendingInvitationTripIds.includes(trip.id) &&
      (searchTerm === "" || 
        trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
  }) || [];
  
  // Invitations are handled separately through pendingInvitations

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
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
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        {/* Navigation Panel */}
        <div className="w-full md:w-80 md:min-w-[320px] bg-white border-r border-gray-200 md:h-full overflow-y-auto">
          {/* Tabs for mobile navigation */}
          <div className="md:hidden flex border-b border-gray-200">
            <button className="flex-1 py-3 text-center text-sm font-medium tab-active">
              Trips
            </button>
            <button className="flex-1 py-3 text-center text-sm font-medium text-gray-500">
              Messages
            </button>
            <button className="flex-1 py-3 text-center text-sm font-medium text-gray-500">
              Profile
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search trips or destinations..."
                className="w-full pl-10 pr-4 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Trip List */}
          <div className="pt-2">
            <div className="px-4 pb-2 flex justify-between items-center">
              <h2 className="text-sm font-medium text-gray-500 uppercase">Your Trips</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-600 hover:bg-primary-50"
                onClick={() => navigate("/create-trip")}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* We've moved the invitations section to the Tabs, so this section is no longer needed */}
            
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : trips && trips.length > 0 ? (
              <div className="space-y-1">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full justify-start px-4 pb-2">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
                    <TabsTrigger value="past" className="text-xs">Past</TabsTrigger>
                    <TabsTrigger value="invitations" className="text-xs">
                      Invitations
                      {pendingInvitations && pendingInvitations.length > 0 && (
                        <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                          {pendingInvitations.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    {trips.filter((trip: any) => {
                      // Check if this trip is in the pending invitations list
                      const isPendingInvitation = pendingInvitationTripIds.includes(trip.id);
                      
                      // Only show trips that are NOT pending invitations
                      return !isPendingInvitation && 
                        (searchTerm === "" || 
                          trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
                    }).map((trip: any) => (
                      <div key={trip.id} className="px-1">
                        <TripCard
                          id={trip.id}
                          name={trip.name}
                          destination={trip.destination}
                          startDate={trip.startDate}
                          endDate={trip.endDate}
                          status={trip.status}
                          memberCount={5} // Would come from trip members count
                        />
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="upcoming">
                    {trips.filter((trip: any) => {
                      const endDate = new Date(trip.endDate);
                      // Show trips with end date in the future, excluding pending invitations
                      return endDate >= currentDate && 
                        !pendingInvitationTripIds.includes(trip.id) &&
                        (searchTerm === "" || 
                          trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
                    }).length > 0 ? (
                      trips.filter((trip: any) => {
                        const endDate = new Date(trip.endDate);
                        // Filter out pending invitations from upcoming trips
                        return endDate >= currentDate && 
                          !pendingInvitationTripIds.includes(trip.id) &&
                          (searchTerm === "" || 
                            trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
                      }).map((trip: any) => (
                        <div key={trip.id} className="px-1">
                          <TripCard
                            id={trip.id}
                            name={trip.name}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            status={trip.status}
                            memberCount={5}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No upcoming trips.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="past">
                    {trips.filter((trip: any) => {
                      const endDate = new Date(trip.endDate);
                      // Show trips with end date in the past, excluding pending invitations
                      return endDate < currentDate && 
                        !pendingInvitationTripIds.includes(trip.id) &&
                        (searchTerm === "" || 
                          trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
                    }).length > 0 ? (
                      trips.filter((trip: any) => {
                        const endDate = new Date(trip.endDate);
                        // Filter out pending invitations from past trips
                        return endDate < currentDate && 
                          !pendingInvitationTripIds.includes(trip.id) &&
                          (searchTerm === "" || 
                            trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            trip.destination.toLowerCase().includes(searchTerm.toLowerCase()));
                      }).map((trip: any) => (
                        <div key={trip.id} className="px-1">
                          <TripCard
                            id={trip.id}
                            name={trip.name}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            status={trip.status}
                            memberCount={5}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4">No past trips.</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="invitations">
                    {pendingInvitations && pendingInvitations.length > 0 ? (
                      <div className="space-y-2 px-1">
                        {pendingInvitations.map((invitation: any) => (
                          <Card key={invitation.membership.tripId} className="border-orange-200 bg-orange-50">
                            <CardContent className="p-3">
                              <div className="flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{invitation.trip?.name}</h4>
                                    <p className="text-xs text-gray-600">
                                      Invited by {invitation.organizer?.name || invitation.organizer?.username}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    className="w-full"
                                    onClick={() => {
                                      // Update status to confirmed
                                      fetch(`/api/trips/${invitation.membership.tripId}/members/${user.id}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ status: 'confirmed' })
                                      })
                                      .then(() => {
                                        // Refresh data
                                        window.location.reload();
                                      });
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                      // Update status to declined
                                      fetch(`/api/trips/${invitation.membership.tripId}/members/${user.id}`, {
                                        method: 'PUT',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ status: 'declined' })
                                      })
                                      .then(() => {
                                        // Refresh data
                                        window.location.reload();
                                      });
                                    }}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No pending invitations.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">No trips yet!</h3>
                <p className="text-gray-500 mb-4">Start planning your first adventure.</p>
                <Button onClick={() => navigate("/create-trip")}>
                  <Plus className="h-4 w-4 mr-2" /> Create a Trip
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Welcome Content Panel if no trip is selected */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center">
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=400"
            alt="Group of friends on vacation"
            className="rounded-lg mb-6 w-full max-w-xl object-cover shadow-md"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TripTogether!</h1>
          <p className="text-gray-600 max-w-md mb-6">
            Plan trips with friends, create itineraries, chat with your travel group,
            and make your next adventure unforgettable.
          </p>
          <Button onClick={() => navigate("/create-trip")} className="mb-3">
            <Plus className="h-4 w-4 mr-2" /> Create a Trip
          </Button>
          <p className="text-sm text-gray-500">
            Or select a trip from the sidebar to view details.
          </p>
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
