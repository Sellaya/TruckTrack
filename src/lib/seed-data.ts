import type { Unit, Driver, Trip, Transaction, Location } from './types';
import { createUnit, createDriver, createTrip, createTransaction } from './supabase/database';

// Helper to generate dates
const now = new Date();
const getDate = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
const getFutureDate = (daysAhead: number) => new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

// Comprehensive dummy data for Units
export const seedUnits: Omit<Unit, 'id'>[] = [
  {
    name: 'Freightliner Cascadia 125',
    licensePlate: 'CA-12345',
    purchaseDate: '2022-01-15T00:00:00Z',
    staticCost: 1850.00,
    coveredMiles: 285000,
  },
  {
    name: 'Kenworth T680',
    licensePlate: 'CA-67890',
    purchaseDate: '2023-03-20T00:00:00Z',
    staticCost: 1950.00,
    coveredMiles: 125000,
  },
  {
    name: 'Peterbilt 579',
    licensePlate: 'CA-11111',
    purchaseDate: '2023-06-10T00:00:00Z',
    staticCost: 1920.00,
    coveredMiles: 95000,
  },
  {
    name: 'Volvo VNL 860',
    licensePlate: 'CA-22222',
    purchaseDate: '2024-01-05T00:00:00Z',
    staticCost: 1880.00,
    coveredMiles: 45000,
  },
  {
    name: 'International LT Series',
    licensePlate: 'CA-33333',
    purchaseDate: '2024-05-12T00:00:00Z',
    staticCost: 1750.00,
    coveredMiles: 25000,
  },
  {
    name: 'Mack Anthem',
    licensePlate: 'CA-44444',
    purchaseDate: '2024-08-18T00:00:00Z',
    staticCost: 1800.00,
    coveredMiles: 12000,
  },
];

// Comprehensive dummy data for Drivers
export const seedDrivers: Omit<Driver, 'id' | 'createdAt'>[] = [
  {
    name: 'John Michael Smith',
    email: 'john.smith@truckops.com',
    password: 'Driver@123',
    phone: '+1-416-555-0101',
    licenseNumber: 'DL-CA-1234567',
    isActive: true,
  },
  {
    name: 'Jane Elizabeth Doe',
    email: 'jane.doe@truckops.com',
    password: 'Driver@456',
    phone: '+1-416-555-0102',
    licenseNumber: 'DL-CA-2345678',
    isActive: true,
  },
  {
    name: 'Michael Robert Johnson',
    email: 'mike.johnson@truckops.com',
    password: 'Driver@789',
    phone: '+1-647-555-0103',
    licenseNumber: 'DL-ON-3456789',
    isActive: true,
  },
  {
    name: 'Sarah Anne Williams',
    email: 'sarah.williams@truckops.com',
    password: 'Driver@321',
    phone: '+1-416-555-0104',
    licenseNumber: 'DL-ON-4567890',
    isActive: true,
  },
  {
    name: 'David Christopher Brown',
    email: 'david.brown@truckops.com',
    password: 'Driver@654',
    phone: '+1-905-555-0105',
    licenseNumber: 'DL-ON-5678901',
    isActive: true,
  },
  {
    name: 'Emily Grace Martinez',
    email: 'emily.martinez@truckops.com',
    password: 'Driver@987',
    phone: '+1-416-555-0106',
    licenseNumber: 'DL-ON-6789012',
    isActive: false, // Inactive driver for testing
  },
  {
    name: 'Robert James Taylor',
    email: 'robert.taylor@truckops.com',
    password: 'Driver@147',
    phone: '+1-647-555-0107',
    licenseNumber: 'DL-ON-7890123',
    isActive: true,
  },
];

// Helper function to create trips for each driver
export function createSeedTrips(unitIds: string[], driverIds: string[]): Omit<Trip, 'id'>[] {
  const trips: Omit<Trip, 'id'>[] = [];
  
  // Driver 0 (John Smith) - Multiple trips with various statuses
  trips.push(
    // Completed trips
    {
      name: 'Los Angeles to New York Express',
      startDate: getDate(60),
      endDate: getDate(55),
      origin: 'Los Angeles, California, US',
      destination: 'New York, New York, US',
      originLocation: { city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.0522, longitude: -118.2437 },
      destinationLocation: { city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
      distance: 2790,
      unitId: unitIds[0],
      driverId: driverIds[0],
      status: 'completed',
      cargoDetails: 'Consumer Electronics - Fragile Items, Handle with Extreme Care',
      notes: 'Time-sensitive delivery. Customer requested early morning drop-off.',
    },
    {
      name: 'Chicago to Miami Freight',
      startDate: getDate(45),
      endDate: getDate(40),
      origin: 'Chicago, Illinois, US',
      destination: 'Miami, Florida, US',
      originLocation: { city: 'Chicago', state: 'IL', country: 'USA', latitude: 41.8781, longitude: -87.6298 },
      destinationLocation: { city: 'Miami', state: 'FL', country: 'USA', latitude: 25.7617, longitude: -80.1918 },
      distance: 1380,
      unitId: unitIds[0],
      driverId: driverIds[0],
      status: 'completed',
      cargoDetails: 'Furniture and Home Goods - Requires special handling',
      notes: 'Multiple delivery stops in Miami area.',
    },
    {
      name: 'Toronto to Montreal Food Products',
      startDate: getDate(30),
      endDate: getDate(27),
      origin: 'Toronto, Ontario, CA',
      destination: 'Montreal, Quebec, CA',
      originLocation: { city: 'Toronto', state: 'ON', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
      destinationLocation: { city: 'Montreal', state: 'QC', country: 'Canada', latitude: 45.5017, longitude: -73.5673 },
      distance: 335,
      unitId: unitIds[1],
      driverId: driverIds[0],
      status: 'completed',
      cargoDetails: 'Refrigerated Food Products - Maintain temperature at 2-4°C',
      notes: 'Priority shipment for grocery chain.',
    },
    {
      name: 'Calgary to Vancouver Lumber',
      startDate: getDate(20),
      endDate: getDate(17),
      origin: 'Calgary, Alberta, CA',
      destination: 'Vancouver, British Columbia, CA',
      originLocation: { city: 'Calgary', state: 'AB', country: 'Canada', latitude: 51.0447, longitude: -114.0719 },
      destinationLocation: { city: 'Vancouver', state: 'BC', country: 'Canada', latitude: 49.2827, longitude: -123.1207 },
      distance: 675,
      unitId: unitIds[0],
      driverId: driverIds[0],
      status: 'completed',
      cargoDetails: 'Construction Lumber - Various grades',
      notes: 'Direct delivery to construction site.',
    },
    // Ongoing trip
    {
      name: 'Vancouver to Seattle Automotive Parts',
      startDate: getDate(2),
      endDate: getFutureDate(2),
      origin: 'Vancouver, British Columbia, CA',
      destination: 'Seattle, Washington, US',
      originLocation: { city: 'Vancouver', state: 'BC', country: 'Canada', latitude: 49.2827, longitude: -123.1207 },
      destinationLocation: { city: 'Seattle', state: 'WA', country: 'USA', latitude: 47.6062, longitude: -122.3321 },
      distance: 142,
      unitId: unitIds[0],
      driverId: driverIds[0],
      status: 'ongoing',
      cargoDetails: 'Automotive Parts - OEM Components',
      notes: 'Currently in transit. Expected border crossing at Blaine.',
    },
    // Upcoming trips
    {
      name: 'Dallas to Houston Construction Materials',
      startDate: getFutureDate(5),
      endDate: getFutureDate(7),
      origin: 'Dallas, Texas, US',
      destination: 'Houston, Texas, US',
      originLocation: { city: 'Dallas', state: 'TX', country: 'USA', latitude: 32.7767, longitude: -96.7970 },
      destinationLocation: { city: 'Houston', state: 'TX', country: 'USA', latitude: 29.7604, longitude: -95.3698 },
      distance: 239,
      unitId: unitIds[0],
      driverId: driverIds[0],
      status: 'upcoming',
      cargoDetails: 'Steel Beams and Construction Materials',
      notes: 'Pre-loading inspection required. Heavy load permit obtained.',
    },
    {
      name: 'Phoenix to Las Vegas Electronics',
      startDate: getFutureDate(12),
      endDate: getFutureDate(14),
      origin: 'Phoenix, Arizona, US',
      destination: 'Las Vegas, Nevada, US',
      originLocation: { city: 'Phoenix', state: 'AZ', country: 'USA', latitude: 33.4484, longitude: -112.0740 },
      destinationLocation: { city: 'Las Vegas', state: 'NV', country: 'USA', latitude: 36.1699, longitude: -115.1398 },
      distance: 300,
      unitId: unitIds[1],
      driverId: driverIds[0],
      status: 'upcoming',
      cargoDetails: 'Consumer Electronics - High-Value Items',
      notes: 'Security escort may be required. Contact dispatch for details.',
    },
  );

  // Driver 1 (Jane Doe) - Mixed trips
  trips.push(
    {
      name: 'Boston to Philadelphia Medical Supplies',
      startDate: getDate(35),
      endDate: getDate(32),
      origin: 'Boston, Massachusetts, US',
      destination: 'Philadelphia, Pennsylvania, US',
      originLocation: { city: 'Boston', state: 'MA', country: 'USA', latitude: 42.3601, longitude: -71.0589 },
      destinationLocation: { city: 'Philadelphia', state: 'PA', country: 'USA', latitude: 39.9526, longitude: -75.1652 },
      distance: 310,
      unitId: unitIds[2],
      driverId: driverIds[1],
      status: 'completed',
      cargoDetails: 'Medical Equipment and Pharmaceuticals',
      notes: 'Temperature-controlled shipment. Priority delivery.',
    },
    {
      name: 'Windsor to Detroit Auto Parts',
      startDate: getDate(10),
      endDate: getDate(8),
      origin: 'Windsor, Ontario, CA',
      destination: 'Detroit, Michigan, US',
      originLocation: { city: 'Windsor', state: 'ON', country: 'Canada', latitude: 42.3149, longitude: -83.0364 },
      destinationLocation: { city: 'Detroit', state: 'MI', country: 'USA', latitude: 42.3314, longitude: -83.0458 },
      distance: 5,
      unitId: unitIds[2],
      driverId: driverIds[1],
      status: 'completed',
      cargoDetails: 'Automotive Manufacturing Parts',
      notes: 'Just-in-time delivery for production line.',
    },
    {
      name: 'Denver to Salt Lake City Retail Goods',
      startDate: getFutureDate(8),
      endDate: getFutureDate(10),
      origin: 'Denver, Colorado, US',
      destination: 'Salt Lake City, Utah, US',
      originLocation: { city: 'Denver', state: 'CO', country: 'USA', latitude: 39.7392, longitude: -104.9903 },
      destinationLocation: { city: 'Salt Lake City', state: 'UT', country: 'USA', latitude: 40.7608, longitude: -111.8910 },
      distance: 520,
      unitId: unitIds[2],
      driverId: driverIds[1],
      status: 'upcoming',
      cargoDetails: 'Retail Store Merchandise',
      notes: 'Multiple drop-off locations in SLC area.',
    },
    {
      name: 'Edmonton to Winnipeg Grain',
      startDate: getDate(3),
      endDate: getFutureDate(3),
      origin: 'Edmonton, Alberta, CA',
      destination: 'Winnipeg, Manitoba, CA',
      originLocation: { city: 'Edmonton', state: 'AB', country: 'Canada', latitude: 53.5461, longitude: -113.4938 },
      destinationLocation: { city: 'Winnipeg', state: 'MB', country: 'Canada', latitude: 49.8951, longitude: -97.1384 },
      distance: 825,
      unitId: unitIds[3],
      driverId: driverIds[1],
      status: 'ongoing',
      cargoDetails: 'Agricultural Grain Products',
      notes: 'Heavy load. Weather conditions monitored.',
    },
  );

  // Driver 2 (Mike Johnson) - Various trips
  trips.push(
    {
      name: 'Ottawa to Quebec City Government Supplies',
      startDate: getDate(25),
      endDate: getDate(23),
      origin: 'Ottawa, Ontario, CA',
      destination: 'Quebec City, Quebec, CA',
      originLocation: { city: 'Ottawa', state: 'ON', country: 'Canada', latitude: 45.4215, longitude: -75.6972 },
      destinationLocation: { city: 'Quebec City', state: 'QC', country: 'Canada', latitude: 46.8139, longitude: -71.2080 },
      distance: 449,
      unitId: unitIds[3],
      driverId: driverIds[2],
      status: 'completed',
      cargoDetails: 'Government Office Supplies',
      notes: 'Secure delivery location. ID required for access.',
    },
    {
      name: 'San Francisco to Portland Tech Equipment',
      startDate: getFutureDate(15),
      endDate: getFutureDate(18),
      origin: 'San Francisco, California, US',
      destination: 'Portland, Oregon, US',
      originLocation: { city: 'San Francisco', state: 'CA', country: 'USA', latitude: 37.7749, longitude: -122.4194 },
      destinationLocation: { city: 'Portland', state: 'OR', country: 'USA', latitude: 45.5152, longitude: -122.6784 },
      distance: 635,
      unitId: unitIds[4],
      driverId: driverIds[2],
      status: 'upcoming',
      cargoDetails: 'IT Equipment and Servers',
      notes: 'High-value cargo insurance required.',
    },
  );

  // Driver 3 (Sarah Williams)
  trips.push(
    {
      name: 'Minneapolis to Chicago Food Distribution',
      startDate: getDate(18),
      endDate: getDate(15),
      origin: 'Minneapolis, Minnesota, US',
      destination: 'Chicago, Illinois, US',
      originLocation: { city: 'Minneapolis', state: 'MN', country: 'USA', latitude: 44.9778, longitude: -93.2650 },
      destinationLocation: { city: 'Chicago', state: 'IL', country: 'USA', latitude: 41.8781, longitude: -87.6298 },
      distance: 408,
      unitId: unitIds[4],
      driverId: driverIds[3],
      status: 'completed',
      cargoDetails: 'Frozen Food Products - Maintain -18°C',
      notes: 'Refrigerated unit checked and certified.',
    },
  );

  // Driver 4 (David Brown)
  trips.push(
    {
      name: 'Halifax to St. John\'s Maritime Freight',
      startDate: getDate(12),
      endDate: getDate(10),
      origin: 'Halifax, Nova Scotia, CA',
      destination: 'St. John\'s, Newfoundland, CA',
      originLocation: { city: 'Halifax', state: 'NS', country: 'Canada', latitude: 44.6488, longitude: -63.5752 },
      destinationLocation: { city: 'St. John\'s', state: 'NL', country: 'Canada', latitude: 47.5615, longitude: -52.7126 },
      distance: 1085,
      unitId: unitIds[5],
      driverId: driverIds[4],
      status: 'completed',
      cargoDetails: 'General Merchandise',
      notes: 'Ferry crossing required. Booked ferry reservation.',
    },
    {
      name: 'Toronto to New York Express Delivery',
      startDate: getDate(1),
      endDate: getFutureDate(2),
      origin: 'Toronto, Ontario, CA',
      destination: 'New York, New York, US',
      originLocation: { city: 'Toronto', state: 'ON', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
      destinationLocation: { city: 'New York', state: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
      distance: 543,
      unitId: unitIds[5],
      driverId: driverIds[4],
      status: 'ongoing',
      cargoDetails: 'Express Package Delivery',
      notes: 'Time-critical shipment. Tracking enabled.',
    },
  );

  return trips;
}

// Helper function to create transactions (expenses) for trips
export function createSeedTransactions(
  tripIds: string[],
  driverIds: string[],
  unitIds: string[]
): Omit<Transaction, 'id'>[] {
  const transactions: Omit<Transaction, 'id'>[] = [];
  
  // Expense categories for variety
  const fuelVendors = ['Petro-Canada', 'Shell', 'Esso', 'Husky', 'TA Truck Stop', 'Love\'s Travel Stop'];
  const mealVendors = ['Tim Hortons', 'McDonald\'s', 'Subway', 'Wendy\'s', 'A&W', 'Burger King'];
  const maintenanceVendors = ['Canadian Tire', 'Fleet Maintenance', 'Tire Shop', 'Auto Service Plus'];
  const lodgingVendors = ['Holiday Inn Express', 'Days Inn', 'Super 8', 'Best Western', 'Comfort Inn'];
  
  // Trip 0 (John's LA to NY) - Mixed CAD/USD expenses
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Petro-Canada - Buffalo, NY', amount: 425.50, originalCurrency: 'USD', date: getDate(58), tripId: tripIds[0], driverId: driverIds[0], vendorName: 'Petro-Canada', notes: 'Full tank refill before long haul' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Shell - Cleveland, OH', amount: 385.75, originalCurrency: 'USD', date: getDate(57), tripId: tripIds[0], driverId: driverIds[0], vendorName: 'Shell', notes: 'Mid-trip refuel' },
    { type: 'expense', category: 'Tolls', description: 'Highway tolls - Pennsylvania Turnpike', amount: 85.00, originalCurrency: 'USD', date: getDate(56), tripId: tripIds[0], driverId: driverIds[0], notes: 'Multiple toll booths' },
    { type: 'expense', category: 'Tolls', description: 'Highway tolls - New York State Thruway', amount: 45.50, originalCurrency: 'USD', date: getDate(56), tripId: tripIds[0], driverId: driverIds[0], notes: 'Final leg tolls' },
    { type: 'expense', category: 'Food', description: 'Meals during trip - McDonald\'s', amount: 42.85, originalCurrency: 'USD', date: getDate(57), tripId: tripIds[0], driverId: driverIds[0], vendorName: 'McDonald\'s', notes: 'Breakfast and lunch' },
    { type: 'expense', category: 'Food', description: 'Meals during trip - Subway', amount: 28.50, originalCurrency: 'USD', date: getDate(58), tripId: tripIds[0], driverId: driverIds[0], vendorName: 'Subway', notes: 'Dinner and snacks' },
    { type: 'expense', category: 'Lodging', description: 'Hotel stay - Holiday Inn Express, Scranton', amount: 125.99, originalCurrency: 'USD', date: getDate(57), tripId: tripIds[0], driverId: driverIds[0], vendorName: 'Holiday Inn Express', notes: 'Overnight rest stop' },
    { type: 'expense', category: 'Maintenance', description: 'Tire pressure check and adjustment', amount: 25.00, originalCurrency: 'USD', date: getDate(59), tripId: tripIds[0], driverId: driverIds[0], notes: 'Routine check' },
    { type: 'expense', category: 'Parking', description: 'Truck parking fee - Rest area', amount: 15.00, originalCurrency: 'USD', date: getDate(57), tripId: tripIds[0], driverId: driverIds[0], notes: '2-hour rest break' },
  );

  // Trip 1 (John's Chicago to Miami) - USD expenses
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Love\'s Travel Stop', amount: 380.25, originalCurrency: 'USD', date: getDate(43), tripId: tripIds[1], driverId: driverIds[0], vendorName: 'Love\'s Travel Stop', notes: 'Full tank' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at TA Truck Stop', amount: 340.00, originalCurrency: 'USD', date: getDate(41), tripId: tripIds[1], driverId: driverIds[0], vendorName: 'TA Truck Stop', notes: 'Final refuel before destination' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 55.75, originalCurrency: 'USD', date: getDate(42), tripId: tripIds[1], driverId: driverIds[0], vendorName: 'Wendy\'s', notes: 'All meals for day' },
    { type: 'expense', category: 'Lodging', description: 'Hotel stay - Days Inn, Nashville', amount: 89.99, originalCurrency: 'USD', date: getDate(42), tripId: tripIds[1], driverId: driverIds[0], vendorName: 'Days Inn', notes: 'Overnight stay' },
  );

  // Trip 2 (John's Toronto to Montreal) - CAD expenses
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Petro-Canada - Toronto', amount: 275.50, originalCurrency: 'CAD', date: getDate(29), tripId: tripIds[2], driverId: driverIds[0], vendorName: 'Petro-Canada', notes: 'Departure fuel' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Esso - Montreal', amount: 195.25, originalCurrency: 'CAD', date: getDate(27), tripId: tripIds[2], driverId: driverIds[0], vendorName: 'Esso', notes: 'Arrival fuel top-up' },
    { type: 'expense', category: 'Food', description: 'Meals during trip - Tim Hortons', amount: 32.45, originalCurrency: 'CAD', date: getDate(28), tripId: tripIds[2], driverId: driverIds[0], vendorName: 'Tim Hortons', notes: 'Coffee and breakfast' },
    { type: 'expense', category: 'Parking', description: 'Truck parking fee', amount: 18.00, originalCurrency: 'CAD', date: getDate(28), tripId: tripIds[2], driverId: driverIds[0], notes: 'Rest stop parking' },
  );

  // Trip 3 (John's Calgary to Vancouver) - Mixed CAD/USD
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Husky - Calgary', amount: 485.75, originalCurrency: 'CAD', date: getDate(19), tripId: tripIds[3], driverId: driverIds[0], vendorName: 'Husky', notes: 'Full tank start' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Shell - Kamloops', amount: 420.50, originalCurrency: 'CAD', date: getDate(18), tripId: tripIds[3], driverId: driverIds[0], vendorName: 'Shell', notes: 'Mid-journey refuel' },
    { type: 'expense', category: 'Tolls', description: 'Highway tolls - Coquihalla Highway', amount: 45.00, originalCurrency: 'CAD', date: getDate(18), tripId: tripIds[3], driverId: driverIds[0], notes: 'Mountain highway tolls' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 58.90, originalCurrency: 'CAD', date: getDate(18), tripId: tripIds[3], driverId: driverIds[0], vendorName: 'A&W', notes: 'Lunch and dinner' },
    { type: 'expense', category: 'Maintenance', description: 'Oil change and inspection', amount: 185.00, originalCurrency: 'CAD', date: getDate(17), tripId: tripIds[3], driverId: driverIds[0], vendorName: 'Fleet Maintenance', notes: 'Scheduled maintenance' },
  );

  // Trip 4 (John's Vancouver to Seattle - Ongoing) - Mixed CAD/USD
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Petro-Canada - Vancouver', amount: 125.50, originalCurrency: 'CAD', date: getDate(1), tripId: tripIds[4], driverId: driverIds[0], vendorName: 'Petro-Canada', notes: 'Pre-border fuel' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Shell - Seattle', amount: 98.75, originalCurrency: 'USD', date: getDate(0), tripId: tripIds[4], driverId: driverIds[0], vendorName: 'Shell', notes: 'Post-border refuel' },
    { type: 'expense', category: 'Tolls', description: 'Border crossing fee', amount: 25.00, originalCurrency: 'USD', date: getDate(0), tripId: tripIds[4], driverId: driverIds[0], notes: 'US border processing fee' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 22.50, originalCurrency: 'USD', date: getDate(0), tripId: tripIds[4], driverId: driverIds[0], vendorName: 'Subway', notes: 'Lunch' },
  );

  // Trip 5 (Jane's Boston to Philadelphia) - USD expenses
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at TA Truck Stop', amount: 285.00, originalCurrency: 'USD', date: getDate(33), tripId: tripIds[7], driverId: driverIds[1], vendorName: 'TA Truck Stop', notes: 'Full tank' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 38.50, originalCurrency: 'USD', date: getDate(33), tripId: tripIds[7], driverId: driverIds[1], vendorName: 'Burger King', notes: 'All meals' },
  );

  // Trip 6 (Jane's Windsor to Detroit) - CAD expenses
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Esso - Windsor', amount: 35.00, originalCurrency: 'CAD', date: getDate(9), tripId: tripIds[8], driverId: driverIds[1], vendorName: 'Esso', notes: 'Short trip fuel' },
    { type: 'expense', category: 'Tolls', description: 'Ambassador Bridge toll', amount: 12.50, originalCurrency: 'CAD', date: getDate(8), tripId: tripIds[8], driverId: driverIds[1], notes: 'Bridge crossing' },
  );

  // Trip 7 (Jane's Edmonton to Winnipeg - Ongoing) - CAD expenses
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Husky - Edmonton', amount: 520.25, originalCurrency: 'CAD', date: getDate(2), tripId: tripIds[9], driverId: driverIds[1], vendorName: 'Husky', notes: 'Departure fuel' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Petro-Canada - Saskatoon', amount: 485.50, originalCurrency: 'CAD', date: getDate(1), tripId: tripIds[9], driverId: driverIds[1], vendorName: 'Petro-Canada', notes: 'Mid-journey refuel' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 65.75, originalCurrency: 'CAD', date: getDate(2), tripId: tripIds[9], driverId: driverIds[1], vendorName: 'Tim Hortons', notes: 'Meals for day' },
    { type: 'expense', category: 'Lodging', description: 'Hotel stay - Super 8, Saskatoon', amount: 95.99, originalCurrency: 'CAD', date: getDate(1), tripId: tripIds[9], driverId: driverIds[1], vendorName: 'Super 8', notes: 'Overnight stay' },
  );

  // Trip 8 (Mike's Ottawa to Quebec City) - CAD expenses (trip index 11)
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Shell - Ottawa', amount: 385.25, originalCurrency: 'CAD', date: getDate(24), tripId: tripIds[11], driverId: driverIds[2], vendorName: 'Shell', notes: 'Full tank' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Esso - Montreal', amount: 185.50, originalCurrency: 'CAD', date: getDate(23), tripId: tripIds[11], driverId: driverIds[2], vendorName: 'Esso', notes: 'Final refuel' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 42.30, originalCurrency: 'CAD', date: getDate(24), tripId: tripIds[11], driverId: driverIds[2], vendorName: 'Tim Hortons', notes: 'All meals' },
  );

  // Trip 9 (Sarah's Minneapolis to Chicago) - USD expenses (trip index 13)
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Love\'s Travel Stop', amount: 320.00, originalCurrency: 'USD', date: getDate(16), tripId: tripIds[13], driverId: driverIds[3], vendorName: 'Love\'s Travel Stop', notes: 'Full tank' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 35.85, originalCurrency: 'USD', date: getDate(16), tripId: tripIds[13], driverId: driverIds[3], vendorName: 'McDonald\'s', notes: 'All meals' },
    { type: 'expense', category: 'Maintenance', description: 'Refrigerated unit service', amount: 250.00, originalCurrency: 'USD', date: getDate(17), tripId: tripIds[13], driverId: driverIds[3], vendorName: 'Fleet Maintenance', notes: 'Temperature unit check' },
  );

  // Trip 10 (David's Halifax to St. John's) - CAD expenses (trip index 14)
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Petro-Canada - Halifax', amount: 580.50, originalCurrency: 'CAD', date: getDate(11), tripId: tripIds[14], driverId: driverIds[4], vendorName: 'Petro-Canada', notes: 'Full tank' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Esso - Moncton', amount: 495.75, originalCurrency: 'CAD', date: getDate(10), tripId: tripIds[14], driverId: driverIds[4], vendorName: 'Esso', notes: 'Mid-journey refuel' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 75.90, originalCurrency: 'CAD', date: getDate(11), tripId: tripIds[14], driverId: driverIds[4], vendorName: 'A&W', notes: 'Multi-day meals' },
    { type: 'expense', category: 'Lodging', description: 'Hotel stay - Best Western, Moncton', amount: 115.99, originalCurrency: 'CAD', date: getDate(10), tripId: tripIds[14], driverId: driverIds[4], vendorName: 'Best Western', notes: 'Overnight stay' },
    { type: 'expense', category: 'Other', description: 'Ferry crossing fee - North Sydney to Port aux Basques', amount: 450.00, originalCurrency: 'CAD', date: getDate(10), tripId: tripIds[14], driverId: driverIds[4], notes: 'Marine Atlantic ferry reservation' },
  );

  // Trip 11 (David's Toronto to New York - Ongoing) - Mixed CAD/USD (trip index 15)
  transactions.push(
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Petro-Canada - Toronto', amount: 425.50, originalCurrency: 'CAD', date: getDate(0), tripId: tripIds[15], driverId: driverIds[4], vendorName: 'Petro-Canada', notes: 'Departure fuel' },
    { type: 'expense', category: 'Fuel', description: 'Diesel refill at Shell - Buffalo', amount: 285.75, originalCurrency: 'USD', date: getDate(-1), tripId: tripIds[15], driverId: driverIds[4], vendorName: 'Shell', notes: 'Post-border refuel' },
    { type: 'expense', category: 'Tolls', description: 'Highway tolls - QEW and I-90', amount: 65.00, originalCurrency: 'USD', date: getDate(-1), tripId: tripIds[15], driverId: driverIds[4], notes: 'Multiple toll roads' },
    { type: 'expense', category: 'Food', description: 'Meals during trip', amount: 32.50, originalCurrency: 'USD', date: getDate(-1), tripId: tripIds[15], driverId: driverIds[4], vendorName: 'Subway', notes: 'Lunch' },
  );

  // Income transactions for completed trips
  transactions.push(
    { type: 'income', category: 'Delivery', description: 'Cross-country freight payment - LA to NYC', amount: 8500.00, originalCurrency: 'USD', date: getDate(55), tripId: tripIds[0], driverId: driverIds[0], notes: 'Full payment received' },
    { type: 'income', category: 'Delivery', description: 'Regional transport payment - Chicago to Miami', amount: 5200.00, originalCurrency: 'USD', date: getDate(40), tripId: tripIds[1], driverId: driverIds[0], notes: 'Payment processed' },
    { type: 'income', category: 'Delivery', description: 'Intercity freight payment - Toronto to Montreal', amount: 2850.00, originalCurrency: 'CAD', date: getDate(27), tripId: tripIds[2], driverId: driverIds[0], notes: 'Payment received' },
    { type: 'income', category: 'Delivery', description: 'Lumber transport payment - Calgary to Vancouver', amount: 4200.00, originalCurrency: 'CAD', date: getDate(17), tripId: tripIds[3], driverId: driverIds[0], notes: 'Payment confirmed' },
    { type: 'income', category: 'Delivery', description: 'Medical supplies payment - Boston to Philadelphia', amount: 3800.00, originalCurrency: 'USD', date: getDate(32), tripId: tripIds[7], driverId: driverIds[1], notes: 'Payment received' },
    { type: 'income', category: 'Delivery', description: 'Auto parts payment - Windsor to Detroit', amount: 950.00, originalCurrency: 'CAD', date: getDate(8), tripId: tripIds[8], driverId: driverIds[1], notes: 'Payment processed' },
    { type: 'income', category: 'Delivery', description: 'Government supplies payment - Ottawa to Quebec City', amount: 3200.00, originalCurrency: 'CAD', date: getDate(23), tripId: tripIds[11], driverId: driverIds[2], notes: 'Payment received' },
    { type: 'income', category: 'Delivery', description: 'Food distribution payment - Minneapolis to Chicago', amount: 2800.00, originalCurrency: 'USD', date: getDate(15), tripId: tripIds[13], driverId: driverIds[3], notes: 'Payment processed' },
    { type: 'income', category: 'Delivery', description: 'Maritime freight payment - Halifax to St. John\'s', amount: 6500.00, originalCurrency: 'CAD', date: getDate(10), tripId: tripIds[14], driverId: driverIds[4], notes: 'Payment received' },
  );

  return transactions;
}

// Main seed function
export async function seedDatabase(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    console.log('🌱 Starting database seed...');
    const results: any = { units: [], drivers: [], trips: [], transactions: [] };
    const errors: string[] = [];

    // 1. Seed Units
    console.log('📦 Seeding units...');
    for (const unit of seedUnits) {
      try {
        const created = await createUnit(unit);
        if (created) {
          results.units.push(created);
          console.log(`  ✅ Created unit: ${created.name} (${created.id})`);
        } else {
          errors.push(`Failed to create unit: ${unit.name}`);
        }
      } catch (error: any) {
        const errorMsg = `Error creating unit ${unit.name}: ${error.message || error}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    // 2. Seed Drivers
    console.log('👤 Seeding drivers...');
    const unitIds = results.units.map((u: Unit) => u.id);
    for (const driver of seedDrivers) {
      try {
        const created = await createDriver(driver);
        if (created) {
          results.drivers.push(created);
          console.log(`  ✅ Created driver: ${created.name} (${created.id})`);
        } else {
          errors.push(`Failed to create driver: ${driver.name}`);
        }
      } catch (error: any) {
        const errorMsg = `Error creating driver ${driver.name}: ${error.message || error}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    // 3. Seed Trips (requires units and drivers)
    console.log('🚛 Seeding trips...');
    const driverIds = results.drivers.map((d: Driver) => d.id);
    const seedTripData = createSeedTrips(unitIds, driverIds);
    
    for (const trip of seedTripData) {
      try {
        const created = await createTrip(trip);
        if (created) {
          results.trips.push(created);
          console.log(`  ✅ Created trip: ${created.name} (${created.id})`);
        } else {
          errors.push(`Failed to create trip: ${trip.name}`);
        }
      } catch (error: any) {
        const errorMsg = `Error creating trip ${trip.name}: ${error.message || error}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    // 4. Seed Transactions (requires trips and drivers)
    console.log('💰 Seeding transactions...');
    const tripIds = results.trips.map((t: Trip) => t.id);
    const seedTransactionData = createSeedTransactions(tripIds, driverIds, unitIds);
    
    for (const transaction of seedTransactionData) {
      try {
        const created = await createTransaction(transaction);
        if (created) {
          results.transactions.push(created);
          console.log(`  ✅ Created transaction: ${transaction.type} - ${transaction.description.substring(0, 30)}...`);
        } else {
          errors.push(`Failed to create transaction: ${transaction.description}`);
        }
      } catch (error: any) {
        const errorMsg = `Error creating transaction ${transaction.description}: ${error.message || error}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    const summary = {
      units: results.units.length,
      drivers: results.drivers.length,
      trips: results.trips.length,
      transactions: results.transactions.length,
      errors: errors.length,
    };

    console.log('✅ Database seed completed!');
    console.log('Summary:', summary);

    if (errors.length > 0) {
      return {
        success: false,
        message: `Seed completed with ${errors.length} error(s). Created: ${summary.units} units, ${summary.drivers} drivers, ${summary.trips} trips, ${summary.transactions} transactions.`,
        data: { ...summary, errors },
      };
    }

    return {
      success: true,
      message: `Successfully seeded database! Created: ${summary.units} units, ${summary.drivers} drivers, ${summary.trips} trips, ${summary.transactions} transactions.`,
      data: summary,
    };
  } catch (error: any) {
    console.error('❌ Fatal error during seed:', error);
    return {
      success: false,
      message: `Fatal error: ${error.message || error}`,
      data: { error: error.toString() },
    };
  }
}

