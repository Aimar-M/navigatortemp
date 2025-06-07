import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    try {
      // Try to parse as JSON first
      const errorJson = await res.json();
      errorText = errorJson.message || JSON.stringify(errorJson);
    } catch (e) {
      // If not JSON, get as text
      try {
        errorText = await res.text();
      } catch (e2) {
        errorText = res.statusText;
      }
    }
    throw new Error(`${res.status}: ${errorText}`);
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
    credentials: 'include', // Include cookies for session authentication
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
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
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
