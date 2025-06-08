import { Link } from "wouter";
import { formatDateRange, getTripStatusColor, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Pin, Archive } from "lucide-react";

interface EnhancedTripCardProps {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  memberCount: number;
  isActive?: boolean;
  imageUrl?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isPending?: boolean;
  rsvpStatus?: string;
  onPin?: (id: number) => void;
  onArchive?: (id: number) => void;
}

export default function EnhancedTripCard({
  id,
  name,
  destination,
  startDate,
  endDate,
  status,
  memberCount,
  isActive = false,
  imageUrl,
  isPinned = false,
  isArchived = false,
  isPending = false,
  rsvpStatus,
  onPin,
  onArchive,
}: EnhancedTripCardProps) {
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

  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPin) onPin(id);
  };
  
  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onArchive) onArchive(id);
  };
  
  return (
    <div className="block mb-3 relative">
      {/* Pin Button - Outside of Link to prevent navigation */}
      <button 
        onClick={handlePin}
        className={cn(
          "absolute top-2 left-2 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-md",
          isPinned ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-gray-600"
        )}
        title={isPinned ? "Unpin trip" : "Pin trip to top"}
      >
        <Pin size={16} className={isPinned ? "fill-amber-500" : ""} />
      </button>
      
      {/* Archive Button */}
      <button 
        onClick={handleArchive}
        className={cn(
          "absolute top-2 left-11 z-20 p-1.5 rounded-full bg-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-md",
          isArchived ? "text-slate-500 hover:text-slate-600" : "text-gray-400 hover:text-gray-600"
        )}
        title={isArchived ? "Unarchive trip" : "Archive trip"}
      >
        <Archive size={16} className={isArchived ? "fill-slate-200" : ""} />
      </button>
      
      <div className="group transform transition-all duration-300 hover:translate-y-[-4px]">
        <Link href={`/trips/${id}`}>
          <Card
            className={cn(
              "cursor-pointer group-hover:shadow-lg transition-all duration-300 overflow-hidden",
              isActive ? "border-2 border-primary-600" : "border",
              isArchived ? "opacity-60" : "opacity-100",
              isPending ? "opacity-75 border-orange-300 bg-orange-50/50" : "",
              isPinned ? "ring-2 ring-amber-300" : ""
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
                  <div className="transition-all duration-300 group-hover:scale-125 group-hover:rotate-3 relative">
                    {destination.slice(0, 2).toUpperCase()}
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-white/40 transform translate-y-6 transition-all duration-500 group-hover:translate-y-0"></div>
                  </div>
                </div>
              )}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/0 to-white/20 opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:rotate-12 pointer-events-none"></div>
              <div className="absolute inset-0 opacity-0 bg-gradient-to-r from-primary-200/20 via-primary-300/10 to-primary-200/20 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              {isPending ? (
                <Badge
                  variant="outline"
                  className="absolute top-2 right-2 text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border-orange-300"
                >
                  Pending
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "absolute top-2 right-2 text-xs font-medium px-2.5 py-0.5 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-sm",
                    getTripStatusColor(status)
                  )}
                >
                  {status}
                </Badge>
              )}
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
        </Link>
      </div>
    </div>
  );
}