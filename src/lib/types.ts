export type Currency = 'USD' | 'CAD';

export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number; // Amount in original currency
  originalCurrency: Currency; // Currency in which the transaction was made
  date: string; // ISO string
  unitId?: string; // Truck/Unit associated with this expense
  tripId?: string; // Trip associated with this expense (optional)
  driverId?: string; // Driver who added this expense
  vendorName?: string; // Vendor name (e.g., Petro-Canada, TA, Loves)
  notes?: string; // Optional notes
  receiptUrl?: string; // URL to uploaded receipt image
};

export type Unit = {
  id: string;
  name: string;
  licensePlate: string;
  purchaseDate: string; // ISO string
  staticCost: number;
  coveredMiles: number;
};

export type Location = {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

export type Trip = {
  id:string;
  name: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  origin: string; // Display string (e.g., "Los Angeles, CA")
  destination: string; // Display string (e.g., "New York, NY")
  originLocation?: Location; // Detailed location data
  destinationLocation?: Location; // Detailed location data
  distance: number; // in miles
  cargoDetails?: string;
  notes?: string;
  unitId?: string;
  driverId?: string; // Assigned driver
  status?: 'upcoming' | 'ongoing' | 'completed'; // Trip status
};

export type Driver = {
  id: string;
  name: string;
  email: string;
  password: string; // In production, this should be hashed
  phone?: string;
  licenseNumber?: string;
  createdAt: string; // ISO string
  isActive: boolean;
};
