import { Link } from "wouter";
import { formatDateRange, getTripStatusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar } from "lucide-react";

interface TripCardProps {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  memberCount: number;
  isActive?: boolean;
  imageUrl?: string;
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
  imageUrl,
}: TripCardProps) {
  // Generate a default background image based on the destination name
  const generateDefaultImage = () => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", 
      "bg-rose-500", "bg-amber-500", "bg-cyan-500"
    ];
    // Use the first character of the destination to pick a color
    const colorIndex = (destination.charCodeAt(0) || 0) % colors.length;
    return colors[colorIndex];
  };
  
  const defaultBackgroundClass = generateDefaultImage();

  return (
    <Link href={`/trips/${id}`}>
      <div className="block mb-3">
        <Card
          className={cn(
            "cursor-pointer hover:shadow-md transition-all overflow-hidden",
            isActive ? "border-2 border-primary-600" : "border"
          )}
        >
          {/* Trip Image Section */}
          <div className={cn(
            "h-32 w-full relative", 
            !imageUrl && defaultBackgroundClass
          )}>
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                {destination.slice(0, 2).toUpperCase()}
              </div>
            )}
            <Badge
              variant="outline"
              className={cn(
                "absolute top-2 right-2 text-xs font-medium px-2.5 py-0.5 rounded-full",
                getTripStatusColor(status)
              )}
            >
              {status}
            </Badge>
          </div>
          
          <CardContent className="p-4">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg text-gray-900">{name}</h3>
              
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500" />
                <span>{destination}</span>
              </div>
              
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500" />
                <span>{formatDateRange(startDate, endDate)}</span>
              </div>
              
              <div className="mt-2 flex items-center text-xs text-gray-500 border-t pt-2">
                <Users className="h-3.5 w-3.5 mr-1" />
                {memberCount} {memberCount === 1 ? "person" : "people"} confirmed
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}

import { cn } from "@/lib/utils";
