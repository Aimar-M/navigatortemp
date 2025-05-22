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
  size?: "xs" | "sm" | "md" | "lg";
}

export default function UserAvatar({
  user,
  className,
  fallback,
  fallbackClassName,
  size = "md",
}: UserAvatarProps) {
  // Get display name, prioritize name, then username, then use id as fallback
  const displayName = user?.name || user?.username || `User ${user?.id}`;
  const initials = displayName ? getInitials(displayName) : fallback || "?";
  
  // Size classes
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user?.avatar ? (
        <AvatarImage src={user.avatar} alt={displayName} />
      ) : null}
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
