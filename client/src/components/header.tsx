import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bell, ChevronDown, Menu, MessageCircle, CalendarPlus, UserPlus, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import navigatorLogo from "@assets/ab_Navigator2-11_1749671092581.png";
import navigatorText from "@assets/ab_Navigator2-09_1749671257407.png";
import { NotificationBell } from "@/components/NotificationBell";

export default function Header() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const token = user ? localStorage.getItem('auth_token') : null;
  
  // Fetch pending invitations for notifications
  const { data: pendingInvitations } = useQuery({
    queryKey: ["/api/trips/memberships/pending", !!user, token],
    queryFn: async () => {
      if (!user || !token) return [];
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      try {
        const response = await fetch("/api/trips/memberships/pending", { headers });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        console.error("Failed to fetch pending invitations", error);
        return [];
      }
    },
    enabled: !!user && !!token,
  });
  
  // Update notifications when data changes
  useEffect(() => {
    if (!pendingInvitations) return;
    
    const newNotifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      time: Date;
      data: any;
      isRead: boolean;
    }> = [];
    
    // Add trip invitation notifications
    if (pendingInvitations.length > 0) {
      pendingInvitations.forEach((invitation: any) => {
        newNotifications.push({
          id: `invite-${invitation.membership.tripId}`,
          type: 'invite',
          title: `Trip Invitation: ${invitation.trip?.name}`,
          message: `${invitation.organizer?.name || invitation.organizer?.username} invited you to join their trip`,
          time: new Date(),
          data: invitation,
          isRead: false
        });
      });
    }
    
    // Set has notifications flag
    setHasNotifications(newNotifications.length > 0);
    setNotifications(newNotifications);
  }, [pendingInvitations]);
  
  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'invite') {
      navigate(`/trips/${notification.data.trip.id}`);
    }
    
    // Mark as read
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? {...n, isRead: true} : n
    ));
    
    // Close dropdown
    setNotificationsOpen(false);
  };
  
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    setHasNotifications(false);
  };

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <img 
                src={navigatorLogo} 
                alt="Navigator Logo" 
                className="h-12 w-12 md:h-10 md:w-10"
              />
              <img 
                src={navigatorText} 
                alt="Navigator" 
                className="h-11 hidden md:block"
              />
            </div>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center space-x-2">
            {/* Budget Dashboard Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:bg-gray-100"
              onClick={() => navigate("/budget-dashboard")}
              title="Budget Dashboard"
            >
              <PieChart className="h-5 w-5" />
            </Button>

            <NotificationBell />

            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-gray-500 hover:bg-gray-100"
                >
                  <Bell className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500">
                      {notifications.length > 0 && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      )}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-2">
                  <DropdownMenuLabel className="text-base font-semibold">Notifications</DropdownMenuLabel>
                  {notifications.length > 0 && (
                    <Button 
                      variant="ghost" 
                      className="h-auto p-1 text-xs text-gray-500 hover:text-gray-900"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                
                {notifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className={`p-3 cursor-pointer ${notification.isRead ? 'bg-white' : 'bg-blue-50'}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                            {notification.type === 'invite' && (
                              <UserPlus className="h-4 w-4 text-blue-600" />
                            )}
                            {notification.type === 'message' && (
                              <MessageCircle className="h-4 w-4 text-blue-600" />
                            )}
                            {notification.type === 'activity' && (
                              <CalendarPlus className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-500">{notification.message}</p>
                            <p className="text-xs text-gray-400">
                              {notification.time && new Date(notification.time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No new notifications</p>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-gray-100"
                >
                  <UserAvatar user={user} className="h-8 w-8" />
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <div className="cursor-pointer w-full flex">Profile</div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <div className="cursor-pointer w-full flex">Settings</div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild size="sm">
              <Link href="/login">
                <a>Log in</a>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                <a>Sign up</a>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
