import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { settingsDb } from './settings';
import { db } from './db';

export interface SupabaseApiConfig {
  projectUrl: string;
  anonKey: string;
  enabled: boolean;
}

class SupabaseApiService {
  private config: SupabaseApiConfig | null = null;
  private supabase: SupabaseClient | null = null;

  async initialize() {
    try {
      const settings = await settingsDb.getSettings();
      
      if (!settings.supabaseProjectUrl || !settings.supabaseAnonKey) {
        console.warn('Supabase configuration not found');
        return;
      }

      this.config = {
        projectUrl: settings.supabaseProjectUrl,
        anonKey: settings.supabaseAnonKey,
        enabled: settings.supabaseEnabled || false
      };

      if (this.config.enabled) {
        this.supabase = createClient(this.config.projectUrl, this.config.anonKey);
        console.log('Supabase client initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled === true && this.supabase !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.supabase) return false;
    
    try {
      const { data, error } = await this.supabase
        .from('customers')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async initializeDatabase(): Promise<boolean> {
    if (!this.isEnabled() || !this.supabase) {
      return false;
    }

    try {
      // Check if tables exist by trying to select from customers table
      const { data, error } = await this.supabase
        .from('customers')
        .select('id')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        throw new Error('Tables not found. Please run the SQL script in Supabase SQL Editor first.');
      }
      
      return true;
    } catch (error) {
      console.error('Database check failed:', error);
      return false;
    }
  }

  private async clearAndSyncTable(tableName: string, data: any[]): Promise<void> {
    if (!this.supabase || !data.length) return;
    
    try {
      // Delete all existing records
      const { error: deleteError } = await this.supabase
        .from(tableName)
        .delete()
        .neq('id', 0); // Delete all records
      
      if (deleteError) {
        console.warn(`Warning deleting ${tableName}:`, deleteError);
      }
      
      // Insert new records
      const { error: insertError } = await this.supabase
        .from(tableName)
        .insert(data);
      
      if (insertError) {
        console.error(`Error syncing ${tableName}:`, insertError);
      } else {
        console.log(`Synced ${data.length} records to ${tableName}`);
      }
    } catch (error) {
      console.error(`Failed to sync ${tableName}:`, error);
    }
  }

  async syncAllData(): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('Supabase sync is not enabled');
    }

    try {
      // Get all data from IndexedDB
      const customers = await db.customers.toArray();
      const vehicles = await db.vehicles.toArray();
      const inventoryCategories = await db.inventoryCategories.toArray();
      const inventoryItems = await db.inventoryItems.toArray();
      const services = await db.services.toArray();
      const quotations = await db.quotations.toArray();
      const quotationItems = await db.quotationItems.toArray();
      const repairOrders = await db.repairOrders.toArray();
      const repairOrderItems = await db.repairOrderItems.toArray();
      const invoices = await db.invoices.toArray();

      // Sync each table
      await this.clearAndSyncTable('customers', customers);
      await this.clearAndSyncTable('vehicles', vehicles);
      await this.clearAndSyncTable('inventory_categories', inventoryCategories);
      await this.clearAndSyncTable('inventory_items', inventoryItems);
      await this.clearAndSyncTable('services', services);
      await this.clearAndSyncTable('quotations', quotations);
      await this.clearAndSyncTable('quotation_items', quotationItems);
      await this.clearAndSyncTable('repair_orders', repairOrders);
      await this.clearAndSyncTable('repair_order_items', repairOrderItems);
      await this.clearAndSyncTable('invoices', invoices);

      console.log('Data sync to Supabase completed successfully');
    } catch (error) {
      console.error('Failed to sync data to Supabase:', error);
      throw error;
    }
  }

  async loadFromSupabase(): Promise<void> {
    if (!this.isEnabled() || !this.supabase) {
      throw new Error('Supabase is not enabled or configured');
    }

    try {
      // Clear all local data
      await db.customers.clear();
      await db.vehicles.clear();
      await db.inventoryCategories.clear();
      await db.inventoryItems.clear();
      await db.services.clear();
      await db.quotations.clear();
      await db.quotationItems.clear();
      await db.repairOrders.clear();
      await db.repairOrderItems.clear();
      await db.invoices.clear();

      // Load data from Supabase
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
        const { data, error } = await this.supabase
          .from(table.name)
          .select('*');
        
        if (error) {
          console.warn(`Error loading ${table.name}:`, error);
        } else if (data && data.length > 0) {
          await table.dbTable.bulkAdd(data as any);
          console.log(`Loaded ${data.length} records from ${table.name}`);
        }
      }

      console.log('Data loaded from Supabase successfully');
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
      throw error;
    }
  }
}

export const supabaseApiService = new SupabaseApiService();