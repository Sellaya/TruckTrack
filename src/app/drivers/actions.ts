'use server';

/**
 * Server action to create a new driver with email and password
 * In production, this should integrate with Firebase Auth or another authentication service
 */

export interface CreateDriverInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  licenseNumber?: string;
}

export interface CreateDriverResult {
  success: boolean;
  driverId?: string;
  error?: string;
}

export async function createDriverAction(input: CreateDriverInput): Promise<CreateDriverResult> {
  try {
    // Validate input
    if (!input.name || !input.email || !input.password) {
      return {
        success: false,
        error: 'Name, email, and password are required.',
      };
    }

    if (!input.email.includes('@')) {
      return {
        success: false,
        error: 'Invalid email format.',
      };
    }

    if (input.password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters.',
      };
    }

    // Check if email already exists before creating
    const { getDriverByEmail, createDriver } = await import('@/lib/supabase/database');
    
    const existingDriver = await getDriverByEmail(input.email.toLowerCase());
    if (existingDriver) {
      return {
        success: false,
        error: 'A driver with this email already exists.',
      };
    }
    
    try {
      const driver = await createDriver({
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password, // TODO: Hash password in production
        phone: input.phone?.trim() || undefined,
        licenseNumber: input.licenseNumber?.trim() || undefined,
        isActive: true,
      });

      if (!driver) {
        return {
          success: false,
          error: 'Failed to create driver. The email may already be in use or there was a database error. Please check the browser console (F12) for details.',
        };
      }

      return {
        success: true,
        driverId: driver.id,
      };
    } catch (driverError) {
      console.error('Error in createDriver call:', driverError);
      return {
        success: false,
        error: driverError instanceof Error ? driverError.message : 'Failed to create driver. Please check the console for details.',
      };
    }
  } catch (error) {
    console.error('Error creating driver:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create driver.',
    };
  }
}

