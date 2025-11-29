/**
 * Driver authentication utilities
 * In production, this would use Firebase Auth or another authentication service
 */

import type { Driver } from './types';
import { getDriverByEmail } from './supabase/database';

export interface DriverSession {
  driverId: string;
  email: string;
  name: string;
}

const DRIVER_SESSION_KEY = 'driver_session';

// Get current driver session
export function getDriverSession(): DriverSession | null {
  if (typeof window === 'undefined') return null;
  
  const session = localStorage.getItem(DRIVER_SESSION_KEY);
  if (!session) return null;
  
  try {
    return JSON.parse(session) as DriverSession;
  } catch {
    return null;
  }
}

// Set driver session
export function setDriverSession(driver: Driver): void {
  if (typeof window === 'undefined') return;
  
  const session: DriverSession = {
    driverId: driver.id,
    email: driver.email,
    name: driver.name,
  };
  
  localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
  
  // Also set a cookie for middleware to check
  document.cookie = `${DRIVER_SESSION_KEY}=${JSON.stringify(session)}; path=/; max-age=86400; SameSite=Lax`;
}

// Clear driver session (logout)
export function clearDriverSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRIVER_SESSION_KEY);
  
  // Also clear the cookie
  document.cookie = `${DRIVER_SESSION_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

// Login driver with email and password
export async function loginDriver(email: string, password: string): Promise<{ success: boolean; driver?: Driver; error?: string }> {
  // Try to get driver from Supabase first (will return null if not configured)
  let driver: Driver | null = null;
  
  try {
    driver = await getDriverByEmail(email);
  } catch (error) {
    // Supabase not configured or error - will fall back to mock data
    console.log('Supabase lookup failed, using mock data:', error);
  }
  
  // Fallback to mock data if Supabase is not configured or driver not found
  if (!driver) {
    // Import drivers from data module
    const { drivers: mockDrivers } = await import('./data');
    driver = mockDrivers.find(d => d.email.toLowerCase() === email.toLowerCase()) || null;
  }
  
  if (!driver) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  // Verify password - check if the provided password matches the driver's password
  // In production, this would verify a hashed password using bcrypt or similar
  // For now, we do a plain text comparison since passwords are stored as plain text
  // TODO: Implement proper password hashing (bcrypt) in production
  if (driver.password !== password) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  if (!driver.isActive) {
    return { success: false, error: 'Your profile is inactive. Please contact your administrator to reactivate your account.' };
  }
  
  setDriverSession(driver);
  return { success: true, driver };
}

// Check if driver is logged in
export function isDriverLoggedIn(): boolean {
  return getDriverSession() !== null;
}

// Get current driver
export async function getCurrentDriver(): Promise<Driver | null> {
  const session = getDriverSession();
  if (!session) return null;
  
  // Try to get from Supabase first
  try {
    const { getDrivers } = await import('./supabase/database');
    const allDrivers = await getDrivers();
    if (allDrivers.length > 0) {
      const driver = allDrivers.find(d => d.id === session.driverId);
      if (driver) {
        // Check if driver is still active
        if (!driver.isActive) {
          // Clear session if driver is inactive
          clearDriverSession();
          return null;
        }
        return driver;
      }
    }
  } catch (error) {
    // Supabase not configured or error - will fall back to mock data
    console.log('Supabase lookup failed, using mock data:', error);
  }
  
  // Fallback to mock data
  const { drivers: mockDrivers } = await import('./data');
  const driver = mockDrivers.find(d => d.id === session.driverId) || null;
  if (driver && !driver.isActive) {
    clearDriverSession();
    return null;
  }
  return driver;
}

