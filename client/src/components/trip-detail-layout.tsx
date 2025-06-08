import React from "react";
import Header from "@/components/header";
import TripTabs from "@/components/trip-tabs";
import MobileNavigation from "@/components/mobile-navigation";

interface TripDetailLayoutProps {
  tripId: number;
  children: React.ReactNode;
  title?: string;
  description?: string;
  isConfirmedMember?: boolean;
}

const TripDetailLayout: React.FC<TripDetailLayoutProps> = ({
  tripId,
  children,
  title,
  description,
  isConfirmedMember = true
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <TripTabs tripId={tripId} isConfirmedMember={isConfirmedMember} />
      
      {/* Set a fixed height for the main content area with pb-24 to ensure space for the mobile navigation */}
      <main className="flex-1 p-4 overflow-y-auto pb-24 md:pb-4">
        <div className="max-w-7xl mx-auto">
          {(title || description) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
              {description && <p className="text-gray-600">{description}</p>}
            </div>
          )}
          
          {children}
        </div>
      </main>
      
      {/* Position the mobile navigation fixed at the bottom, always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 shadow-md">
        <MobileNavigation />
      </div>
    </div>
  );
};

export default TripDetailLayout;