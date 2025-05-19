import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface Tab {
  name: string;
  href: string;
}

interface TripTabsProps {
  tripId: number;
}

export default function TripTabs({ tripId }: TripTabsProps) {
  const [location, navigate] = useLocation();
  
  const tabs: Tab[] = [
    { name: "Overview", href: `/trips/${tripId}` },
    { name: "Itinerary", href: `/trips/${tripId}/itinerary` },
    { name: "Chat", href: `/trips/${tripId}/chat` },
    { name: "Expenses", href: `/trips/${tripId}/expenses` },
    { name: "Polls", href: `/trips/${tripId}/polls` },
  ];

  const isActive = (tab: Tab) => {
    if (tab.href === `/trips/${tripId}` && location === `/trips/${tripId}`) {
      return true;
    }
    return location === tab.href;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 flex overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          className={cn(
            "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap",
            isActive(tab)
              ? "text-primary-600 border-primary-600"
              : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
          )}
          onClick={() => navigate(tab.href)}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
}
