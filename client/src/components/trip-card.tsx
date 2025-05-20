import { Link } from "wouter";
import { formatDateRange, getTripStatusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TripCardProps {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  memberCount: number;
  isActive?: boolean;
}

export default function TripCard({
  id,
  name,
  destination,
  startDate,
  endDate,
  status,
  memberCount,
  isActive = false,
}: TripCardProps) {
  return (
    <Link href={`/trips/${id}`}>
      <div className="block">
        <Card
          className={cn(
            "cursor-pointer hover:bg-gray-50 transition-colors",
            isActive ? "bg-primary-50 border-l-4 border-primary-600" : "border-b"
          )}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <p className="text-sm text-gray-600">
                  {formatDateRange(startDate, endDate)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium px-2.5 py-0.5 rounded-full",
                  getTripStatusColor(status)
                )}
              >
                {status}
              </Badge>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <Users className="h-3.5 w-3.5 mr-1" />
              {memberCount} {memberCount === 1 ? "person" : "people"} confirmed
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}

import { cn } from "@/lib/utils";
