import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseApiConfig {
  projectUrl: string;
  anonKey: string;
  enabled: boolean;
}

interface DatabaseTable {
  tableName: string;
  data: any[];
}

class SupabaseApiService {
  private config: SupabaseApiConfig | null = null;
  private supabase: SupabaseClient | null = null;

  private mapDataForSupabase(data: any[], tableName: string): any[] {
    return data.map(item => {
      const mapped: any = {};
      
      // Copy all properties first
      Object.keys(item).forEach(key => {
        mapped[key] = item[key];
      });
      
      // Handle specific column mappings based on table
      switch (tableName) {
        case 'customers':
          if (item.code) {
            mapped.customer_code = item.code;
            delete mapped.code;
          }
          break;
        case 'vehicles':
          if (item.code) {
            mapped.vehicle_code = item.code;
            delete mapped.code;
          }
          if (item.customerId) {
            mapped.customer_id = item.customerId;
            delete mapped.customerId;
          }
          break;
        case 'inventory_categories':
          if (item.code) {
            mapped.category_code = item.code;
            delete mapped.code;
          }
          break;
        case 'inventory_items':
          if (item.code) {
            mapped.item_code = item.code;
            delete mapped.code;
          }
          if (item.categoryId) {
            mapped.category_id = item.categoryId;
            delete mapped.categoryId;
          }
          break;
        case 'services':
          if (item.code) {
            mapped.service_code = item.code;
            delete mapped.code;
          }
          break;
        case 'quotations':
          if (item.code) {
            mapped.quotation_code = item.code;
            delete mapped.code;
          }
          if (item.customerId) {
            mapped.customer_id = item.customerId;
            delete mapped.customerId;
          }
          if (item.vehicleId) {
            mapped.vehicle_id = item.vehicleId;
            delete mapped.vehicleId;
          }
          break;
        case 'quotation_items':
          if (item.quotationId) {
            mapped.quotation_id = item.quotationId;
            delete mapped.quotationId;
          }
          if (item.itemId) {
            mapped.item_id = item.itemId;
            delete mapped.itemId;
          }
          break;
        case 'repair_orders':
          if (item.code) {
            mapped.repair_order_code = item.code;
            delete mapped.code;
          }
          if (item.customerId) {
            mapped.customer_id = item.customerId;
            delete mapped.customerId;
          }
          if (item.vehicleId) {
            mapped.vehicle_id = item.vehicleId;
            delete mapped.vehicleId;
          }
          if (item.quotationId) {
            mapped.quotation_id = item.quotationId;
            delete mapped.quotationId;
          }
          break;
        case 'repair_order_items':
          if (item.repairOrderId) {
            mapped.repair_order_id = item.repairOrderId;
            delete mapped.repairOrderId;
          }
          if (item.itemId) {
            mapped.item_id = item.itemId;
            delete mapped.itemId;
          }
          break;
        case 'invoices':
          if (item.code) {
            mapped.invoice_code = item.code;
            delete mapped.code;
          }
          if (item.customerId) {
            mapped.customer_id = item.customerId;
            delete mapped.customerId;
          }
          if (item.vehicleId) {
            mapped.vehicle_id = item.vehicleId;
            delete mapped.vehicleId;
          }
          if (item.repairOrderId) {
            mapped.repair_order_id = item.repairOrderId;
            delete mapped.repairOrderId;
          }
          if (item.amountPaid) {
            mapped.paid_amount = item.amountPaid;
            delete mapped.amountPaid;
          }
          break;
      }
      
      return mapped;
    });
  }

  async initialize() {
    const { settingsDb } = await import('./settings');
    const settings = await settingsDb.getSettings();
    
    this.config = {
      projectUrl: settings.supabaseProjectUrl || '',
      anonKey: settings.supabaseAnonKey || '',
      enabled: Boolean(settings.supabaseEnabled)
    };

    if (this.config.projectUrl && this.config.anonKey) {
      this.supabase = createClient(this.config.projectUrl, this.config.anonKey);
    }
  }

  isEnabled(): boolean {
    return Boolean(this.config?.enabled) && Boolean(this.config?.projectUrl) && Boolean(this.config?.anonKey);
  }

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled() || !this.supabase) {
      return false;
    }

    try {
      // Test connection by trying to access auth
      const { data, error } = await this.supabase.from('customers').select('count', { count: 'exact', head: true });
      
      // Even if table doesn't exist, connection is working if we don't get network error
      return error?.code !== 'PGRST301' ? true : !error.message.includes('network');
    } catch (error) {
      console.error('Supabase API connection test failed:', error);
      return false;
    }
  }

  async initializeDatabase(): Promise<boolean> {
    if (!this.isEnabled() || !this.supabase) {
      return false;
    }

    try {
      // Create tables using Supabase SQL
      const createTablesSQL = `
        -- Customers table
        CREATE TABLE IF NOT EXISTS customers (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(255),
          address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Vehicles table
        CREATE TABLE IF NOT EXISTS vehicles (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          customer_id BIGINT REFERENCES customers(id),
          license_plate VARCHAR(20) NOT NULL,
          brand VARCHAR(100),
          model VARCHAR(100),
          year INTEGER,
          color VARCHAR(50),
          engine_number VARCHAR(100),
          chassis_number VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Inventory Categories table
        CREATE TABLE IF NOT EXISTS inventory_categories (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Inventory Items table
        CREATE TABLE IF NOT EXISTS inventory_items (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          category_id BIGINT REFERENCES inventory_categories(id),
          unit VARCHAR(20),
          quantity INTEGER DEFAULT 0,
          unit_price DECIMAL(10,2),
          supplier VARCHAR(255),
          location VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Services table
        CREATE TABLE IF NOT EXISTS services (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          unit_price DECIMAL(10,2),
          estimated_time INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Quotations table
        CREATE TABLE IF NOT EXISTS quotations (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          customer_id BIGINT REFERENCES customers(id),
          vehicle_id BIGINT REFERENCES vehicles(id),
          date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          date_expected TIMESTAMP WITH TIME ZONE,
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2),
          total DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Quotation Items table
        CREATE TABLE IF NOT EXISTS quotation_items (
          id BIGSERIAL PRIMARY KEY,
          quotation_id BIGINT REFERENCES quotations(id),
          item_id BIGINT,
          item_type VARCHAR(20),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2),
          total DECIMAL(10,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Repair Orders table
        CREATE TABLE IF NOT EXISTS repair_orders (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          quotation_id BIGINT REFERENCES quotations(id),
          customer_id BIGINT REFERENCES customers(id),
          vehicle_id BIGINT REFERENCES vehicles(id),
          date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          date_expected TIMESTAMP WITH TIME ZONE,
          odometer INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          tax DECIMAL(10,2),
          total DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Repair Order Items table
        CREATE TABLE IF NOT EXISTS repair_order_items (
          id BIGSERIAL PRIMARY KEY,
          repair_order_id BIGINT REFERENCES repair_orders(id),
          item_id BIGINT,
          item_type VARCHAR(20),
          quantity INTEGER DEFAULT 1,
          unit_price DECIMAL(10,2),
          total DECIMAL(10,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Invoices table
        CREATE TABLE IF NOT EXISTS invoices (
          id BIGSERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          repair_order_id BIGINT REFERENCES repair_orders(id),
          customer_id BIGINT REFERENCES customers(id),
          vehicle_id BIGINT REFERENCES vehicles(id),
          date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'pending',
          notes TEXT,
          subtotal DECIMAL(10,2) DEFAULT 0,
          discount DECIMAL(10,2),
          tax DECIMAL(10,2),
          total DECIMAL(10,2) DEFAULT 0,
          amount_paid DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      const { error } = await this.supabase.rpc('exec_sql', { sql: createTablesSQL });
      
      if (error) {
        console.error('Error creating tables:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Supabase database initialization failed:', error);
      return false;
    }
  }

  async syncAllData(): Promise<void> {
    if (!this.isEnabled() || !this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { db } = await import('./db');

    try {
      const [customers, vehicles, inventoryCategories, inventoryItems, services, quotations, quotationItems, repairOrders, repairOrderItems, invoices] = await Promise.all([
        db.customers.toArray(),
        db.vehicles.toArray(),
        db.inventoryCategories.toArray(),
        db.inventoryItems.toArray(),
        db.services.toArray(),
        db.quotations.toArray(),
        db.quotationItems.toArray(),
        db.repairOrders.toArray(),
        db.repairOrderItems.toArray(),
        db.invoices.toArray()
      ]);

      // Sync each table
      const tables = [
        { name: 'customers', data: customers },
        { name: 'vehicles', data: vehicles },
        { name: 'inventory_categories', data: inventoryCategories },
        { name: 'inventory_items', data: inventoryItems },
        { name: 'services', data: services },
        { name: 'quotations', data: quotations },
        { name: 'quotation_items', data: quotationItems },
        { name: 'repair_orders', data: repairOrders },
        { name: 'repair_order_items', data: repairOrderItems },
        { name: 'invoices', data: invoices }
      ];

      for (const table of tables) {
        if (table.data.length > 0) {
          // Map data to match Supabase column names
          const mappedData = this.mapDataForSupabase(table.data, table.name);
          
          // Clear existing data
          await this.supabase.from(table.name).delete().neq('id', 0);

          // Insert new data
          const { error } = await this.supabase.from(table.name).insert(mappedData);
          
          if (error) {
            console.error(`Error syncing ${table.name}:`, error);
          } else {
            console.log(`Synced ${table.data.length} records to ${table.name}`);
          }
        }
      }

      console.log('Data sync to Supabase completed successfully');
    } catch (error) {
      console.error('Error syncing data to Supabase:', error);
      throw error;
    }
  }

  async loadFromSupabase(): Promise<void> {
    if (!this.isEnabled() || !this.supabase) {
      throw new Error('Supabase not configured');
    }

    const { db } = await import('./db');

    try {
      console.log('Starting data load from Supabase...');

      // Clear existing data
      await Promise.all([
        db.customers.clear(),
        db.vehicles.clear(),
        db.inventoryCategories.clear(),
        db.inventoryItems.clear(),
        db.services.clear(),
        db.quotations.clear(),
        db.quotationItems.clear(),
        db.repairOrders.clear(),
        db.repairOrderItems.clear(),
        db.invoices.clear()
      ]);

      // Load data from each table
      const tables = [
        { name: 'customers', dbTable: db.customers },
        { name: 'vehicles', dbTable: db.vehicles },
        { name: 'inventory_categories', dbTable: db.inventoryCategories },
        { name: 'inventory_items', dbTable: db.inventoryItems },
        { name: 'services', dbTable: db.services },
        { name: 'quotations', dbTable: db.quotations },
        { name: 'quotation_items', dbTable: db.quotationItems },
        { name: 'repair_orders', dbTable: db.repairOrders },
        { name: 'repair_order_items', dbTable: db.repairOrderItems },
        { name: 'invoices', dbTable: db.invoices }
      ];

      for (const table of tables) {
        const { data, error } = await this.supabase.from(table.name).select('*').order('id');
        
        if (error) {
          console.warn(`Error loading ${table.name}:`, error);
        } else if (data && data.length > 0) {
          // Add records one by one to avoid TypeScript issues
          for (const item of data) {
            try {
              await (table.dbTable as any).put(item);
            } catch (itemError) {
              console.warn(`Error adding item to ${table.name}:`, itemError);
            }
          }
          console.log(`Loaded ${data.length} records from ${table.name}`);
        }
      }

      console.log('Data loading from Supabase completed');
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      throw error;
    }
  }
}

export const supabaseApiService = new SupabaseApiService();