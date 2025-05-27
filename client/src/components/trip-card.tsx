import { Link } from "wouter";
import { formatDateRange, getTripStatusColor, cn } from "@/lib/utils";
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
      <div className="block mb-3 group transform transition-all duration-300 hover:translate-y-[-4px]">
        <Card
          className={cn(
            "cursor-pointer group-hover:shadow-lg transition-all duration-300 overflow-hidden",
            isActive ? "border-2 border-primary-600" : "border"
          )}
        >
          {/* Trip Image Section */}
          <div className={cn(
            "h-32 w-full relative overflow-hidden", 
            !imageUrl && defaultBackgroundClass
          )}>
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={name} 
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl group overflow-hidden">
                {/* Empty colorful background without text */}
              </div>
            )}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/0 to-white/20 opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:rotate-12 pointer-events-none"></div>
            <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-primary-200/20 via-primary-300/10 to-primary-200/20 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <Badge
              variant="outline"
              className={cn(
                "absolute top-2 right-2 text-xs font-medium px-2.5 py-0.5 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-sm",
                getTripStatusColor(status)
              )}
            >
              {status}
            </Badge>
          </div>
          
          <CardContent className="p-4 relative z-10 transition-all duration-300 group-hover:bg-opacity-95">
            <div className="flex flex-col">
              <h3 className="font-semibold text-lg text-gray-900 relative transition-all duration-300 group-hover:text-primary-600">
                {name}
                <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-primary-500 transition-all duration-500 group-hover:w-full"></span>
              </h3>
              
              <div className="flex items-center mt-1 text-sm text-gray-600 transition-all duration-300 group-hover:translate-x-1">
                <MapPin className="h-3.5 w-3.5 mr-1 text-gray-500 transition-colors duration-300 group-hover:text-primary-500" />
                <span>{destination}</span>
              </div>
              
              <div className="flex items-center mt-1 text-sm text-gray-600 transition-all duration-300 group-hover:translate-x-1">
                <Calendar className="h-3.5 w-3.5 mr-1 text-gray-500 transition-colors duration-300 group-hover:text-primary-500" />
                <span>{formatDateRange(startDate, endDate)}</span>
              </div>
              
              <div className="mt-2 flex items-center text-xs text-gray-500 border-t pt-2 transition-all duration-300">
                <Users className="h-3.5 w-3.5 mr-1 transition-transform duration-300 group-hover:text-primary-500 group-hover:scale-110" />
                <span className="transition-all duration-300 group-hover:font-medium">
                  {memberCount || 0} {(memberCount || 0) === 1 ? "person" : "people"} confirmed
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}