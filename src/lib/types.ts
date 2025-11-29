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
  whatsappPhone?: string; // WhatsApp phone number for receiving receipt images
};

// Extracted receipt data from OCR processing
export type ExtractedReceiptData = {
  amount?: number;
  vendor?: string;
  date?: string; // ISO string
  category?: string;
  location?: string;
  currency?: Currency;
};

// WhatsApp message database row format (snake_case)
export interface WhatsAppMessageRow {
  id: string;
  phone_number: string;
  driver_id: string | null;
  message_type: 'image' | 'text';
  image_url: string | null;
  raw_ocr_text: string | null;
  extracted_data: ExtractedReceiptData | null;
  processed: boolean;
  trip_id: string | null;
  expense_id: string | null;
  error_message: string | null;
  created_at: string; // ISO string
  processed_at: string | null; // ISO string
}

// WhatsApp message application format (camelCase)
export type WhatsAppMessage = {
  id: string;
  phoneNumber: string; // The sender's phone number
  driverId?: string; // Associated driver, matched by whatsapp_phone number
  messageType: 'image' | 'text'; // Type of message: image (receipt) or text
  imageUrl?: string; // URL to the uploaded image in Supabase Storage
  rawOcrText?: string; // Raw text extracted from OCR processing
  extractedData?: ExtractedReceiptData; // Structured JSON data: {amount, vendor, date, category, location, currency}
  processed: boolean; // Whether the message has been processed into an expense
  tripId?: string; // Associated trip if the expense was linked to a trip
  expenseId?: string; // Link to the created expense transaction if processed
  errorMessage?: string; // Error message if processing failed
  createdAt: string; // ISO string
  processedAt?: string; // ISO string
};
