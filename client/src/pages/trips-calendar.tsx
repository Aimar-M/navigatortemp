import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Header from "@/components/header";
import MobileNavigation from "@/components/mobile-navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Custom calendar component
const Calendar = ({ date, events, onDateChange }: { 
  date: Date, 
  events: any[],
  onDateChange: (date: Date) => void 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(date));
  
  // Update month when the parent date changes
  useEffect(() => {
    setCurrentMonth(new Date(date));
  }, [date]);

  const prevMonth = () => {
    setCurrentMonth(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      onDateChange(newDate);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      onDateChange(newDate);
      return newDate;
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Get days in current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  
  // Create array of days for the calendar
  const days = [];
  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Check if a day has events - including trips that span multiple days
  const getDayEvents = (day: number) => {
    if (!day) return [];
    const date = new Date(year, month, day);
    return events.filter(event => {
      if (event.type === 'trip' && event.startDate && event.endDate) {
        // For trips, check if the current day falls within the trip's date range
        const tripStart = new Date(event.startDate);
        const tripEnd = new Date(event.endDate);
        return date >= tripStart && date <= tripEnd;
      } else {
        // For activities, check if it's on the specific date
        const eventDate = new Date(event.date || event.startDate);
        return eventDate.getDate() === day && 
               eventDate.getMonth() === month && 
               eventDate.getFullYear() === year;
      }
    });
  };

  // Generate trip color based on destination name (matching trip card logic)
  const getTripColor = (destination: string) => {
    const colors = [
      { bg: "bg-blue-500", text: "text-white" },
      { bg: "bg-green-500", text: "text-white" },
      { bg: "bg-purple-500", text: "text-white" },
      { bg: "bg-rose-500", text: "text-white" },
      { bg: "bg-amber-500", text: "text-white" },
      { bg: "bg-cyan-500", text: "text-white" }
    ];
    const colorIndex = (destination.charCodeAt(0) || 0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-primary-50">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-primary-800">
          {monthNames[month]} {year}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="py-2 text-sm font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}
        
        {days.map((day, i) => {
          const dayEvents = getDayEvents(day as number);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div 
              key={i} 
              className={`relative overflow-visible min-h-[80px] border border-gray-100 ${
                day === null ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
              style={{ padding: '4px 1px' }}
            >
              {day !== null && (
                <>
                  <div className="text-right mb-1 px-1">
                    <span className={`inline-block rounded-full w-6 h-6 text-center ${
                      hasEvents 
                        ? "bg-primary-100 text-primary-800" 
                        : "text-gray-600"
                    }`}>
                      {day}
                    </span>
                  </div>
                  
                  <div className="space-y-1 relative">
                    {dayEvents.slice(0, 2).map((event, idx) => {
                      if (event.type === 'trip' && event.startDate && event.endDate) {
                        const tripStart = new Date(event.startDate);
                        const tripEnd = new Date(event.endDate);
                        const currentDay = new Date(year, month, day);
                        
                        const isStart = currentDay.toDateString() === tripStart.toDateString();
                        const isEnd = currentDay.toDateString() === tripEnd.toDateString();
                        
                        // Calculate if this is the center day to show the name
                        const tripDuration = Math.ceil((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        const daysSinceStart = Math.ceil((currentDay.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
                        const centerDay = Math.floor(tripDuration / 2);
                        const showName = daysSinceStart === centerDay || (tripDuration === 1 && isStart);
                        
                        const tripColor = getTripColor(event.destination || event.name);
                        
                        return (
                          <div
                            key={`${event.id}-${idx}`}
                            onClick={() => window.location.href = `/trips/${event.id}`}
                            className={`relative h-6 cursor-pointer ${tripColor.bg} ${tripColor.text} ${
                              isStart && isEnd ? 'rounded' :
                              isStart ? 'rounded-l' :
                              isEnd ? 'rounded-r' :
                              'rounded-none'
                            }`}
                            style={{
                              marginLeft: isStart ? '0' : '-4px',
                              marginRight: isEnd ? '0' : '-4px',
                              width: isStart && isEnd ? '100%' : 
                                     isStart ? 'calc(100% + 4px)' :
                                     isEnd ? 'calc(100% + 4px)' :
                                     'calc(100% + 8px)',
                              zIndex: 10
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center px-2">
                              <span className="text-xs font-medium truncate">
                                {showName ? event.name : ''}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        // Activities display as before
                        return (
                          <div
                            key={`${event.id}-${idx}`}
                            onClick={() => window.location.href = `/trips/${event.tripId}/activities`}
                            className="block text-xs p-1 rounded truncate cursor-pointer bg-green-100 text-green-800 mx-1"
                          >
                            {event.name}
                          </div>
                        );
                      }
                    })}
                    
                    {dayEvents.length > 2 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="text-xs py-0 h-auto w-full justify-start"
                          >
                            +{dayEvents.length - 2} more
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2">
                          <div className="space-y-1">
                            {dayEvents.map((event, idx) => (
                              <div 
                                key={`popup-${event.id}-${idx}`}
                                onClick={() => window.location.href = event.type === 'trip' 
                                  ? `/trips/${event.id}` 
                                  : `/trips/${event.tripId}/activities`
                                }
                                className={`block text-xs p-2 rounded cursor-pointer ${
                                  event.type === 'trip' 
                                    ? "bg-blue-100 text-blue-800" 
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {event.name}
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function TripsCalendar() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month"); // month, year
  const [yearView, setYearView] = useState(currentDate.getFullYear());

  // Fetch all trips
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["/api/trips"],
    queryFn: async () => {
      if (!user) return [];
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/trips", { headers });
      if (!response.ok) throw new Error("Failed to fetch trips");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch all activities across trips
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/activities"],
    queryFn: async () => {
      if (!user) return [];
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Use our new dedicated endpoint to get all activities
      const response = await fetch('/api/activities', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const allActivities = await response.json();
      return allActivities.map((activity: any) => ({
        ...activity,
        type: 'activity',
        date: activity.date
      }));
    },
    enabled: !!user,
  });

  // Prepare calendar events by combining trips and activities
  const calendarEvents = [...(trips || []).map((trip: any) => ({
    ...trip,
    type: 'trip',
    date: trip.startDate
  })), ...(activities || [])];

  // Filter events for the current year (for year view)
  const yearEvents = calendarEvents.filter(event => {
    const eventDate = new Date(event.date || event.startDate);
    return eventDate.getFullYear() === yearView;
  });

  // Group events by month for year view
  const eventsByMonth = Array(12).fill(0).map((_, monthIndex) => {
    return yearEvents.filter(event => {
      const eventDate = new Date(event.date || event.startDate);
      return eventDate.getMonth() === monthIndex;
    });
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const isLoading = tripsLoading || activitiesLoading;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Trips Calendar</h1>
              <p className="text-sm text-gray-600">View your trips and activities schedule</p>
            </div>
            <Button onClick={() => navigate("/create-trip")}>
              <Plus className="h-4 w-4 mr-2" /> New Trip
            </Button>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex items-center gap-2">
              <Select
                value={view}
                onValueChange={(value) => setView(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month View</SelectItem>
                  <SelectItem value="year">Year View</SelectItem>
                </SelectContent>
              </Select>
              
              {view === "year" && (
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={() => setYearView(prev => prev - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium mx-2">{yearView}</span>
                  <Button variant="ghost" size="icon" onClick={() => setYearView(prev => prev + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : view === "month" ? (
            <Calendar 
              date={currentDate} 
              events={calendarEvents} 
              onDateChange={setCurrentDate} 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(12).fill(0).map((_, monthIndex) => {
                const monthEvents = eventsByMonth[monthIndex];
                const hasEvents = monthEvents.length > 0;
                
                return (
                  <div key={monthIndex} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className={`p-3 ${hasEvents ? 'bg-primary-50' : 'bg-gray-50'}`}>
                      <h3 className="font-medium">
                        {new Date(yearView, monthIndex).toLocaleString('default', { month: 'long' })}
                      </h3>
                    </div>
                    <div className="p-3">
                      {hasEvents ? (
                        <div className="space-y-2">
                          {monthEvents.slice(0, 3).map((event, idx) => (
                            <div
                              key={`${event.id}-${idx}`}
                              onClick={() => window.location.href = event.type === 'trip' 
                                ? `/trips/${event.id}` 
                                : `/trips/${event.tripId}/activities`
                              }
                              className={`block text-sm p-2 rounded cursor-pointer ${
                                event.type === 'trip' 
                                  ? "bg-blue-100 text-blue-800" 
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              <div className="font-medium">{event.name}</div>
                              <div className="text-xs">
                                {formatDate(event.date || event.startDate)}
                              </div>
                            </div>
                          ))}
                          
                          {monthEvents.length > 3 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  className="text-xs py-1 h-auto w-full justify-start"
                                >
                                  +{monthEvents.length - 3} more events
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-2">
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                  {monthEvents.map((event, idx) => (
                                    <div
                                      key={`popup-${event.id}-${idx}`}
                                      onClick={() => window.location.href = event.type === 'trip' 
                                        ? `/trips/${event.id}` 
                                        : `/trips/${event.tripId}/activities`
                                      }
                                      className={`block text-sm p-2 rounded cursor-pointer ${
                                        event.type === 'trip' 
                                          ? "bg-blue-100 text-blue-800" 
                                          : "bg-green-100 text-green-800"
                                      }`}
                                    >
                                      <div className="font-medium">{event.name}</div>
                                      <div className="text-xs">
                                        {formatDate(event.date || event.startDate)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-2">No events</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      <MobileNavigation />
    </div>
  );
}