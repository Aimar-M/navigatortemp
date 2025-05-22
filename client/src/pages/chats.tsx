import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Search, MessageSquare } from "lucide-react";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatDate, getInitials } from "@/lib/utils";
import UserAvatar from "@/components/user-avatar";

// Chat list item component
const ChatItem = ({ trip, lastMessages, currentUser }: { trip: any, lastMessages: any[], currentUser: any }) => {
  const [, navigate] = useLocation();
  
  // Find the last message for this trip, if any
  const tripMessages = lastMessages?.filter(msg => msg.tripId === trip.id) || [];
  const lastMessage = tripMessages.length > 0 ? tripMessages[0] : { 
    content: "No messages yet", 
    timestamp: trip.startDate,
    user: { name: "" } 
  };
  
  // Check if there are unread messages (only from other users)
  const lastChatVisit = localStorage.getItem(`lastChatVisit_${trip.id}`) 
    ? new Date(localStorage.getItem(`lastChatVisit_${trip.id}`)!) 
    : new Date(0); // If never visited, all messages are unread
    
  const unreadCount = tripMessages.filter(msg => 
    new Date(msg.timestamp) > lastChatVisit && 
    msg.user?.id !== currentUser?.id // Only count messages from other users
  ).length;

  const goToChat = () => {
    // Update last visit timestamp when navigating to a chat
    localStorage.setItem(`lastChatVisit_${trip.id}`, new Date().toISOString());
    // Set the referrer so the chat page knows we came from the chats list
    sessionStorage.setItem('chatReferrer', 'chats');
    navigate(`/trips/${trip.id}/chat`);
  };

  return (
    <div onClick={goToChat} className="cursor-pointer">
      <Card className="hover:bg-gray-50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-100 text-primary-800 font-semibold">
              {getInitials(trip.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{trip.name}</h3>
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{formatDateTime(lastMessage.timestamp)}</span>
              </div>
              <div className="flex items-center mt-1">
                {lastMessage.user && lastMessage.user.name && (
                  <span className="text-xs font-medium text-gray-600 mr-1 truncate">
                    {lastMessage.user.name}:
                  </span>
                )}
                <p className="text-xs text-gray-600 truncate">
                  {lastMessage.content}
                </p>
              </div>
              <div className="mt-1">
                <span className="text-xs text-gray-500">
                  {trip.destination} • {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Chats() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Function to sort trips by most recent message
  const sortTripsByLatestMessage = (trips: any[], messages: any[]) => {
    return [...trips].sort((a, b) => {
      // Find the most recent message for each trip
      const aMessages = messages.filter(msg => msg.tripId === a.id);
      const bMessages = messages.filter(msg => msg.tripId === b.id);
      
      const aLatest = aMessages.length > 0 ? new Date(aMessages[0].timestamp).getTime() : 0;
      const bLatest = bMessages.length > 0 ? new Date(bMessages[0].timestamp).getTime() : 0;
      
      // Sort by latest message timestamp (newest first)
      return bLatest - aLatest;
    });
  };
  
  // Update last visit timestamp when opening the chats page
  useEffect(() => {
    if (user) {
      localStorage.setItem('lastChatVisit', new Date().toISOString());
    }
  }, [user]);

  // Fetch all trips the user is a member of
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips"],
    queryFn: async () => {
      if (!user) return null;
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/trips", { headers });
      if (!response.ok) throw new Error("Failed to fetch trips");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch last messages for all trips
  const { data: lastMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      if (!user) return [];
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Use our new endpoint that gets all messages across trips
      const response = await fetch('/api/messages', { headers });
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const messages = await response.json();
      return messages;
    },
    enabled: !!user,
  });

  // Filter trips based on search
  const filteredTrips = trips?.filter((trip: any) => 
    searchTerm === "" || 
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Sort trips by most recent message
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    // Find last message for each trip
    const aMessages = lastMessages?.filter(msg => msg.tripId === a.id) || [];
    const bMessages = lastMessages?.filter(msg => msg.tripId === b.id) || [];
    
    const aLatestTimestamp = aMessages.length > 0 
      ? new Date(aMessages[0].timestamp).getTime() 
      : new Date(a.updatedAt || a.startDate).getTime();
      
    const bLatestTimestamp = bMessages.length > 0 
      ? new Date(bMessages[0].timestamp).getTime() 
      : new Date(b.updatedAt || b.startDate).getTime();
    
    // Sort in descending order (most recent first)
    return bLatestTimestamp - aLatestTimestamp;
  });

  const isLoading = authLoading || tripsLoading || messagesLoading;
  
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
      
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Chats</h1>
          <p className="text-sm text-gray-600">Your group conversations</p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedTrips.length > 0 ? (
            <div className="space-y-2 p-4">
              {sortTripsByLatestMessage(sortedTrips, lastMessages || []).map((trip: any) => (
                <ChatItem 
                  key={trip.id} 
                  trip={trip} 
                  lastMessages={lastMessages || []}
                  currentUser={user}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 flex flex-col items-center">
              <div className="bg-gray-100 rounded-full p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No conversations found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? "No chats match your search criteria." 
                  : "Join or create a trip to start chatting!"}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate("/create-trip")}>
                  Create a Trip
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}