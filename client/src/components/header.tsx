import { Link, useLocation } from "wouter";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/user-avatar";
import { useAuth } from "@/hooks/use-auth";

export default function Header() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary-600"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <h1 className="text-xl font-bold text-gray-800">Navigator</h1>
            </a>
          </Link>
        </div>

        {user ? (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-500 hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-gray-100"
                >
                  <UserAvatar user={user} className="h-8 w-8" />
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <a className="cursor-pointer w-full flex">Profile</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <a className="cursor-pointer w-full flex">Settings</a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild size="sm">
              <Link href="/login">
                <a>Log in</a>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">
                <a>Sign up</a>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
