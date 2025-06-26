// API configuration for different environments
export const API_CONFIG = {
  // Use environment variable for production, fallback to localhost for development
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  
  // WebSocket URL configuration
  wsURL: (() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return apiUrl.replace(/^http/, 'ws');
  })(),
  
  // Default headers for API requests
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
};

// Helper function to construct full API URLs
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.baseURL}/${cleanEndpoint}`;
}