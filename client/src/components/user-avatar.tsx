import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

interface User {
  id: number;
  name?: string;
  username?: string;
  avatar?: string | null;
}

interface UserAvatarProps {
  user?: User | null;
  className?: string;
  fallback?: string;
  fallbackClassName?: string;
}

export default function UserAvatar({
  user,
  className,
  fallback,
  fallbackClassName,
}: UserAvatarProps) {
  // Get display name, prioritize name, then username, then use id as fallback
  const displayName = user?.name || user?.username || `User ${user?.id}`;
  const initials = displayName ? getInitials(displayName) : fallback || "?";

  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {user?.avatar ? (
        <AvatarImage src={user.avatar} alt={displayName} />
      ) : null}
      <AvatarFallback className={cn("text-sm", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
