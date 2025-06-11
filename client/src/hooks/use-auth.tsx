import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { loginUser, registerUser, logoutUser, getAuthToken, setAuthToken, removeAuthToken, getPendingInvitation, removePendingInvitation } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

interface RegisterData {
  username: string;
  password: string;
  email: string;
  name: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if the user is logged in when the app loads
    const checkAuthStatus = async () => {
      try {
        // Check if we have a token
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // Add token to authorization header
          const headers = {
            'Authorization': `Bearer ${token}`
          };
          
          const response = await fetch("/api/auth/me", { headers });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            
            // Connect WebSocket if user is logged in
            if (userData) {
              // TODO: Fetch user's trips first
              wsClient.connect(userData.id, []);
            }
          } else {
            // If token is invalid, remove it
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const userData = await loginUser(username, password);
      
      // Store the token
      if (userData.token) {
        setAuthToken(userData.token);
      }
      
      setUser(userData);
      
      // Connect WebSocket after login
      wsClient.connect(userData.id, []);
      
      // Always redirect to home page - let home page handle pending invitations
      navigate("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid username or password",
        variant: "destructive",
      });
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const newUser = await registerUser(userData);
      
      // Store the token in localStorage
      if (newUser.token) {
        setAuthToken(newUser.token);
      }
      
      setUser(newUser);
      
      // Connect WebSocket after registration
      wsClient.connect(newUser.id, []);
      
      // Always redirect to home page - let home page handle pending invitations
      navigate("/");
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Unable to create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
      // Remove the token from localStorage
      removeAuthToken();
      setUser(null);
      wsClient.disconnect();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
