-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make TEXT NOT NULL,
  year INTEGER NOT NULL,
  model TEXT NOT NULL,
  vin TEXT NOT NULL,
  plate TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('USA', 'Canada')),
  static_cost DECIMAL(10, 2) NOT NULL,
  odometer_reading INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin_location JSONB,
  destination_location JSONB,
  distance DECIMAL(10, 2) NOT NULL,
  cargo_details TEXT,
  notes TEXT,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  original_currency TEXT NOT NULL CHECK (original_currency IN ('USD', 'CAD')),
  date TIMESTAMPTZ NOT NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  vendor_name TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_unit_id ON trips(unit_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_transactions_trip_id ON transactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_transactions_driver_id ON transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_unit_id ON transactions(unit_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_drivers_is_active ON drivers(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Enable for all tables
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies - Allow all operations for now (adjust based on your auth requirements)
DROP POLICY IF EXISTS "Allow all operations on units" ON units;
CREATE POLICY "Allow all operations on units" ON units
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on drivers" ON drivers;
CREATE POLICY "Allow all operations on drivers" ON drivers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on trips" ON trips;
CREATE POLICY "Allow all operations on trips" ON trips
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

