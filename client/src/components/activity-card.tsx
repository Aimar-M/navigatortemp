import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityCardProps {
  id: number;
  name: string;
  description?: string;
  date: string;
  location?: string;
  duration?: number;
  cost?: string;
  confirmedCount: number;
  totalCount: number;
}

export default function ActivityCard({
  id,
  name,
  description,
  date,
  location,
  confirmedCount,
  totalCount,
}: ActivityCardProps) {
  return (
    <Card className="border border-gray-200 rounded-lg">
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs text-gray-500">{formatDateTime(date)}</span>
            <h4 className="font-medium text-gray-900">{name}</h4>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
            {location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 mr-1"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {location}
              </p>
            )}
          </div>
          <Badge variant="outline" className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
            {confirmedCount}/{totalCount} Going
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
