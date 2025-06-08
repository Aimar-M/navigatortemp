import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface Tab {
  name: string;
  href: string;
}

interface TripTabsProps {
  tripId: number;
  isConfirmedMember?: boolean;
}

export default function TripTabs({ tripId, isConfirmedMember = true }: TripTabsProps) {
  const [location, navigate] = useLocation();
  
  const allTabs: Tab[] = [
    { name: "Overview", href: `/trips/${tripId}` },
    { name: "Itinerary", href: `/trips/${tripId}/itinerary` },
    { name: "Chat", href: `/trips/${tripId}/chat` },
    { name: "Group Expense Tracker", href: `/trips/${tripId}/expenses` },
    { name: "Budget", href: `/trips/${tripId}/budget` },
    { name: "Flights", href: `/trips/${tripId}/flights` },
    { name: "Polls", href: `/trips/${tripId}/polls` },
  ];

  // Allow pending users to see Overview tab only
  const tabs = isConfirmedMember ? allTabs : allTabs.filter(tab => 
    tab.name === "Overview"
  );

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
          onClick={() => {
            // When navigating to chat from tabs, clear any previous referrer
            if (tab.name === "Chat") {
              sessionStorage.removeItem('chatReferrer');
            }
            navigate(tab.href);
          }}
        >
          {tab.name}
        </button>
      ))}
    </div>
  );
}
