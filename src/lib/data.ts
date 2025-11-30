import type { Transaction, Trip, Unit, Driver, Location } from './types';
import * as db from './supabase/database';

// Helper to generate dates relative to now
const now = new Date();
const getDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
const getFutureDate = (daysAhead: number) => new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

// Mock data as fallback (for development/testing)
const mockUnits: Unit[] = [
  {
    id: 'unit-1',
    name: 'Freightliner Cascadia',
    licensePlate: 'TRUCK-001',
    purchaseDate: '2022-01-15T00:00:00Z',
    staticCost: 1500,
    coveredMiles: 150000,
  },
  {
    id: 'unit-2',
    name: 'Kenworth T680',
    licensePlate: 'TRUCK-002',
    purchaseDate: '2023-03-20T00:00:00Z',
    staticCost: 1800,
    coveredMiles: 75000,
  },
  {
    id: 'unit-3',
    name: 'Peterbilt 579',
    licensePlate: 'TRUCK-003',
    purchaseDate: '2023-06-10T00:00:00Z',
    staticCost: 1700,
    coveredMiles: 50000,
  },
  {
    id: 'unit-4',
    name: 'Volvo VNL',
    licensePlate: 'TRUCK-004',
    purchaseDate: '2024-01-05T00:00:00Z',
    staticCost: 1600,
    coveredMiles: 25000,
  },
];

const mockDrivers: Driver[] = [
  {
    id: 'driver-1',
    name: 'John Smith',
    email: 'john.smith@trucktrack.com',
    password: 'password123',
    phone: '+1-555-0101',
    licenseNumber: 'DL-123456',
    createdAt: '2024-01-15T00:00:00Z',
    isActive: true,
  },
  {
    id: 'driver-2',
    name: 'Jane Doe',
    email: 'jane.doe@trucktrack.com',
    password: 'password123',
    phone: '+1-555-0102',
    licenseNumber: 'DL-123457',
    createdAt: '2024-02-20T00:00:00Z',
    isActive: true,
  },
  {
    id: 'driver-3',
    name: 'Mike Johnson',
    email: 'mike.johnson@trucktrack.com',
    password: 'password123',
    phone: '+1-555-0103',
    licenseNumber: 'DL-123458',
    createdAt: '2024-03-10T00:00:00Z',
    isActive: true,
  },
  {
    id: 'driver-4',
    name: 'Sarah Williams',
    email: 'sarah.williams@trucktrack.com',
    password: 'password123',
    phone: '+1-555-0104',
    licenseNumber: 'DL-123459',
    createdAt: '2024-04-05T00:00:00Z',
    isActive: true,
  },
];

const mockTrips: Trip[] = [
  // Completed trips for driver-1
  {
    id: 'trip-1',
    tripNumber: '0001',
    name: 'Los Angeles to New York',
    startDate: getDate(45),
    endDate: getDate(40),
    origin: 'Los Angeles, CA',
    destination: 'New York, NY',
    originLocation: { city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.0522, longitude: -118.2437 },
    destinationLocation: { city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
    distance: 2790,
    unitId: 'unit-1',
    driverId: 'driver-1',
    status: 'completed',
    cargoDetails: 'Consumer Electronics',
    notes: 'Fragile items, handle with care.',
  },
  {
    id: 'trip-2',
    tripNumber: '0002',
    name: 'Chicago to Miami',
    startDate: getDate(30),
    endDate: getDate(25),
    origin: 'Chicago, IL',
    destination: 'Miami, FL',
    originLocation: { city: 'Chicago', state: 'IL', country: 'USA', latitude: 41.8781, longitude: -87.6298 },
    destinationLocation: { city: 'Miami', state: 'FL', country: 'USA', latitude: 25.7617, longitude: -80.1918 },
    distance: 1380,
    unitId: 'unit-1',
    driverId: 'driver-1',
    status: 'completed',
    cargoDetails: 'Furniture',
  },
  {
    id: 'trip-3',
    tripNumber: '0003',
    name: 'Toronto to Montreal',
    startDate: getDate(15),
    endDate: getDate(12),
    origin: 'Toronto, ON',
    destination: 'Montreal, QC',
    originLocation: { city: 'Toronto', state: 'ON', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
    destinationLocation: { city: 'Montreal', state: 'QC', country: 'Canada', latitude: 45.5017, longitude: -73.5673 },
    distance: 335,
    unitId: 'unit-2',
    driverId: 'driver-1',
    status: 'completed',
    cargoDetails: 'Food Products',
  },
  // Ongoing trip for driver-1
  {
    id: 'trip-4',
    tripNumber: '0004',
    name: 'Vancouver to Seattle',
    startDate: getDate(2),
    endDate: getFutureDate(2),
    origin: 'Vancouver, BC',
    destination: 'Seattle, WA',
    originLocation: { city: 'Vancouver', state: 'BC', country: 'Canada', latitude: 49.2827, longitude: -123.1207 },
    destinationLocation: { city: 'Seattle', state: 'WA', country: 'USA', latitude: 47.6062, longitude: -122.3321 },
    distance: 142,
    unitId: 'unit-1',
    driverId: 'driver-1',
    status: 'ongoing',
    cargoDetails: 'Automotive Parts',
    notes: 'In transit',
  },
  // Upcoming trips for driver-1
  {
    id: 'trip-5',
    tripNumber: '0005',
    name: 'Dallas to Houston',
    startDate: getFutureDate(5),
    endDate: getFutureDate(7),
    origin: 'Dallas, TX',
    destination: 'Houston, TX',
    originLocation: { city: 'Dallas', state: 'TX', country: 'USA', latitude: 32.7767, longitude: -96.7970 },
    destinationLocation: { city: 'Houston', state: 'TX', country: 'USA', latitude: 29.7604, longitude: -95.3698 },
    distance: 239,
    unitId: 'unit-1',
    driverId: 'driver-1',
    status: 'upcoming',
    cargoDetails: 'Construction Materials',
  },
  {
    id: 'trip-6',
    tripNumber: '0006',
    name: 'Phoenix to Las Vegas',
    startDate: getFutureDate(12),
    endDate: getFutureDate(14),
    origin: 'Phoenix, AZ',
    destination: 'Las Vegas, NV',
    originLocation: { city: 'Phoenix', state: 'AZ', country: 'USA', latitude: 33.4484, longitude: -112.0740 },
    destinationLocation: { city: 'Las Vegas', state: 'NV', country: 'USA', latitude: 36.1699, longitude: -115.1398 },
    distance: 300,
    unitId: 'unit-2',
    driverId: 'driver-1',
    status: 'upcoming',
    cargoDetails: 'Electronics',
  },
  // Trips for driver-2
  {
    id: 'trip-7',
    tripNumber: '0007',
    name: 'Boston to Philadelphia',
    startDate: getDate(20),
    endDate: getDate(17),
    origin: 'Boston, MA',
    destination: 'Philadelphia, PA',
    originLocation: { city: 'Boston', state: 'MA', country: 'USA', latitude: 42.3601, longitude: -71.0589 },
    destinationLocation: { city: 'Philadelphia', state: 'PA', country: 'USA', latitude: 39.9526, longitude: -75.1652 },
    distance: 310,
    unitId: 'unit-3',
    driverId: 'driver-2',
    status: 'completed',
    cargoDetails: 'Medical Supplies',
  },
  {
    id: 'trip-8',
    tripNumber: '0008',
    name: 'Denver to Salt Lake City',
    startDate: getFutureDate(8),
    endDate: getFutureDate(10),
    origin: 'Denver, CO',
    destination: 'Salt Lake City, UT',
    originLocation: { city: 'Denver', state: 'CO', country: 'USA', latitude: 39.7392, longitude: -104.9903 },
    destinationLocation: { city: 'Salt Lake City', state: 'UT', country: 'USA', latitude: 40.7608, longitude: -111.8910 },
    distance: 520,
    unitId: 'unit-3',
    driverId: 'driver-2',
    status: 'upcoming',
    cargoDetails: 'Retail Goods',
  },
];

const mockTransactions: Transaction[] = [
  // Income transactions
  { id: 'inc-1', type: 'income', category: 'Delivery', description: 'Cross-country freight - LA to NYC', amount: 5500, originalCurrency: 'USD', date: getDate(40), tripId: 'trip-1', driverId: 'driver-1' },
  { id: 'inc-2', type: 'income', category: 'Delivery', description: 'Regional transport - Chicago to Miami', amount: 3200, originalCurrency: 'USD', date: getDate(25), tripId: 'trip-2', driverId: 'driver-1' },
  { id: 'inc-3', type: 'income', category: 'Delivery', description: 'Intercity freight - Toronto to Montreal', amount: 1800, originalCurrency: 'CAD', date: getDate(12), tripId: 'trip-3', driverId: 'driver-1' },
  { id: 'inc-4', type: 'income', category: 'Delivery', description: 'Express delivery - Boston to Philadelphia', amount: 2100, originalCurrency: 'USD', date: getDate(17), tripId: 'trip-7', driverId: 'driver-2' },
  
  // Expense transactions for driver-1
  { id: 'exp-1', type: 'expense', category: 'Fuel', description: 'Diesel refill - LA trip', amount: 850, originalCurrency: 'USD', date: getDate(43), tripId: 'trip-1', driverId: 'driver-1' },
  { id: 'exp-2', type: 'expense', category: 'Fuel', description: 'Diesel refill - Chicago trip', amount: 520, originalCurrency: 'USD', date: getDate(28), tripId: 'trip-2', driverId: 'driver-1' },
  { id: 'exp-3', type: 'expense', category: 'Maintenance', description: 'Tire replacement', amount: 450, originalCurrency: 'USD', date: getDate(35), tripId: 'trip-1', driverId: 'driver-1' },
  { id: 'exp-4', type: 'expense', category: 'Tolls', description: 'Highway tolls - NY route', amount: 120, originalCurrency: 'USD', date: getDate(41), tripId: 'trip-1', driverId: 'driver-1' },
  { id: 'exp-5', type: 'expense', category: 'Food', description: 'Meals during trip', amount: 85, originalCurrency: 'USD', date: getDate(42), tripId: 'trip-1', driverId: 'driver-1' },
  { id: 'exp-6', type: 'expense', category: 'Lodging', description: 'Hotel stay - overnight', amount: 120, originalCurrency: 'USD', date: getDate(41), tripId: 'trip-1', driverId: 'driver-1' },
  { id: 'exp-7', type: 'expense', category: 'Fuel', description: 'Diesel refill - Toronto trip', amount: 180, originalCurrency: 'CAD', date: getDate(13), tripId: 'trip-3', driverId: 'driver-1' },
  { id: 'exp-8', type: 'expense', category: 'Parking', description: 'Truck parking fee', amount: 25, originalCurrency: 'CAD', date: getDate(14), tripId: 'trip-3', driverId: 'driver-1' },
  { id: 'exp-9', type: 'expense', category: 'Fuel', description: 'Diesel refill - ongoing trip', amount: 200, originalCurrency: 'CAD', date: getDate(1), tripId: 'trip-4', driverId: 'driver-1' },
  
  // Expenses for driver-2
  { id: 'exp-10', type: 'expense', category: 'Fuel', description: 'Diesel refill - Boston trip', amount: 150, originalCurrency: 'USD', date: getDate(18), tripId: 'trip-7', driverId: 'driver-2' },
  { id: 'exp-11', type: 'expense', category: 'Food', description: 'Meals during trip', amount: 65, originalCurrency: 'USD', date: getDate(19), tripId: 'trip-7', driverId: 'driver-2' },
];

// Check if Supabase is configured - check if the client is actually initialized
const isSupabaseConfigured = () => {
  try {
    // Try to import and check if supabase client exists
    const { supabase } = require('./supabase/client');
    return supabase !== null;
  } catch {
    return false;
  }
};

// Export functions - Use Supabase if configured, otherwise use mock data
const USE_MOCK_DATA = false; // Set to true to force mock data, false to use Supabase when configured

export async function getUnits(): Promise<Unit[]> {
  if (USE_MOCK_DATA) {
    console.log('getUnits: Using mock data (USE_MOCK_DATA=true)');
    return mockUnits;
  }
  
  // Always try Supabase first - if it's configured, it will return data (even if empty)
  // If not configured, db.getUnits() will return empty array
  try {
    const data = await db.getUnits();
    console.log('getUnits: Fetched from Supabase:', data.length, 'units', data.map(u => ({ id: u.id, name: u.name })));
    
    // If Supabase is configured but returns empty, that's fine - return empty array
    // Don't fall back to mock data - user needs to create units in Supabase
    return data;
  } catch (error) {
    console.error('Error fetching units from Supabase:', error);
    // If there's an error and Supabase is not configured, return empty array
    // Don't fall back to mock data - this prevents using mock IDs
    console.warn('Error fetching units, returning empty array (not using mock data)');
    return [];
  }
}

export async function getTrips(): Promise<Trip[]> {
  if (!USE_MOCK_DATA && isSupabaseConfigured()) {
    try {
      const data = await db.getTrips();
      if (data.length > 0) return data;
    } catch (error) {
      // Fall through to mock data
    }
  }
  return mockTrips;
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!USE_MOCK_DATA && isSupabaseConfigured()) {
    try {
      const data = await db.getTransactions();
      if (data.length > 0) return data;
    } catch (error) {
      // Fall through to mock data
    }
  }
  return mockTransactions;
}

export async function getDrivers(): Promise<Driver[]> {
  if (USE_MOCK_DATA) {
    console.log('getDrivers: Using mock data (USE_MOCK_DATA=true)');
    return mockDrivers;
  }
  
  // Always try Supabase first - if it's configured, it will return data (even if empty)
  // If not configured, db.getDrivers() will return empty array
  try {
    const data = await db.getDrivers();
    console.log('getDrivers: Fetched from Supabase:', data.length, 'drivers', data.map(d => ({ id: d.id, name: d.name })));
    
    // If Supabase is configured but returns empty, that's fine - return empty array
    // Don't fall back to mock data - user needs to create drivers in Supabase
    return data;
  } catch (error) {
    console.error('Error fetching drivers from Supabase:', error);
    // If there's an error and Supabase is not configured, return empty array
    // Don't fall back to mock data - this prevents using mock IDs
    console.warn('Error fetching drivers, returning empty array (not using mock data)');
    return [];
  }
}

// Helper functions that also fall back to mock data
export async function getTripsByDriver(driverId: string): Promise<Trip[]> {
  if (!USE_MOCK_DATA && isSupabaseConfigured()) {
    try {
      const data = await db.getTripsByDriver(driverId);
      if (data.length > 0) return data;
    } catch (error) {
      // Fall through to mock data
    }
  }
  return mockTrips.filter(t => t.driverId === driverId);
}

export async function getTransactionsByDriver(driverId: string): Promise<Transaction[]> {
  if (!USE_MOCK_DATA && isSupabaseConfigured()) {
    try {
      const data = await db.getTransactionsByDriver(driverId);
      if (data.length > 0) return data;
    } catch (error) {
      // Fall through to mock data
    }
  }
  return mockTransactions.filter(t => t.driverId === driverId);
}

// Re-export database functions for direct use (these will use Supabase if configured)
export {
  createUnit,
  updateUnit,
  deleteUnit,
  createTrip,
  updateTrip,
  deleteTrip,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByTrip,
  getActiveDrivers,
  getDriverByEmail,
  createDriver,
  updateDriver,
  deleteDriver,
  getTripById,
} from './supabase/database';

// Legacy exports for backward compatibility (will be deprecated)
export const units = mockUnits;
export const trips = mockTrips;
export const transactions = mockTransactions;
export const drivers = mockDrivers;
