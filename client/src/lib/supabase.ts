import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { settingsDb, Settings } from './settings';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;

  async initialize() {
    const settings = await settingsDb.getSettings();
    if (settings.supabaseUrl && settings.supabaseKey && settings.supabaseEnabled) {
      this.config = {
        url: settings.supabaseUrl,
        anonKey: settings.supabaseKey,
        enabled: settings.supabaseEnabled
      };
      this.client = createClient(this.config.url, this.config.anonKey);
      return true;
    }
    return false;
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const { error } = await this.client.from('customers').select('count', { count: 'exact', head: true });
      return !error;
    } catch (err) {
      return false;
    }
  }

  async syncCustomers(customers: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      // Xóa dữ liệu cũ và thêm mới
      await this.client.from('customers').delete().neq('id', -1);
      if (customers.length > 0) {
        await this.client.from('customers').insert(customers);
      }
    } catch (error) {
      console.error('Error syncing customers:', error);
    }
  }

  async syncVehicles(vehicles: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('vehicles').delete().neq('id', -1);
      if (vehicles.length > 0) {
        await this.client.from('vehicles').insert(vehicles);
      }
    } catch (error) {
      console.error('Error syncing vehicles:', error);
    }
  }

  async syncInventoryCategories(categories: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('inventory_categories').delete().neq('id', -1);
      if (categories.length > 0) {
        await this.client.from('inventory_categories').insert(categories);
      }
    } catch (error) {
      console.error('Error syncing inventory categories:', error);
    }
  }

  async syncInventoryItems(items: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('inventory_items').delete().neq('id', -1);
      if (items.length > 0) {
        await this.client.from('inventory_items').insert(items);
      }
    } catch (error) {
      console.error('Error syncing inventory items:', error);
    }
  }

  async syncServices(services: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('services').delete().neq('id', -1);
      if (services.length > 0) {
        await this.client.from('services').insert(services);
      }
    } catch (error) {
      console.error('Error syncing services:', error);
    }
  }

  async syncQuotations(quotations: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('quotations').delete().neq('id', -1);
      if (quotations.length > 0) {
        await this.client.from('quotations').insert(quotations);
      }
    } catch (error) {
      console.error('Error syncing quotations:', error);
    }
  }

  async syncQuotationItems(items: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('quotation_items').delete().neq('id', -1);
      if (items.length > 0) {
        await this.client.from('quotation_items').insert(items);
      }
    } catch (error) {
      console.error('Error syncing quotation items:', error);
    }
  }

  async syncRepairOrders(repairOrders: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('repair_orders').delete().neq('id', -1);
      if (repairOrders.length > 0) {
        await this.client.from('repair_orders').insert(repairOrders);
      }
    } catch (error) {
      console.error('Error syncing repair orders:', error);
    }
  }

  async syncRepairOrderItems(items: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('repair_order_items').delete().neq('id', -1);
      if (items.length > 0) {
        await this.client.from('repair_order_items').insert(items);
      }
    } catch (error) {
      console.error('Error syncing repair order items:', error);
    }
  }

  async syncInvoices(invoices: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('invoices').delete().neq('id', -1);
      if (invoices.length > 0) {
        await this.client.from('invoices').insert(invoices);
      }
    } catch (error) {
      console.error('Error syncing invoices:', error);
    }
  }

  async loadFromSupabase() {
    if (!this.client || !this.isEnabled()) return;

    try {
      // Load customers
      const { data: customers } = await this.client.from('customers').select('*');
      if (customers) {
        await this.db.customers.clear();
        await this.db.customers.bulkAdd(customers);
      }

      // Load vehicles
      const { data: vehicles } = await this.client.from('vehicles').select('*');
      if (vehicles) {
        await this.db.vehicles.clear();
        await this.db.vehicles.bulkAdd(vehicles);
      }

      // Load inventory categories
      const { data: categories } = await this.client.from('inventory_categories').select('*');
      if (categories) {
        await this.db.inventoryCategories.clear();
        await this.db.inventoryCategories.bulkAdd(categories);
      }

      // Load inventory items
      const { data: items } = await this.client.from('inventory_items').select('*');
      if (items) {
        await this.db.inventoryItems.clear();
        await this.db.inventoryItems.bulkAdd(items);
      }

      // Load services
      const { data: services } = await this.client.from('services').select('*');
      if (services) {
        await this.db.services.clear();
        await this.db.services.bulkAdd(services);
      }

      // Load quotations
      const { data: quotations } = await this.client.from('quotations').select('*');
      if (quotations) {
        await this.db.quotations.clear();
        await this.db.quotations.bulkAdd(quotations);
      }

      // Load quotation items
      const { data: quotationItems } = await this.client.from('quotation_items').select('*');
      if (quotationItems) {
        await this.db.quotationItems.clear();
        await this.db.quotationItems.bulkAdd(quotationItems);
      }

      // Load repair orders
      const { data: repairOrders } = await this.client.from('repair_orders').select('*');
      if (repairOrders) {
        await this.db.repairOrders.clear();
        await this.db.repairOrders.bulkAdd(repairOrders);
      }

      // Load repair order items
      const { data: repairOrderItems } = await this.client.from('repair_order_items').select('*');
      if (repairOrderItems) {
        await this.db.repairOrderItems.clear();
        await this.db.repairOrderItems.bulkAdd(repairOrderItems);
      }

      // Load invoices
      const { data: invoices } = await this.client.from('invoices').select('*');
      if (invoices) {
        await this.db.invoices.clear();
        await this.db.invoices.bulkAdd(invoices);
      }

      console.log('Data loaded from Supabase successfully');
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    }
  }

  async syncAllData() {
    if (!this.client || !this.isEnabled()) return;

    try {
      // Import db here to avoid circular dependency
      const { db } = await import('./db');
      this.db = db;

      // Get all data from local database
      const [
        customers,
        vehicles,
        categories,
        items,
        services,
        quotations,
        quotationItems,
        repairOrders,
        repairOrderItems,
        invoices
      ] = await Promise.all([
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

      // Sync to Supabase
      await Promise.all([
        this.syncCustomers(customers),
        this.syncVehicles(vehicles),
        this.syncInventoryCategories(categories),
        this.syncInventoryItems(items),
        this.syncServices(services),
        this.syncQuotations(quotations),
        this.syncQuotationItems(quotationItems),
        this.syncRepairOrders(repairOrders),
        this.syncRepairOrderItems(repairOrderItems),
        this.syncInvoices(invoices)
      ]);

      console.log('All data synced to Supabase successfully');
    } catch (error) {
      console.error('Error syncing data to Supabase:', error);
    }
  }

  private db: any; // Will be set dynamically to avoid circular dependency
}

export const supabaseService = new SupabaseService();