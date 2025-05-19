import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

interface User {
  id: number;
  name: string;
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
  const initials = user?.name ? getInitials(user.name) : fallback || "?";

  return (
    <Avatar className={cn("h-10 w-10", className)}>
      {user?.avatar ? (
        <AvatarImage src={user.avatar} alt={user.name} />
      ) : null}
      <AvatarFallback className={cn("text-sm", fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
