import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    let errorData;
    try {
      // Try to parse as JSON first
      errorData = await res.json();
      errorText = errorData.message || JSON.stringify(errorData);
    } catch (e) {
      // If not JSON, get as text
      try {
        errorText = await res.text();
      } catch (e2) {
        errorText = res.statusText;
      }
    }
    
    // Create error with additional data for RSVP handling
    const error = new Error(`${res.status}: ${errorText}`);
    if (errorData?.requiresRSVP) {
      (error as any).requiresRSVP = true;
      (error as any).rsvpStatus = errorData.rsvpStatus;
    }
    throw error;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Set up headers with authentication token
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

<<<<<<< HEAD
  // Use full API URL if not already a full URL
  const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
=======
  // Prepend API base URL if it's not already a full URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
>>>>>>> c76e66f6ee3ec461f1f75c9346d2b837b6e25829

  const res = await fetch(fullUrl, {
    method,
    headers,
    credentials: 'include', // Include cookies for session auth
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Set up headers with authentication token
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = queryKey[0] as string;
<<<<<<< HEAD
    // Use full API URL if not already a full URL
    const fullUrl = url.startsWith('http') ? url : getApiUrl(url);
=======
    // Prepend API base URL if it's not already a full URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
>>>>>>> c76e66f6ee3ec461f1f75c9346d2b837b6e25829

    const res = await fetch(fullUrl, {
      headers,
      credentials: 'include', // Include cookies for session auth
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
