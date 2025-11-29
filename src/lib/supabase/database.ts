import { supabase } from './client'
import type { Trip, Transaction, Unit, Driver, Location, WhatsAppMessage, WhatsAppMessageRow, ExtractedReceiptData } from '../types'

// Helper to convert database row to Trip
function rowToTrip(row: any): Trip {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    origin: row.origin,
    destination: row.destination,
    originLocation: row.origin_location as Location | undefined,
    destinationLocation: row.destination_location as Location | undefined,
    distance: parseFloat(row.distance),
    cargoDetails: row.cargo_details || undefined,
    notes: row.notes || undefined,
    unitId: row.unit_id || undefined,
    driverId: row.driver_id || undefined,
    status: row.status || undefined,
  }
}

// Helper to convert database row to Transaction
function rowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type as 'income' | 'expense',
    category: row.category,
    description: row.description,
    amount: parseFloat(row.amount),
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
  return {
    id: row.id,
    name: row.name,
    licensePlate: row.license_plate,
    purchaseDate: row.purchase_date,
    staticCost: parseFloat(row.static_cost),
    coveredMiles: row.covered_miles,
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
    whatsappPhone: row.whatsapp_phone || undefined,
  }
}

// Helper to convert database row to WhatsAppMessage
function rowToWhatsAppMessage(row: WhatsAppMessageRow): WhatsAppMessage {
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    driverId: row.driver_id || undefined,
    messageType: row.message_type,
    imageUrl: row.image_url || undefined,
    rawOcrText: row.raw_ocr_text || undefined,
    extractedData: row.extracted_data || undefined,
    processed: row.processed,
    tripId: row.trip_id || undefined,
    expenseId: row.expense_id || undefined,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
    processedAt: row.processed_at || undefined,
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
    return null
  }

  const { data, error } = await supabase
    .from('units')
    .insert({
      name: unit.name,
      license_plate: unit.licensePlate,
      purchase_date: unit.purchaseDate,
      static_cost: unit.staticCost,
      covered_miles: unit.coveredMiles,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating unit:', error)
    return null
  }

  return rowToUnit(data)
}

export async function updateUnit(id: string, unit: Partial<Omit<Unit, 'id'>>): Promise<Unit | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const updateData: any = {}
  if (unit.name) updateData.name = unit.name
  if (unit.licensePlate) updateData.license_plate = unit.licensePlate
  if (unit.purchaseDate) updateData.purchase_date = unit.purchaseDate
  if (unit.staticCost !== undefined) updateData.static_cost = unit.staticCost
  if (unit.coveredMiles !== undefined) updateData.covered_miles = unit.coveredMiles

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

export async function createTrip(trip: Omit<Trip, 'id'>): Promise<Trip | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart the dev server.')
  }

  // Validate required fields
  if (!trip.name || !trip.startDate || !trip.endDate || !trip.origin || !trip.destination) {
    throw new Error('Missing required fields: name, startDate, endDate, origin, and destination are required')
  }

  const insertData: any = {
    name: trip.name,
    start_date: trip.startDate,
    end_date: trip.endDate,
    origin: trip.origin,
    destination: trip.destination,
    origin_location: trip.originLocation || null,
    destination_location: trip.destinationLocation || null,
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

// WhatsApp Messages
export async function getWhatsAppMessageById(id: string): Promise<WhatsAppMessage | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching WhatsApp message by ID:', error)
    return null
  }

  if (!data) {
    return null
  }

  return rowToWhatsAppMessage(data)
}

export async function getUnprocessedWhatsAppMessages(): Promise<WhatsAppMessage[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unprocessed WhatsApp messages:', error)
    return []
  }

  return data.map(rowToWhatsAppMessage)
}

export async function getWhatsAppMessagesByDriver(driverId: string): Promise<WhatsAppMessage[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty array')
    return []
  }

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching WhatsApp messages by driver:', error)
    return []
  }

  return data.map(rowToWhatsAppMessage)
}

export async function createWhatsAppMessage(data: {
  phone_number: string
  message_type: 'image' | 'text'
  image_url?: string
  raw_ocr_text?: string
}): Promise<WhatsAppMessage | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  // Attempt to match phone_number to driver using whatsapp_phone
  let driverId: string | null = null
  try {
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('whatsapp_phone', data.phone_number)
      .maybeSingle()

    if (!driverError && driverData) {
      driverId = driverData.id
    }
  } catch (error) {
    console.warn('Error matching phone number to driver:', error)
    // Continue without driver_id if matching fails
  }

  const insertData: any = {
    phone_number: data.phone_number,
    message_type: data.message_type,
    driver_id: driverId,
    image_url: data.image_url || null,
    raw_ocr_text: data.raw_ocr_text || null,
    processed: false,
  }

  const { data: insertedData, error } = await supabase
    .from('whatsapp_messages')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating WhatsApp message:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: JSON.stringify(error, null, 2)
    })
    return null
  }

  if (!insertedData) {
    console.error('No data returned from WhatsApp message insert')
    return null
  }

  return rowToWhatsAppMessage(insertedData)
}

export async function updateWhatsAppMessage(id: string, updates: Partial<WhatsAppMessage>): Promise<WhatsAppMessage | null> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return null
  }

  const updateData: any = {}
  if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber
  if (updates.driverId !== undefined) updateData.driver_id = updates.driverId
  if (updates.messageType !== undefined) updateData.message_type = updates.messageType
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl
  if (updates.rawOcrText !== undefined) updateData.raw_ocr_text = updates.rawOcrText
  if (updates.extractedData !== undefined) updateData.extracted_data = updates.extractedData
  if (updates.processed !== undefined) updateData.processed = updates.processed
  if (updates.tripId !== undefined) updateData.trip_id = updates.tripId
  if (updates.expenseId !== undefined) updateData.expense_id = updates.expenseId
  if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage
  if (updates.processedAt !== undefined) updateData.processed_at = updates.processedAt

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating WhatsApp message:', error)
    return null
  }

  if (!data) {
    console.error('No data returned from WhatsApp message update')
    return null
  }

  return rowToWhatsAppMessage(data)
}

export async function linkWhatsAppMessageToExpense(messageId: string, expenseId: string, tripId?: string): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured')
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file and restart the dev server.')
  }

  const updateData: any = {
    expense_id: expenseId,
    trip_id: tripId || null,
    processed: true,
    processed_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('id', messageId)

  if (error) {
    console.error('Error linking WhatsApp message to expense:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: JSON.stringify(error, null, 2)
    })
    throw new Error(`Database error: ${error.message || 'Unknown error'}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (${error.hint})` : ''}`)
  }
}

