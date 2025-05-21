import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FlightSearch from "./FlightSearch";
import FlightInfo from "./FlightInfo";

interface BudgetContentProps {
  tripId: number;
  currentUserId: number;
  isOrganizer: boolean;
}

const BudgetContent: React.FC<BudgetContentProps> = ({ tripId, currentUserId, isOrganizer }) => {
  return (
    <Tabs defaultValue="flights" className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="flights">Flights</TabsTrigger>
        <TabsTrigger value="search">Flight Search</TabsTrigger>
      </TabsList>
      
      <TabsContent value="flights" className="mt-6">
        <FlightInfo tripId={tripId} currentUserId={currentUserId} />
      </TabsContent>
      
      <TabsContent value="search" className="mt-6">
        <FlightSearch tripId={tripId} />
      </TabsContent>
    </Tabs>
  );
};

export default BudgetContent;