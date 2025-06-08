import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Send, ArrowLeft, PieChart, Plus, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { wsClient } from "@/lib/websocket";
import ChatMessage from "@/components/chat-message";
import ChatPoll from "@/components/chat-poll";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import TripTabs from "@/components/trip-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CreatePollDialog } from "@/components/polls/create-poll-dialog";

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const tripId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFromChatsPage, setIsFromChatsPage] = useState(false);
  
  // Check if we navigated from the chats page and update last visit timestamp
  useEffect(() => {
    // Get referrer from sessionStorage
    const referrer = sessionStorage.getItem('chatReferrer');
    setIsFromChatsPage(referrer === 'chats');
    
    // Update last visit timestamp to mark messages as read
    if (tripId) {
      localStorage.setItem(`lastChatVisit_${tripId}`, new Date().toISOString());
    }
    
    // Clean up
    return () => {
      sessionStorage.removeItem('chatReferrer');
    };
  }, [tripId]);

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
  
  // Fetch trip members to check RSVP status
  const { data: members = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId && !!user,
  });

  // Fetch polls for this trip to display in chat
  const { data: polls = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/polls`],
    refetchInterval: 10000, // Refresh every 10 seconds
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/trips/${tripId}/polls`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch polls');
      }
      return response.json();
    },
    enabled: !!tripId && !!user, // Fetch polls regardless of navigation path
  });

  // Check user's RSVP status
  const isOrganizer = user && trip && trip.organizer === user.id;
  const currentUserMembership = (members as any[]).find((member: any) => member.userId === user?.id);
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizer;
  const isPendingMember = currentUserMembership?.rsvpStatus === 'pending';
  const isDeclinedMember = currentUserMembership?.rsvpStatus === 'declined';

  // Combine polls and messages into a single chronological timeline
  useEffect(() => {
    if (chatMessages) {
      console.log("Received chat messages:", chatMessages);
      
      // Ensure messages have the correct structure for ChatMessage component
      const formattedMessages = chatMessages.map((msg: any) => ({
        id: `msg-${msg.id}`,
        type: 'message',
        content: msg.content,
        timestamp: msg.timestamp,
        user: {
          id: msg.user ? msg.user.id : msg.userId,
          name: msg.user ? msg.user.name : "Unknown User",
          avatar: msg.user ? msg.user.avatar : null
        }
      }));
      
      // Add polls to the timeline with a consistent format
      const formattedPolls = polls ? polls.map((poll: any) => ({
        id: `poll-${poll.id}`,
        type: 'poll',
        pollData: poll,
        timestamp: poll.createdAt,
        user: {
          id: poll.creator?.id || poll.createdBy,
          name: poll.creator?.name || "Unknown User",
          avatar: poll.creator?.avatar || null
        }
      })) : [];
      
      // Combine messages and polls, then sort by timestamp
      const combinedItems = [...formattedMessages, ...formattedPolls].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log("Combined timeline:", combinedItems);
      setMessages(combinedItems);
    }
  }, [chatMessages, polls]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket connection and message handler
  useEffect(() => {
    if (!user || !tripId) return;

    // Update WebSocket trip IDs
    wsClient.updateTripIds([tripId]);
    
    // Mark this chat as visited when opening it
    localStorage.setItem(`lastChatVisit_${tripId}`, new Date().toISOString());

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      console.log("Received new WebSocket message:", data);
      if (data.data.tripId === tripId) {
        // Format message to match ChatMessage component format
        const formattedMessage = {
          id: data.data.id,
          content: data.data.content,
          timestamp: data.data.timestamp,
          user: {
            id: data.data.user.id,
            name: data.data.user.name,
            avatar: data.data.user.avatar
          }
        };
        
        console.log("Formatted new message:", formattedMessage);
        setMessages(prev => [...prev, formattedMessage]);
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

    // Block message sending for non-confirmed users
    if (!isConfirmedMember) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get auth token for our token-based authentication
      const token = localStorage.getItem('auth_token');
      
      // Add token to authorization header
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/trips/${tripId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: message }),
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Only show header when not coming from chats page */}
      {!isFromChatsPage && <Header />}
      
      <main className={`flex-1 flex flex-col overflow-hidden ${isFromChatsPage ? '' : ''}`}>
        {/* Trip Header - More compact on mobile */}
        <div className="bg-white border-b border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between relative">
            {isFromChatsPage && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-8 w-8 absolute left-0" 
                onClick={() => navigate("/chats")}
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to chats</span>
              </Button>
            )}
            <div 
              className={`${isFromChatsPage ? "cursor-pointer mx-auto" : "ml-0"} text-center`}
              onClick={isFromChatsPage ? () => navigate(`/trips/${tripId}`) : undefined}
            >
              <h2 className="text-lg md:text-xl font-bold text-gray-900">{trip.name}</h2>
              <p className="text-xs md:text-sm text-gray-600">
                {isFromChatsPage ? "Tap to see trip details" : "Group Chat"}
              </p>
            </div>
            {/* Empty div to balance the header when back button is shown */}
            {isFromChatsPage && <div className="w-8"></div>}
          </div>
        </div>

        {/* Tab Navigation - only show when not coming from chats page */}
        {!isFromChatsPage && <TripTabs tripId={tripId} />}

        {/* Chat Content - Clean design with minimal padding */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 pb-4 bg-white">
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
          ) : messages && messages.length > 0 ? (
            <div className="space-y-2 py-1">
              {/* Combined message and poll timeline */}
              {(() => {
                // Create arrays for messages and polls
                const messageItems = messages.map(msg => ({
                  id: `msg-${msg.id}`,
                  type: 'message',
                  content: msg.content,
                  timestamp: msg.timestamp,
                  user: msg.user
                }));
                
                const pollItems = Array.isArray(polls) ? polls.map(poll => ({
                  id: `poll-${poll.id}`,
                  type: 'poll',
                  poll: poll,
                  timestamp: poll.createdAt,
                  user: {
                    id: poll.createdBy,
                    name: poll.creator?.name || "Anonymous"
                  }
                })) : [];
                
                // Combine and sort chronologically
                const timelineItems = [...messageItems, ...pollItems].sort((a, b) => 
                  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                
                // Render each item based on its type
                return timelineItems.map(item => {
                  if (item.type === 'message') {
                    // Regular message rendering
                    return (
                      <div key={item.id} className={`flex items-start mb-3 ${item.user?.id === user?.id ? "flex-row-reverse" : ""}`}>
                        {item.user?.id !== user?.id && (
                          <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mr-2 text-sm font-medium">
                            {item.user?.name ? item.user.name.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                        <div className="max-w-[85%]">
                          {item.user?.id !== user?.id && (
                            <button 
                              onClick={() => navigate(`/user/${item.user?.id}`)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 mb-1 cursor-pointer hover:underline"
                            >
                              {item.user?.name || item.user?.username || 'Anonymous'}
                            </button>
                          )}
                          <div
                            className={`rounded-lg py-1.5 px-2.5 md:py-2 md:px-3 ${
                              item.user?.id === user?.id
                                ? "bg-blue-600 text-white rounded-tr-sm ml-auto"
                                : "bg-gray-100 text-gray-800 rounded-tl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
                          </div>
                          <span
                            className={`text-[10px] md:text-xs mt-0.5 block ${
                              item.user?.id === user?.id ? "text-right text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    // Poll rendering
                    const poll = item.poll;
                    const isOwnPoll = poll.createdBy === user?.id;
                    
                    return (
                      <div key={item.id} className={`flex items-start mb-3 ${isOwnPoll ? "flex-row-reverse" : ""}`}>
                        {!isOwnPoll && (
                          <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mr-2 text-sm font-medium">
                            {item.user?.name ? item.user.name.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                        <div className="max-w-[85%]">
                          {!isOwnPoll && (
                            <p className="text-xs font-medium text-gray-900 mb-1">{item.user?.name}</p>
                          )}
                          <div className={`rounded-lg p-2 ${
                            isOwnPoll 
                              ? "bg-blue-50 border border-blue-100 rounded-tr-sm" 
                              : "bg-gray-50 border border-gray-100 rounded-tl-sm"
                          }`}>
                            <p className={`text-xs font-medium mb-1 ${
                              isOwnPoll ? "text-blue-700" : "text-gray-700"
                            }`}>
                              Poll: {poll.title}
                            </p>
                            <ChatPoll poll={poll} tripId={tripId} />
                          </div>
                          <span className={`text-[10px] md:text-xs mt-0.5 block ${
                            isOwnPoll ? "text-right text-gray-400" : "text-gray-500"
                          }`}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  }
                });
              })()}
              
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
              
              {/* Show polls integrated with chat flow even when there are no messages */}
              {Array.isArray(polls) && polls.length > 0 && polls.map((poll: any) => (
                <div key={`poll-${poll.id}`} className="flex items-start mb-3 w-full max-w-md mx-auto">
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mr-2 text-sm font-medium">
                    {poll.creator?.name ? poll.creator.name.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="max-w-[85%]">
                    <p className="text-xs font-medium text-gray-900 mb-1">{poll.creator?.name || "Anonymous"}</p>
                    <div className="w-full">
                      <ChatPoll poll={poll} tripId={tripId} />
                    </div>
                    <span className="text-[10px] md:text-xs mt-1 block text-gray-500">
                      {new Date(poll.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input - Flush with bottom of screen */}
        <div className="bg-white border-t border-gray-200 p-2 md:p-3 sticky bottom-0 z-20 mt-auto">
          {!isConfirmedMember ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-sm text-amber-700">
                {isPendingMember && "Please confirm your RSVP to participate in chat"}
                {isDeclinedMember && "You need confirmed attendance to chat"}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center space-x-2 flex-shrink-0">
              {/* Add option button - Only show when coming from chats page */}
              {isFromChatsPage && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-gray-500 hover:text-primary-500"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-48 p-2">
                    <div className="space-y-1">
                      <CreatePollDialog tripId={tripId} variant="compact">
                        <Button variant="ghost" size="sm" className="w-full justify-start">
                          <PieChart className="h-4 w-4 mr-2" />
                          Create Poll
                        </Button>
                      </CreatePollDialog>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-10 text-sm"
                autoComplete="off"
              />
              <Button 
                type="submit" 
                size="sm"
                className="h-10 w-10 p-0 min-w-0 flex-shrink-0"
                disabled={isSubmitting || !message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </main>
      
      {/* Hide mobile navigation in chat to prevent it from blocking the message input */}
    </div>
  );
}
