import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import navigatorLogo from "@assets/ab_Navigator2-11_1749673314519.png";
import navigatorText from "@assets/ab_Navigator2-09_1749673314520.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const { login, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username.trim()) newErrors.username = "Username is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      console.log("Attempting to log in with:", username);
      await login(username, password);
      console.log("Login successful");
    } catch (error) {
      console.error("Login error:", error);
      // Display login error directly on the page for easier debugging
      setErrors({
        ...errors,
        username: "Login failed. Please check your credentials."
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-2">
            <img 
              src={navigatorLogo} 
              alt="Navigator Logo" 
              className="h-56 w-56 mb-2"
            />
            <img 
              src={navigatorText} 
              alt="Navigator" 
              className="h-30"
              style={{ height: '7.5rem' }}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Log in to your account to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log In"}
              </Button>
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register">
                  <span className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer">
                    Sign up
                  </span>
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        
      </div>
    </div>
  );
}
