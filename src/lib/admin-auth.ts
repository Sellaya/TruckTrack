'use client';

const ADMIN_EMAIL = 'info@sellaya.com';
const ADMIN_PASSWORD = 'sellayadigital';
const ADMIN_SESSION_COOKIE = 'admin_session';

// Set admin session cookie
export function setAdminSession(): void {
  if (typeof document === 'undefined') return;
  
  // Set cookie that expires in 7 days
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `${ADMIN_SESSION_COOKIE}=true; path=/; expires=${expires.toUTCString()}`;
}

// Clear admin session
export function clearAdminSession(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
}

// Get admin session
export function getAdminSession(): boolean {
  if (typeof document === 'undefined') return false;
  
  const cookies = document.cookie.split('; ');
  const sessionCookie = cookies.find(row => row.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  
  return sessionCookie?.split('=')[1] === 'true' || false;
}

// Login admin
export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  setAdminSession();
  return { success: true };
}

// Check if admin is logged in
export function isAdminLoggedIn(): boolean {
  return getAdminSession();
}


