import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface UserProfileData {
  id: number;
  username: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  createdAt: string;
}

interface UserStats {
  totalTrips: number;
  upcomingTrips: number;
  companions: number;
}

export default function UserProfile() {
  const [, params] = useRoute("/user/:userId");
  const [, setLocation] = useLocation();
  const userId = params?.userId;

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfileData>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}/stats`],
    enabled: !!userId,
  });

  if (profileLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-20 w-20 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
            <p className="text-gray-600 mb-4">This user profile doesn't exist or is private.</p>
            <Button onClick={() => setLocation("/")}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  const getDisplayName = () => {
    if (profile.firstName || profile.lastName) {
      return `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    }
    return profile.name || profile.username;
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mr-3"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={getDisplayName()}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h1>
              <p className="text-gray-600">@{profile.username}</p>
              {profile.location && (
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.location}
                </div>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-gray-700 mb-4">{profile.bio}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>

        {/* Stats Card */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Travel Stats</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalTrips}</div>
                <div className="text-sm text-gray-600">Total Trips</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.upcomingTrips}</div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.companions}</div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-center">
                    <Users className="h-4 w-4 mr-1" />
                    Companions
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}