import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseList from "./ExpenseList";
import ExpenseSummary from "./ExpenseSummary";
import FlightSearch from "./FlightSearch";
import FlightInfo from "./FlightInfo";

interface BudgetTabsProps {
  tripId: number;
  currentUserId: number;
  isOrganizer: boolean;
  isAdmin?: boolean;
}

const BudgetTabs: React.FC<BudgetTabsProps> = ({ tripId, currentUserId, isOrganizer, isAdmin = false }) => {
  return (
    <Tabs defaultValue="summary" className="mt-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
        <TabsTrigger value="flights">Flights</TabsTrigger>
        <TabsTrigger value="search">Flight Search</TabsTrigger>
      </TabsList>
      
      <TabsContent value="summary" className="mt-6">
        <ExpenseSummary tripId={tripId} currentUserId={currentUserId} />
      </TabsContent>
      
      <TabsContent value="expenses" className="mt-6">
        <ExpenseList tripId={tripId} currentUserId={currentUserId} isOrganizer={isOrganizer} isAdmin={isAdmin} />
      </TabsContent>
      
      <TabsContent value="flights" className="mt-6">
        <FlightInfo tripId={tripId} currentUserId={currentUserId} />
      </TabsContent>
      
      <TabsContent value="search" className="mt-6">
        <FlightSearch tripId={tripId} />
      </TabsContent>
    </Tabs>
  );
};

export default BudgetTabs;