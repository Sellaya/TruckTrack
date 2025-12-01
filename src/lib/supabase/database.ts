import { supabase } from './client'
import type { Trip, Transaction, Unit, Driver, Location, RouteStop } from '../types'

// Helper function to extract all properties from an error object
function extractErrorInfo(error: unknown): Record<string, string> {
  const info: Record<string, any> = {};
  
  // Get all own property names (enumerable and non-enumerable)
  const allKeys = Object.getOwnPropertyNames(error);
  
  // Also try to get keys from prototype
  try {
    const protoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(error));
    allKeys.push(...protoKeys.filter(k => !allKeys.includes(k)));
  } catch (e) {
    // Ignore prototype errors
  }
  
  for (const key of allKeys) {
    try {
      const errorObj = error as Record<string, unknown>;
      const value = errorObj[key];
      if (value !== undefined) {
        info[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    } catch (e) {
      info[key] = '[unable to access]';
    }
  }
  
  return info;
}

// Helper function to generate unique 4-digit trip number
async function generateTripNumber(): Promise<string> {
  if (!supabase) {
    // Fallback for development/mock data
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  // Get the highest trip number
  const { data, error } = await supabase
    .from('trips')
    .select('trip_number')
    .order('trip_number', { ascending: false })
    .limit(1)
    .single()

  if (error || !data || !data.trip_number) {
    // No trips exist yet, start at 0001
    return '0001'
  }

  // Parse the highest trip number and increment
  const currentNumber = parseInt(data.trip_number, 10)
  if (isNaN(currentNumber)) {
    return '0001'
  }

  // Increment and format as 4-digit string
  const nextNumber = currentNumber + 1
  
  // If we exceed 9999, wrap around to 0001
  // (Optional: you might want to handle this differently)
  if (nextNumber > 9999) {
    // Check for gaps in numbering (unlikely but possible)
    const { data: gapData } = await supabase
      .from('trips')
      .select('trip_number')
      .order('trip_number', { ascending: true })
      .limit(1000)
    
    if (gapData) {
      // Find first gap
      for (let i = 1; i <= 9999; i++) {
        const numStr = i.toString().padStart(4, '0')
        if (!gapData.some(t => t.trip_number === numStr)) {
          return numStr
        }
      }
    }
    // If no gaps found and we exceed 9999, start over
    return '0001'
  }

  return nextNumber.toString().padStart(4, '0')
}

// Helper to convert database row to Trip
function rowToTrip(row: any): Trip {
  // Parse stops from JSONB if available
  let stops: RouteStop[] | undefined = undefined;
  if (row.stops) {
    try {
      stops = typeof row.stops === 'string' ? JSON.parse(row.stops) : row.stops;
    } catch (e) {
      // Silently handle parsing errors - stops will remain undefined
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error parsing stops:', e);
      }
    }
  }
  
  const distance = parseFloat(String(row.distance || 0));
  return {
    id: row.id,
    tripNumber: row.trip_number || '',
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    origin: row.origin,
    destination: row.destination,
    originLocation: row.origin_location as Location | undefined,
    destinationLocation: row.destination_location as Location | undefined,
    stops: stops,
    distance: isNaN(distance) ? 0 : distance,
    cargoDetails: row.cargo_details || undefined,
    notes: row.notes || undefined,
    unitId: row.unit_id || undefined,
    driverId: row.driver_id || undefined,
    status: row.status || undefined,
  }
}

// Helper to convert database row to Transaction
function rowToTransaction(row: any): Transaction {
  const amount = parseFloat(String(row.amount || 0));
  return {
    id: row.id,
    type: row.type as 'income' | 'expense',
    category: row.category,
    description: row.description,
    amount: isNaN(amount) ? 0 : amount,
    originalCurrency: row.original_currency as 'USD' | 'CAD',
    date: row.date,
    unitId: row.unit_id || undefined,
    tripId: row.trip_id || undefined,
    driverId: row.driver_id || undefined,
    vendorName: row.vendor_name || undefined,
    notes: row.notes || undefined,
    receiptUrl: row.receipt_url || undefined,
  }
}

// Helper to convert database row to Unit
function rowToUnit(row: any): Unit {
  const staticCost = parseFloat(String(row.static_cost || 0));
  const odometerReading = parseFloat(String(row.odometer_reading || 0));
  return {
    id: row.id,
    make: row.make,
    year: row.year,
    model: row.model,
    vin: row.vin,
    plate: row.plate || '',
    province: row.province || '',
    country: (row.country as 'USA' | 'Canada') || 'USA',
    staticCost: isNaN(staticCost) ? 0 : staticCost,
    odometerReading: isNaN(odometerReading) ? 0 : odometerReading,
  }
}

// Helper to convert database row to Driver
function rowToDriver(row: any): Driver {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password_hash, // Keep for compatibility, but use auth in production
    phone: row.phone || undefined,
    licenseNumber: row.license_number || undefined,
    createdAt: row.created_at,
    isActive: row.is_active,
  }
}

// Units
export async function getUnits(): Promise<Unit[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching units:', error)
    return []
  }

  return data.map(rowToUnit)
}

export async function createUnit(unit: Omit<Unit, 'id'>): Promise<Unit | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.')
  }

  // Validate required fields
  if (!unit.make || !unit.model || !unit.vin || !unit.plate || !unit.province || !unit.country) {
    throw new Error('Missing required fields: make, model, VIN, plate, province, and country are required.')
  }
  
  if (unit.country !== 'USA' && unit.country !== 'Canada') {
    throw new Error('Country must be either USA or Canada.')
  }

  if (!unit.year || unit.year < 1900 || unit.year > 2100) {
    throw new Error('Year must be a valid number between 1900 and 2100.')
  }

  // Validate data types
  if (isNaN(unit.staticCost) || unit.staticCost < 0) {
    throw new Error('Static cost must be a valid positive number.')
  }

  if (isNaN(unit.odometerReading) || unit.odometerReading < 0) {
    throw new Error('Odometer reading must be a valid positive number.')
  }

  try {
    // Log initial unit data received
    console.log('createUnit called with:', {
      make: unit.make,
      year: unit.year,
      model: unit.model,
      vin: unit.vin,
      plate: unit.plate,
      province: unit.province,
      country: unit.country,
      staticCost: unit.staticCost,
      odometerReading: unit.odometerReading,
    });

    const insertData = {
      make: unit.make.trim(),
      year: parseInt(unit.year.toString(), 10),
      model: unit.model.trim(),
      vin: unit.vin.trim().toUpperCase(),
      plate: unit.plate.trim().toUpperCase(),
      province: unit.province.trim(),
      country: unit.country,
      static_cost: parseFloat(unit.staticCost.toString()),
      odometer_reading: parseInt(unit.odometerReading.toString(), 10),
    };

    console.log('Insert data prepared:', {
      make: insertData.make,
      year: insertData.year,
      model: insertData.model,
      vin: insertData.vin,
      plate: insertData.plate,
      province: insertData.province,
      country: insertData.country,
      static_cost: insertData.static_cost,
      odometer_reading: insertData.odometer_reading,
    });

    console.log('Supabase client available:', !!supabase);
    console.log('About to call Supabase insert...');

    const { data, error } = await supabase
      .from('units')
      .insert(insertData)
      .select()
      .single()

    console.log('Supabase response received:', {
      hasData: !!data,
      hasError: !!error,
      dataKeys: data ? Object.keys(data) : null,
      errorType: error ? typeof error : null,
    });

    if (error) {
      // Build comprehensive error message as a single string
      const errorParts: string[] = [];
      
      // Add error properties as strings
      if (error.message) errorParts.push(`Message: ${error.message}`);
      if (error.code) errorParts.push(`Code: ${error.code}`);
      if (error.details) errorParts.push(`Details: ${error.details}`);
      if (error.hint) errorParts.push(`Hint: ${error.hint}`);
      if (error.status) errorParts.push(`Status: ${error.status}`);
      
      // Add insert data info
      errorParts.push(`Attempted to insert: make="${insertData.make}", vin="${insertData.vin}"`);
      
      const fullErrorDetails = errorParts.join(' | ');
      console.error('Error creating unit:', fullErrorDetails);
      
      // Also log error object properties individually
      console.error('Error.message:', error.message);
      console.error('Error.code:', error.code);
      console.error('Error.status:', (error as any).status);
      console.error('Error object keys:', Object.keys(error));
      
      // Handle specific error cases
      const errorCode = error.code || '';
      const errorMessage = (error.message || '').toLowerCase();
      const errorStatus = (error as any).status || (error as any).statusCode || 0;
      
      // Allow duplicate VINs - removed unique constraint error handling
      // Admins can now add multiple units with the same VIN if needed
      
      if (errorCode === 'PGRST204' || errorCode === 'PGRST116' || errorStatus === 409) {
        throw new Error('Failed to create unit. The data may conflict with existing records or the request was rejected.');
      } else if (errorCode === '42501' || errorStatus === 403) {
        throw new Error('Permission denied. Please check your database permissions or Row Level Security policies.');
      } else if (error.message) {
        throw new Error(`Failed to create unit: ${error.message}`);
      } else {
        throw new Error(`Failed to create unit. Error code: ${errorCode || errorStatus || 'unknown'}. ${fullErrorDetails}`);
      }
    }

    if (!data) {
      throw new Error('No data returned after creating unit. Please try again.')
    }

    return rowToUnit(data)
  } catch (err) {
    // Re-throw if it's already an Error with a message
    if (err instanceof Error) {
      throw err
    }
    // Otherwise wrap it
    throw new Error(`Unexpected error creating unit: ${String(err)}`)
  }
}

export async function updateUnit(id: string, unit: Partial<Omit<Unit, 'id'>>): Promise<Unit | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const updateData: any = {}
  if (unit.make) updateData.make = unit.make
  if (unit.year !== undefined) updateData.year = unit.year
  if (unit.model) updateData.model = unit.model
  if (unit.vin) updateData.vin = unit.vin
  if (unit.plate) updateData.plate = unit.plate
  if (unit.province) updateData.province = unit.province
  if (unit.country) updateData.country = unit.country
  if (unit.staticCost !== undefined) updateData.static_cost = unit.staticCost
  if (unit.odometerReading !== undefined) updateData.odometer_reading = unit.odometerReading

  const { data, error } = await supabase
    .from('units')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating unit:', error)
    return null
  }

  return rowToUnit(data)
}

// Trips
export async function getTrips(): Promise<Trip[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching trips:', error)
    return []
  }

  return data.map(rowToTrip)
}

export async function getTripsByDriver(driverId: string): Promise<Trip[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_id', driverId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching trips by driver:', error)
    return []
  }

  return data.map(rowToTrip)
}

export async function createTrip(trip: Omit<Trip, 'id' | 'tripNumber'>): Promise<Trip | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart the dev server.')
  }

  // Validate required fields
  if (!trip.name || !trip.startDate || !trip.endDate || !trip.origin || !trip.destination) {
    throw new Error('Missing required fields: name, startDate, endDate, origin, and destination are required')
  }

  // Generate unique trip number
  const tripNumber = await generateTripNumber()

  const insertData: any = {
    trip_number: tripNumber,
    name: trip.name,
    start_date: trip.startDate,
    end_date: trip.endDate,
    origin: trip.origin,
    destination: trip.destination,
    origin_location: trip.originLocation || null,
    destination_location: trip.destinationLocation || null,
    stops: trip.stops && trip.stops.length > 0 ? trip.stops : null,
    distance: trip.distance || 0,
    cargo_details: trip.cargoDetails || null,
    notes: trip.notes || null,
    status: trip.status || 'upcoming',
  }

  // Only include unit_id and driver_id if they are valid UUIDs
  // Validate UUID format (basic check: 8-4-4-4-12 hex characters)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (trip.unitId) {
    if (!uuidRegex.test(trip.unitId)) {
      throw new Error(`Invalid unit ID format. Expected UUID, got: ${trip.unitId}. Please select a unit from the database.`)
    }
    insertData.unit_id = trip.unitId
  }
  if (trip.driverId) {
    if (!uuidRegex.test(trip.driverId)) {
      throw new Error(`Invalid driver ID format. Expected UUID, got: ${trip.driverId}. Please select a driver from the database.`)
    }
    insertData.driver_id = trip.driverId
  }

  const { data, error } = await supabase
    .from('trips')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    // Log error in a way that preserves all properties
    console.error('Error creating trip - Full error object:', JSON.stringify(error, null, 2))
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    
    // Log trip data being inserted
    console.error('Trip data being inserted:', JSON.stringify(insertData, null, 2))
    
    // Create a detailed error message
    const errorMsg = error.message || 'Unknown database error'
    const errorDetails = error.details ? ` Details: ${error.details}` : ''
    const errorHint = error.hint ? ` Hint: ${error.hint}` : ''
    const errorCode = error.code ? ` Code: ${error.code}` : ''
    
    throw new Error(`Database error: ${errorMsg}${errorCode}${errorDetails}${errorHint}`)
  }

  if (!data) {
    console.error('No data returned from trip insert')
    throw new Error('No data returned from database after creating trip')
  }

  return rowToTrip(data)
}

export async function getTripById(id: string): Promise<Trip | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching trip by ID:', error)
    return null
  }

  if (!data) {
    return null
  }

  return rowToTrip(data)
}

export async function updateTrip(id: string, trip: Partial<Omit<Trip, 'id'>>): Promise<Trip | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const updateData: any = {}
  if (trip.name) updateData.name = trip.name
  if (trip.startDate) updateData.start_date = trip.startDate
  if (trip.endDate) updateData.end_date = trip.endDate
  if (trip.origin) updateData.origin = trip.origin
  if (trip.destination) updateData.destination = trip.destination
  if (trip.originLocation !== undefined) updateData.origin_location = trip.originLocation
  if (trip.destinationLocation !== undefined) updateData.destination_location = trip.destinationLocation
  if (trip.stops !== undefined) updateData.stops = trip.stops && trip.stops.length > 0 ? trip.stops : null
  if (trip.distance !== undefined) updateData.distance = trip.distance
  if (trip.cargoDetails !== undefined) updateData.cargo_details = trip.cargoDetails
  if (trip.notes !== undefined) updateData.notes = trip.notes
  if (trip.unitId !== undefined) updateData.unit_id = trip.unitId
  if (trip.driverId !== undefined) updateData.driver_id = trip.driverId
  if (trip.status) updateData.status = trip.status

  const { data, error } = await supabase
    .from('trips')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating trip:', error)
    return null
  }

  return rowToTrip(data)
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data.map(rowToTransaction)
}

export async function getTransactionsByTrip(tripId: string): Promise<Transaction[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('trip_id', tripId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions by trip:', error)
    return []
  }

  return data.map(rowToTransaction)
}

export async function getTransactionsByDriver(driverId: string): Promise<Transaction[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('driver_id', driverId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions by driver:', error)
    return []
  }

  return data.map(rowToTransaction)
}

export async function createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      original_currency: transaction.originalCurrency,
      date: transaction.date,
      unit_id: transaction.unitId || null,
      trip_id: transaction.tripId || null,
      driver_id: transaction.driverId || null,
      vendor_name: transaction.vendorName || null,
      notes: transaction.notes || null,
      receipt_url: transaction.receiptUrl || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating transaction:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: JSON.stringify(error, null, 2)
    })
    throw new Error(`Database error: ${error.message || 'Unknown error'}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (${error.hint})` : ''}`)
  }

  return rowToTransaction(data)
}

export async function updateTransaction(id: string, transaction: Partial<Omit<Transaction, 'id'>>): Promise<Transaction | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const updateData: any = {}
  if (transaction.type) updateData.type = transaction.type
  if (transaction.category) updateData.category = transaction.category
  if (transaction.description) updateData.description = transaction.description
  if (transaction.amount !== undefined) updateData.amount = transaction.amount
  if (transaction.originalCurrency) updateData.original_currency = transaction.originalCurrency
  if (transaction.date) updateData.date = transaction.date
  if (transaction.tripId !== undefined) updateData.trip_id = transaction.tripId
  if (transaction.driverId !== undefined) updateData.driver_id = transaction.driverId
  if (transaction.receiptUrl !== undefined) updateData.receipt_url = transaction.receiptUrl

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating transaction:', error)
    return null
  }

  return rowToTransaction(data)
}

export async function deleteTransaction(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return false
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting transaction:', error)
    return false
  }

  return true
}

// Drivers
export async function getDrivers(): Promise<Driver[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching drivers:', error)
    return []
  }

  return data.map(rowToDriver)
}

export async function getActiveDrivers(): Promise<Driver[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active drivers:', error)
    return []
  }

  return data.map(rowToDriver)
}

export async function getDriverByEmail(email: string): Promise<Driver | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('email', email.toLowerCase()) // Normalize email to lowercase
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return rowToDriver(data)
}

export async function createDriver(driver: Omit<Driver, 'id' | 'createdAt'>): Promise<Driver | null> {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot create driver in database.')
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart the dev server.')
  }

  // Check if email already exists (case-insensitive)
  const normalizedEmail = driver.email.toLowerCase().trim()
  const { data: existingDriver, error: checkError } = await supabase
    .from('drivers')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle()

  if (checkError) {
    console.error('Error checking for existing driver:', checkError)
    // Continue anyway, let the insert handle the constraint
  }

  if (existingDriver) {
    console.error('Driver with this email already exists:', normalizedEmail)
    throw new Error('A driver with this email already exists.')
  }

  // In production, hash the password before storing
  const { data, error } = await supabase
    .from('drivers')
    .insert({
      name: driver.name,
      email: driver.email.toLowerCase(), // Normalize email to lowercase
      password_hash: driver.password, // TODO: Hash password in production
      phone: driver.phone || null,
      license_number: driver.licenseNumber || null,
      is_active: driver.isActive ?? true, // Default to true if not specified
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating driver:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    
    // Throw error with details so it can be caught and displayed
    const errorMessage = error.message || 'Unknown database error'
    const errorDetails = error.details ? ` Details: ${error.details}` : ''
    const errorHint = error.hint ? ` Hint: ${error.hint}` : ''
    throw new Error(`Database error: ${errorMessage}${errorDetails}${errorHint}`)
  }

  if (!data) {
    console.error('No data returned from driver insert')
    return null
  }

  return rowToDriver(data)
}

export async function updateDriver(id: string, driver: Partial<Omit<Driver, 'id' | 'createdAt'>>): Promise<Driver | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const updateData: any = {}
  if (driver.name) updateData.name = driver.name
  if (driver.email) updateData.email = driver.email
  if (driver.password) updateData.password_hash = driver.password // TODO: Hash password in production
  if (driver.phone !== undefined) updateData.phone = driver.phone
  if (driver.licenseNumber !== undefined) updateData.license_number = driver.licenseNumber
  if (driver.isActive !== undefined) updateData.is_active = driver.isActive

  const { data, error } = await supabase
    .from('drivers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating driver:', error)
    return null
  }

  return rowToDriver(data)
}

export async function deleteDriver(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return false
  }

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting driver:', error)
    return false
  }

  return true
}

export async function deleteTrip(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return false
  }

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting trip:', error)
    return false
  }

  return true
}

export async function deleteUnit(id: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return false
  }

  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting unit:', error)
    return false
  }

  return true
}

