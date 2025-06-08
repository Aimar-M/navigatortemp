import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Set up headers
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  const res = await fetch(url, {
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
    // Use session cookies for authentication
    const res = await fetch(queryKey[0] as string, {
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
