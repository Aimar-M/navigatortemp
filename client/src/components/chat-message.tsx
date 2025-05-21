import { formatTime } from "@/lib/utils";
import UserAvatar from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";

interface User {
  id: number;
  name?: string;
  username?: string;
  avatar?: string;
}

interface MessageProps {
  id: number;
  content: string;
  timestamp: string;
  user: User;
}

export default function ChatMessage({ id, content, timestamp, user }: MessageProps) {
  const { user: currentUser } = useAuth();
  // Ensure we're properly comparing user IDs
  const isCurrentUser = currentUser?.id === user?.id;

  return (
    <div
      className={`flex items-start mb-4 ${
        isCurrentUser ? "flex-row-reverse" : ""
      }`}
    >
      {!isCurrentUser && (
        <UserAvatar
          user={user}
          className="h-8 w-8 mr-2"
        />
      )}
      <div className="max-w-[80%]">
        {!isCurrentUser && (
          <p className="text-xs font-medium text-gray-900 mb-1">
            {user.name || user.username || `User ${user.id}`}
          </p>
        )}
        <div
          className={`rounded-lg py-2 px-3 ${
            isCurrentUser
              ? "bg-primary-600 text-white rounded-tr-sm ml-auto"
              : "bg-gray-100 text-gray-800 rounded-tl-sm"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
        <span
          className={`text-xs mt-1 block ${
            isCurrentUser ? "text-right text-gray-400" : "text-gray-500"
          }`}
        >
          {formatTime(new Date(timestamp))}
        </span>
      </div>
    </div>
  );
}
