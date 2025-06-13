import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  // Group activities by day and sort chronologically
  const groupedActivities = activities
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((groups: { [key: string]: Activity[] }, activity) => {
      const dateKey = activity.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
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

  const formatTime = (time?: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isAccommodationEntry = (activity: Activity) => {
    return activity.checkInDate || activity.checkOutDate || 
           activity.activityType === 'accommodation' ||
           activity.name?.toLowerCase().includes('hotel') ||
           activity.name?.toLowerCase().includes('accommodation');
  };

  const ActivityDetailsDialog = ({ activity }: { activity: Activity }) => {
    const confirmedCount = activity.rsvps?.filter(rsvp => rsvp.status === 'going').length || 0;
    const totalCount = activity.rsvps?.length || 0;
    const spotsLeft = activity.maxParticipants ? activity.maxParticipants - confirmedCount : null;
    const isAccommodation = isAccommodationEntry(activity);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className="cursor-pointer hover:bg-white/10 transition-colors rounded-lg p-3 -m-3">
            <div className="space-y-2">
              {/* Title and Time row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <h4 className="font-bold text-white text-base sm:text-lg flex-1">{activity.name}</h4>
                {activity.startTime && (
                  <span className="text-sm font-bold text-black bg-amber-300 px-3 py-1 rounded-lg shadow-md self-start sm:self-auto">
                    {formatTime(activity.startTime)}
                  </span>
                )}
              </div>
              
              {/* Location */}
              {activity.location && (
                <div className="flex items-center text-sm text-slate-200 font-medium">
                  <MapPin className="h-4 w-4 mr-2 text-cyan-300 flex-shrink-0" />
                  <span className="break-words">{activity.location}</span>
                </div>
              )}

              {/* Bottom row: Payment type and RSVP info */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                {/* Payment type */}
                <div className="flex-shrink-0">
                  {activity.paymentType && (
                    <Badge 
                      variant={activity.paymentType === 'free' ? 'secondary' : activity.paymentType === 'prepaid' ? 'default' : 'outline'}
                      className={
                        activity.paymentType === 'free' 
                          ? "text-xs font-bold bg-emerald-500 text-white border-emerald-400 shadow-md" 
                          : activity.paymentType === 'prepaid' 
                          ? "text-xs font-bold bg-blue-500 text-white border-blue-400 shadow-md" 
                          : "text-xs font-bold bg-orange-500 text-white border-orange-400 shadow-md"
                      }
                    >
                      {activity.paymentType === 'free' ? 'Free' : 
                       activity.paymentType === 'payment_onsite' ? 'Pay Onsite' : 
                       'Prepaid'}
                    </Badge>
                  )}
                </div>

                {/* RSVP info and spots */}
                {!isAccommodation && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs font-bold">
                    <span className="text-slate-100 bg-slate-600/60 px-2 py-1 rounded">{confirmedCount}/{totalCount} going</span>
                    {activity.maxParticipants && (
                      <span className={spotsLeft && spotsLeft <= 3 
                        ? "text-black bg-yellow-300 px-2 py-1 rounded font-bold" 
                        : "text-slate-100 bg-slate-600/60 px-2 py-1 rounded"
                      }>
                        {spotsLeft && spotsLeft > 0 
                          ? `${spotsLeft} spots left`
                          : "Full"
                        }
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">{activity.name}</DialogTitle>
            <div className="text-gray-500 mt-1">
              {formatDate(activity.date)}
              {activity.startTime && (
                <span className="ml-2 font-medium text-blue-600">
                  at {formatTime(activity.startTime)}
                </span>
              )}
            </div>
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
          {/* Day Navigation */}
          {uniqueDays.length > 1 && (
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-md rounded-xl p-3 sm:p-4 border border-slate-500/50 shadow-xl">
              {/* Mobile: Day info first, then buttons below */}
              <div className="order-2 sm:order-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousDay}
                  disabled={selectedDay === 0}
                  className="text-white font-bold hover:bg-slate-600/60 disabled:opacity-30 bg-slate-600/40 border border-slate-400/50 px-3 py-2 sm:px-4 shadow-lg"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              </div>
              
              <div className="order-1 sm:order-2 text-center bg-gradient-to-r from-slate-900/80 to-slate-800/80 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-slate-400/30 shadow-inner">
                <div className="text-white font-bold text-base sm:text-lg">
                  Day {selectedDay + 1} of {uniqueDays.length}
                </div>
                {uniqueDays[selectedDay] && (
                  <div className="text-amber-300 text-xs sm:text-sm font-semibold">
                    {formatDate(uniqueDays[selectedDay])}
                  </div>
                )}
              </div>
              
              <div className="order-3 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextDay}
                  disabled={selectedDay === uniqueDays.length - 1}
                  className="text-white font-bold hover:bg-slate-600/60 disabled:opacity-30 bg-slate-600/40 border border-slate-400/50 px-3 py-2 sm:px-4 shadow-lg"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Day Separator */}
          {uniqueDays[selectedDay] && (
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400/60 to-transparent"></div>
              <div className="text-white font-bold px-3 py-2 bg-gradient-to-r from-slate-700/80 to-slate-600/80 rounded-full text-sm border border-slate-400/50 shadow-lg">
                {formatDate(uniqueDays[selectedDay])}
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400/60 to-transparent"></div>
            </div>
          )}

          {/* Activities for Selected Day */}
          <div className="space-y-3">
            {/* Regular Activities */}
            {currentDayActivities
              .filter(activity => !isAccommodationEntry(activity))
              .map((activity) => (
                <div key={activity.id} className="bg-slate-700/60 backdrop-blur-md rounded-xl border border-slate-500/50 shadow-lg hover:bg-slate-600/70 transition-all">
                  <ActivityDetailsDialog activity={activity} />
                </div>
              ))}

            {/* Accommodations at Bottom */}
            {currentDayActivities
              .filter(activity => isAccommodationEntry(activity))
              .map((activity) => (
                <div key={activity.id} className="bg-blue-700/50 backdrop-blur-md rounded-xl border border-blue-500/60 shadow-lg hover:bg-blue-600/60 transition-all">
                  <ActivityDetailsDialog activity={activity} />
                </div>
              ))}
          </div>

          {/* No Activities Message */}
          {currentDayActivities.length === 0 && (
            <div className="text-center py-8 bg-slate-700/40 rounded-xl border border-slate-500/40">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-white font-medium">No activities planned for this day</p>
            </div>
          )}

          {/* More Content Indicator */}
          {uniqueDays.length > 1 && (
            <div className="mt-6 relative">
              <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent to-white/5 pointer-events-none rounded-t-xl"></div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-sm rounded-xl p-3 border border-purple-300/30 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                  <div className="absolute top-6 right-6 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-300"></div>
                  <div className="absolute bottom-3 left-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse delay-700"></div>
                </div>
                
                <div className="relative z-10 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce delay-150"></div>
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce delay-300"></div>
                    </div>
                    <span className="text-white/70 text-xs ml-2 font-medium">
                      {uniqueDays.length - 1} more days of amazing experiences
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}