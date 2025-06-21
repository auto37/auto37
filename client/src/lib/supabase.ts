export interface SupabaseConfig {
  databaseUrl: string;
  enabled: boolean;
}

interface DatabaseTable {
  tableName: string;
  data: any[];
}

class SupabaseService {
  private config: SupabaseConfig | null = null;

  async initialize() {
    const { settingsDb } = await import('./settings');
    const settings = await settingsDb.getSettings();
    
    this.config = {
      databaseUrl: settings.supabaseDatabaseUrl || '',
      enabled: Boolean(settings.supabaseEnabled)
    };
  }

  isEnabled(): boolean {
    return Boolean(this.config?.enabled) && Boolean(this.config?.databaseUrl);
  }

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled() || !this.config?.databaseUrl) {
      return false;
    }

    try {
      const response = await fetch('/api/test-supabase-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseUrl: this.config.databaseUrl
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  async initializeDatabase(): Promise<boolean> {
    if (!this.isEnabled() || !this.config?.databaseUrl) {
      return false;
    }

    try {
      const response = await fetch('/api/initialize-supabase-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseUrl: this.config.databaseUrl
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Supabase database initialization failed:', error);
      return false;
    }
  }

  async syncAllData(): Promise<void> {
    if (!this.isEnabled()) return;

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

      const tables: DatabaseTable[] = [
        { tableName: 'customers', data: customers },
        { tableName: 'vehicles', data: vehicles },
        { tableName: 'inventory_categories', data: inventoryCategories },
        { tableName: 'inventory_items', data: inventoryItems },
        { tableName: 'services', data: services },
        { tableName: 'quotations', data: quotations },
        { tableName: 'quotation_items', data: quotationItems },
        { tableName: 'repair_orders', data: repairOrders },
        { tableName: 'repair_order_items', data: repairOrderItems },
        { tableName: 'invoices', data: invoices }
      ];

      const response = await fetch('/api/sync-to-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseUrl: this.config?.databaseUrl,
          tables
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      console.log('Data sync to Supabase completed successfully');
    } catch (error) {
      console.error('Error syncing data to Supabase:', error);
      throw error;
    }
  }

  async loadFromSupabase(): Promise<void> {
    if (!this.isEnabled()) return;

    const { db } = await import('./db');

    try {
      console.log('Starting data load from Supabase...');

      const response = await fetch('/api/load-from-supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseUrl: this.config?.databaseUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Load failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Clear existing data and load from Supabase
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

      // Load data from Supabase
      if (data.customers?.length) {
        await db.customers.bulkAdd(data.customers);
        console.log(`Loaded ${data.customers.length} customers from Supabase`);
      }

      if (data.vehicles?.length) {
        await db.vehicles.bulkAdd(data.vehicles);
        console.log(`Loaded ${data.vehicles.length} vehicles from Supabase`);
      }

      if (data.inventoryCategories?.length) {
        await db.inventoryCategories.bulkAdd(data.inventoryCategories);
        console.log(`Loaded ${data.inventoryCategories.length} inventory categories from Supabase`);
      }

      if (data.inventoryItems?.length) {
        await db.inventoryItems.bulkAdd(data.inventoryItems);
        console.log(`Loaded ${data.inventoryItems.length} inventory items from Supabase`);
      }

      if (data.services?.length) {
        await db.services.bulkAdd(data.services);
        console.log(`Loaded ${data.services.length} services from Supabase`);
      }

      if (data.quotations?.length) {
        await db.quotations.bulkAdd(data.quotations);
        console.log(`Loaded ${data.quotations.length} quotations from Supabase`);
      }

      if (data.quotationItems?.length) {
        await db.quotationItems.bulkAdd(data.quotationItems);
        console.log(`Loaded ${data.quotationItems.length} quotation items from Supabase`);
      }

      if (data.repairOrders?.length) {
        await db.repairOrders.bulkAdd(data.repairOrders);
        console.log(`Loaded ${data.repairOrders.length} repair orders from Supabase`);
      }

      if (data.repairOrderItems?.length) {
        await db.repairOrderItems.bulkAdd(data.repairOrderItems);
        console.log(`Loaded ${data.repairOrderItems.length} repair order items from Supabase`);
      }

      if (data.invoices?.length) {
        await db.invoices.bulkAdd(data.invoices);
        console.log(`Loaded ${data.invoices.length} invoices from Supabase`);
      }

      console.log('Data loading from Supabase completed');
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      throw error;
    }
  }
}

export const supabaseService = new SupabaseService();