import React, { useState, useEffect } from "react";
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
  
  // Find all messages and polls for this trip
  const tripMessages = lastMessages?.filter(msg => msg.tripId === trip.id) || [];
  
  // Get the last message or poll for display
  const lastMessage = tripMessages.length > 0 ? tripMessages[0] : { 
    content: "No messages yet", 
    timestamp: trip.startDate,
    user: { name: "", id: 0 } 
  };
  
  // Get last visit time from localStorage, or default to beginning of time
  const lastChatVisitStr = localStorage.getItem(`lastChatVisit_${trip.id}`);
  const lastChatVisit = lastChatVisitStr ? new Date(lastChatVisitStr) : new Date(0);
  
  // Debug: Print last visit time
  // console.log(`Trip ${trip.id} - Last visit:`, lastChatVisit.toISOString());
  
  // Count unread messages (only from other users, newer than last visit)
  const unreadMessages = tripMessages.filter(msg => {
    const msgTime = new Date(msg.timestamp);
    const isAfterLastVisit = msgTime > lastChatVisit;
    const isFromOtherUser = msg.userId !== currentUser?.id;
    
    // Debug: Print message details
    // if (isAfterLastVisit) {
    //   console.log(`Msg ${msg.id} time:`, msgTime.toISOString(), 
    //     `After last visit: ${isAfterLastVisit}`, 
    //     `From other user: ${isFromOtherUser}`);
    // }
    
    return isAfterLastVisit && isFromOtherUser;
  });
  
  const unreadCount = unreadMessages.length;

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
  
  // Function to sort trips by most recent message - not used anymore since we use
  // the direct sortedTrips logic below with useCallback and useMemo
  
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
      // Sort messages by timestamp descending (newest first)
      return messages.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: !!user,
  });

  // Filter trips based on search
  const filteredTrips = trips?.filter((trip: any) => 
    searchTerm === "" || 
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Get the latest message timestamp for each trip
  const getLatestMessageTimestamp = React.useCallback((tripId: number) => {
    const messages = lastMessages?.filter(msg => msg.tripId === tripId) || [];
    if (messages.length > 0) {
      return new Date(messages[0].timestamp).getTime();
    }
    return 0; // No messages found
  }, [lastMessages]);
  
  // Sort trips by most recent message
  const sortedTrips = React.useMemo(() => {
    console.log("Sorting trips with messages:", lastMessages?.length || 0);
    
    // Create a copy of the filtered trips
    const trips = [...filteredTrips];
    
    // Sort trips by the latest message timestamp (newest first)
    return trips.sort((a, b) => {
      const aTimestamp = getLatestMessageTimestamp(a.id);
      const bTimestamp = getLatestMessageTimestamp(b.id);
      
      // If both have messages, compare their timestamps
      if (aTimestamp && bTimestamp) {
        return bTimestamp - aTimestamp;
      }
      
      // If only one has messages, prioritize that one
      if (aTimestamp) return -1;
      if (bTimestamp) return 1;
      
      // If neither has messages, sort by trip start date
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [filteredTrips, lastMessages, getLatestMessageTimestamp]);

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
              {/* We're now using the pre-sorted list from the sortTripsByLatestMessage function */}
              {sortedTrips.map((trip: any) => (
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