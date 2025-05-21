// Simple auth utilities to handle login/register/logout

export async function loginUser(username: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to login');
  }

  return response.json();
}

export async function registerUser(userData: {
  username: string;
  password: string;
  email: string;
  name: string;
}) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to register');
  }

  return response.json();
}

export async function logoutUser() {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to logout');
  }

  return response.json();
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('auth_token');
}

export function getPendingInvitation() {
  return localStorage.getItem('pendingInvitation');
}

export function setPendingInvitation(token: string) {
  localStorage.setItem('pendingInvitation', token);
}

export function removePendingInvitation() {
  localStorage.removeItem('pendingInvitation');
}