import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock, Users, ExternalLink, Plane, Building } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Activity {
  id: number;
  name: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  activityType?: string;
  activityLink?: string;
  location?: string;
  duration?: string;
  cost?: string;
  paymentType?: string;
  maxParticipants?: number;
  checkInDate?: string;
  checkOutDate?: string;
  rsvps?: any[];
}

interface EnhancedItineraryPreviewProps {
  activities: Activity[];
  tripName: string;
  className?: string;
}

export default function EnhancedItineraryPreview({ activities, tripName, className }: EnhancedItineraryPreviewProps) {
  const [selectedDay, setSelectedDay] = useState<number>(0);

  const isAccommodationEntry = (activity: Activity) => {
    return activity.checkInDate || activity.checkOutDate || 
           activity.activityType === 'accommodation' ||
           activity.name?.toLowerCase().includes('hotel') ||
           activity.name?.toLowerCase().includes('accommodation');
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Group activities by day and sort chronologically
  const groupedActivities = activities
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((groups: { [key: string]: Activity[] }, activity) => {
      // For accommodations, add to all days between check-in and check-out
      if (isAccommodationEntry(activity) && activity.checkInDate && activity.checkOutDate) {
        const checkIn = new Date(activity.checkInDate);
        const checkOut = new Date(activity.checkOutDate);
        const currentDate = new Date(checkIn);
        
        while (currentDate < checkOut) {
          const dateKey = currentDate.toISOString().split('T')[0];
          if (!groups[dateKey]) {
            groups[dateKey] = [];
          }
          // Avoid duplicates
          if (!groups[dateKey].some(a => a.id === activity.id)) {
            groups[dateKey].push(activity);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Regular activities go on their specified date
        const dateKey = activity.date;
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(activity);
      }
      return groups;
    }, {});

  const uniqueDays = Object.keys(groupedActivities);
  const currentDayActivities = uniqueDays[selectedDay] ? groupedActivities[uniqueDays[selectedDay]] : [];

  const goToPreviousDay = () => {
    setSelectedDay(prev => Math.max(0, prev - 1));
  };

  const goToNextDay = () => {
    setSelectedDay(prev => Math.min(uniqueDays.length - 1, prev + 1));
  };

  const ActivityDetailsDialog = ({ activity }: { activity: Activity }) => {
    const confirmedCount = activity.rsvps?.filter(rsvp => rsvp.status === 'going').length || 0;
    const totalCount = activity.rsvps?.length || 0;
    const spotsLeft = activity.maxParticipants ? activity.maxParticipants - confirmedCount : null;
    const isAccommodation = isAccommodationEntry(activity);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer hover:bg-white/10 transition-colors rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left side: Title, location, and accommodation icon */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isAccommodation && (
                    <Building className="h-4 w-4 text-amber-300 flex-shrink-0" />
                  )}
                  <h4 className="font-medium text-white text-sm truncate">{activity.name}</h4>
                </div>
                {activity.location && (
                  <div className="flex items-center text-xs text-blue-200">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{activity.location}</span>
                  </div>
                )}
              </div>

              {/* Right side: Time and payment info */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {activity.startTime && (
                  <span className="text-xs font-medium text-blue-200 whitespace-nowrap">
                    {formatTime(activity.startTime)}
                  </span>
                )}
                {activity.paymentType && (
                  <Badge 
                    variant={activity.paymentType === 'free' ? 'secondary' : activity.paymentType === 'prepaid' ? 'default' : 'outline'}
                    className="text-xs bg-white/20 text-white border-white/30 px-2 py-1"
                  >
                    {activity.paymentType === 'free' ? 'Free' : 
                     activity.paymentType === 'payment_onsite' ? 'Pay Onsite' : 
                     'Prepaid'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">{activity.name}</DialogTitle>
            <DialogDescription className="text-gray-500 mt-1">
              {formatDate(activity.date)}
              {activity.startTime && (
                <span className="ml-2 font-medium text-blue-600">
                  at {formatTime(activity.startTime)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Activity Description */}
            {activity.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{activity.description}</p>
              </div>
            )}
            
            {/* Activity Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activity.activityType && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {activity.activityType}
                  </Badge>
                </div>
              )}
              
              {activity.activityLink && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                  <a 
                    href={activity.activityLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    View Activity Website
                  </a>
                </div>
              )}
              
              {activity.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{activity.location}</span>
                </div>
              )}
              
              {activity.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{activity.duration}</span>
                </div>
              )}
              
              {activity.cost && parseFloat(activity.cost) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Cost: ${parseFloat(activity.cost).toFixed(2)}
                  </span>
                </div>
              )}
              
              {activity.maxParticipants && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    Max {activity.maxParticipants} participants
                  </span>
                </div>
              )}
            </div>

            {/* Accommodation Details */}
            {isAccommodation && (activity.checkInDate || activity.checkOutDate) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Accommodation Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activity.checkInDate && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Check-in:</span>
                      <div className="text-sm text-gray-600">
                        {formatDate(activity.checkInDate)}
                      </div>
                    </div>
                  )}
                  {activity.checkOutDate && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Check-out:</span>
                      <div className="text-sm text-gray-600">
                        {formatDate(activity.checkOutDate)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RSVP Status */}
            {!isAccommodation && activity.rsvps && activity.rsvps.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attendance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">Going ({confirmedCount})</h4>
                    <div className="space-y-2">
                      {activity.rsvps
                        .filter(rsvp => rsvp.status === 'going')
                        .map((rsvp, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {rsvp.user?.name || 'Unknown User'}
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">
                      Not Going ({activity.rsvps.filter(rsvp => rsvp.status === 'not_going').length})
                    </h4>
                    <div className="space-y-2">
                      {activity.rsvps
                        .filter(rsvp => rsvp.status === 'not_going')
                        .map((rsvp, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {rsvp.user?.name || 'Unknown User'}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Card className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:bg-white/15">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-blue-200" />
            Trip Itinerary Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Day Separator with Integrated Navigation */}
          {uniqueDays[selectedDay] && (
            <div className="flex items-center gap-3 py-2">
              {/* Previous Day Button */}
              {uniqueDays.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousDay}
                  disabled={selectedDay === 0}
                  className="text-white hover:bg-white/20 disabled:opacity-30 h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <div className="text-white/90 font-medium px-3 py-1 bg-white/10 rounded-full text-sm">
                {formatDate(uniqueDays[selectedDay])}
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              
              {/* Next Day Button */}
              {uniqueDays.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextDay}
                  disabled={selectedDay === uniqueDays.length - 1}
                  className="text-white hover:bg-white/20 disabled:opacity-30 h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Activities for Selected Day */}
          <div className="space-y-3">
            {/* Regular Activities */}
            {currentDayActivities
              .filter(activity => !isAccommodationEntry(activity))
              .map((activity) => (
                <div key={activity.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                  <ActivityDetailsDialog activity={activity} />
                </div>
              ))}

            {/* Accommodations at Bottom */}
            {currentDayActivities
              .filter(activity => isAccommodationEntry(activity))
              .map((activity) => (
                <div key={`accommodation-${activity.id}-${uniqueDays[selectedDay]}`} className="bg-amber-500/10 backdrop-blur-sm rounded-xl border border-amber-300/20">
                  <ActivityDetailsDialog activity={activity} />
                </div>
              ))}
          </div>

          {/* No Activities Message */}
          {currentDayActivities.length === 0 && (
            <div className="text-center py-8 text-white/70">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No activities planned for this day</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}