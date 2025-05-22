import { useLocation } from "wouter";
import { CalendarRange, Home, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export default function MobileNavigation() {
  const [location, navigate] = useLocation();

  const tabs = [
    { name: "Home", href: "/", icon: Home },
    { name: "Chats", href: "/chats", icon: MessageCircle },
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
            "flex-1 py-3 text-center font-medium flex flex-col items-center text-xs",
            isActive(tab.href)
              ? "text-primary-600"
              : "text-gray-500 hover:text-gray-900"
          )}
          onClick={() => navigate(tab.href)}
        >
          <tab.icon className="h-5 w-5 mb-1" />
          {tab.name}
        </button>
      ))}
    </div>
  );
}
