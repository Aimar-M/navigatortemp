import { useLocation } from "wouter";
import { CalendarRange, Home, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export default function MobileNavigation() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["/api/messages/unread"],
    queryFn: async () => {
      if (!user) return 0;
      
      // For now, we'll simulate unread messages
      // In a real implementation, we would fetch this from the server
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        // Here, we're getting all messages and counting those we haven't seen
        // In a real implementation, the server would track this
        const response = await fetch("/api/messages", { headers });
        if (!response.ok) return 0;
        
        const messages = await response.json();
        // Get unread message count
        // We'll use local storage to track when the user last visited the chats page
        const lastChatVisit = localStorage.getItem('lastChatVisit') 
          ? new Date(localStorage.getItem('lastChatVisit')!) 
          : new Date(0); // If never visited, all messages are unread
        
        // Only count messages from other users
        const unreadMessages = messages.filter((msg: any) => 
          new Date(msg.timestamp) > lastChatVisit && 
          msg.userId !== user?.id
        );
        
        return unreadMessages.length;
      } catch (error) {
        console.error("Error fetching unread messages:", error);
        return 0;
      }
    },
    enabled: !!user,
  });

  const tabs = [
    { name: "Home", href: "/", icon: Home },
    { 
      name: "Chats", 
      href: "/chats", 
      icon: MessageCircle,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { name: "Trips", href: "/trips", icon: CalendarRange },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex shadow-lg">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={cn(
            "flex-1 py-3 text-center font-medium flex flex-col items-center text-xs relative",
            isActive(tab.href)
              ? "text-primary-600"
              : "text-gray-500 hover:text-gray-900"
          )}
          onClick={() => navigate(tab.href)}
        >
          <div className="relative">
            <tab.icon className="h-5 w-5 mb-1" />
            {tab.badge && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </div>
          {tab.name}
        </button>
      ))}
    </div>
  );
}
