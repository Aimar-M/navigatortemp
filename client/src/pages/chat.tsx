import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { wsClient } from "@/lib/websocket";
import ChatMessage from "@/components/chat-message";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import TripTabs from "@/components/trip-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch trip details
  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    queryFn: async () => {
      // Get auth token for our token-based authentication
      const token = localStorage.getItem('auth_token');
      
      // Add token to authorization header
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${tripId}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch trip");
      return response.json();
    },
    enabled: !!tripId && !!user,
  });

  // Fetch trip messages
  const { data: chatMessages, isLoading: isMessagesLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/messages`],
    queryFn: async () => {
      // Get auth token for our token-based authentication
      const token = localStorage.getItem('auth_token');
      
      // Add token to authorization header
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${tripId}/messages`, { headers });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!tripId && !!user,
  });

  // Update local messages when fetched from API
  useEffect(() => {
    if (chatMessages) {
      setMessages(chatMessages);
    }
  }, [chatMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket connection and message handler
  useEffect(() => {
    if (!user || !tripId) return;

    // Update WebSocket trip IDs
    wsClient.updateTripIds([tripId]);

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.data.tripId === tripId) {
        setMessages(prev => [...prev, data.data]);
      }
    };

    wsClient.on('new_message', handleNewMessage);

    return () => {
      wsClient.off('new_message', handleNewMessage);
    };
  }, [user, tripId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Clear input after sending
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (isTripLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex justify-center items-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trip not found</h1>
          <p className="text-gray-600 mb-4">The trip you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Trip Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center">
                <h2 className="text-xl font-bold text-gray-900">{trip.name}</h2>
              </div>
              <p className="text-sm text-gray-600">Group Chat</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <TripTabs tripId={tripId} />

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {isMessagesLoading ? (
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-8 w-8 rounded-full mr-2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-64 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-4 py-2">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  id={msg.id}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  user={msg.user}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-gray-300 mb-4"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
              <p className="text-gray-500 mt-1 mb-4">Be the first to start the conversation!</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-3">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isSubmitting || !message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}
