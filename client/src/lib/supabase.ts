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
      // Xóa toàn bộ dữ liệu cũ
      const { error: deleteError } = await this.client.from('customers').delete().gte('id', 0);
      if (deleteError) throw deleteError;

      if (customers.length > 0) {
        const formattedCustomers = customers.map(customer => ({
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          address: customer.address || null,
          email: customer.email || null,
          tax_code: customer.taxCode || null,
          notes: customer.notes || null
        }));
        const { error } = await this.client.from('customers').insert(formattedCustomers);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing customers:', error);
      throw error;
    }
  }

  async syncVehicles(vehicles: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('vehicles').delete().neq('id', -1);
      if (vehicles.length > 0) {
        const formattedVehicles = vehicles.map(vehicle => ({
          id: vehicle.id,
          code: vehicle.code,
          customer_id: vehicle.customerId,
          license_plate: vehicle.licensePlate,
          brand: vehicle.brand,
          model: vehicle.model,
          vin: vehicle.vin,
          year: vehicle.year,
          color: vehicle.color,
          last_odometer: vehicle.lastOdometer
        }));
        const { error } = await this.client.from('vehicles').insert(formattedVehicles);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing vehicles:', error);
      throw error;
    }
  }

  async syncInventoryCategories(categories: any[]) {
    if (!this.client || !this.isEnabled()) return;

    try {
      await this.client.from('inventory_categories').delete().neq('id', -1);
      if (categories.length > 0) {
        const formattedCategories = categories.map(category => ({
          id: category.id,
          code: category.code,
          name: category.name
        }));
        const { error } = await this.client.from('inventory_categories').insert(formattedCategories);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing inventory categories:', error);
      throw error;
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
      console.log('Starting data load from Supabase...');
      
      // Load customers
      const { data: customersData, error: customersError } = await this.client.from('customers').select('*');
      if (customersError) throw customersError;
      if (customersData?.length) {
        const customers = customersData.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          phone: item.phone,
          address: item.address,
          email: item.email,
          taxCode: item.tax_code,
          notes: item.notes
        }));
        await this.db.customers.clear();
        await this.db.customers.bulkAdd(customers);
        console.log(`Loaded ${customers.length} customers from Supabase`);
      }

      // Load vehicles
      const { data: vehiclesData, error: vehiclesError } = await this.client.from('vehicles').select('*');
      if (vehiclesError) throw vehiclesError;
      if (vehiclesData?.length) {
        const vehicles = vehiclesData.map(item => ({
          id: item.id,
          code: item.code,
          customerId: item.customer_id,
          licensePlate: item.license_plate,
          brand: item.brand,
          model: item.model,
          vin: item.vin,
          year: item.year,
          color: item.color,
          lastOdometer: item.last_odometer || 0
        }));
        await this.db.vehicles.clear();
        await this.db.vehicles.bulkAdd(vehicles);
        console.log(`Loaded ${vehicles.length} vehicles from Supabase`);
      }

      // Load inventory categories
      const { data: categoriesData, error: categoriesError } = await this.client.from('inventory_categories').select('*');
      if (categoriesError) throw categoriesError;
      if (categoriesData?.length) {
        const categories = categoriesData.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name
        }));
        await this.db.inventoryCategories.clear();
        await this.db.inventoryCategories.bulkAdd(categories);
        console.log(`Loaded ${categories.length} inventory categories from Supabase`);
      }

      // Load inventory items
      const { data: itemsData, error: itemsError } = await this.client.from('inventory_items').select('*');
      if (itemsError) throw itemsError;
      if (itemsData?.length) {
        const items = itemsData.map(item => ({
          id: item.id,
          sku: item.sku,
          name: item.name,
          categoryId: item.category_id,
          unit: item.unit,
          quantity: item.quantity || 0,
          costPrice: item.cost_price || 0,
          sellingPrice: item.selling_price || 0,
          supplier: item.supplier,
          location: item.location,
          minQuantity: item.min_quantity || 0,
          notes: item.notes
        }));
        await this.db.inventoryItems.clear();
        await this.db.inventoryItems.bulkAdd(items);
        console.log(`Loaded ${items.length} inventory items from Supabase`);
      }

      // Load services
      const { data: servicesData, error: servicesError } = await this.client.from('services').select('*');
      if (servicesError) throw servicesError;
      if (servicesData?.length) {
        const services = servicesData.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          description: item.description,
          price: item.price || 0,
          estimatedTime: item.estimated_time || 0
        }));
        await this.db.services.clear();
        await this.db.services.bulkAdd(services);
        console.log(`Loaded ${services.length} services from Supabase`);
      }

      // Load quotations
      const { data: quotationsData, error: quotationsError } = await this.client.from('quotations').select('*');
      if (quotationsError) throw quotationsError;
      if (quotationsData?.length) {
        const quotations = quotationsData.map(item => ({
          id: item.id,
          code: item.code,
          dateCreated: new Date(item.date_created),
          customerId: item.customer_id,
          vehicleId: item.vehicle_id,
          subtotal: item.subtotal || 0,
          tax: item.tax || 0,
          total: item.total || 0,
          notes: item.notes,
          status: item.status || 'new'
        }));
        await this.db.quotations.clear();
        await this.db.quotations.bulkAdd(quotations);
        console.log(`Loaded ${quotations.length} quotations from Supabase`);
      }

      // Load quotation items
      const { data: quotationItemsData, error: quotationItemsError } = await this.client.from('quotation_items').select('*');
      if (quotationItemsError) throw quotationItemsError;
      if (quotationItemsData?.length) {
        const quotationItems = quotationItemsData.map(item => ({
          id: item.id,
          quotationId: item.quotation_id,
          type: item.type,
          itemId: item.item_id,
          name: item.name,
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || 0,
          total: item.total || 0
        }));
        await this.db.quotationItems.clear();
        await this.db.quotationItems.bulkAdd(quotationItems);
        console.log(`Loaded ${quotationItems.length} quotation items from Supabase`);
      }

      // Load repair orders
      const { data: repairOrdersData, error: repairOrdersError } = await this.client.from('repair_orders').select('*');
      if (repairOrdersError) throw repairOrdersError;
      if (repairOrdersData?.length) {
        const repairOrders = repairOrdersData.map(item => ({
          id: item.id,
          code: item.code,
          dateCreated: new Date(item.date_created),
          dateExpected: item.date_expected ? new Date(item.date_expected) : undefined,
          quotationId: item.quotation_id,
          customerId: item.customer_id,
          vehicleId: item.vehicle_id,
          odometer: item.odometer || 0,
          customerRequest: item.customer_request,
          technicianNotes: item.technician_notes,
          technicianId: item.technician_id,
          subtotal: item.subtotal || 0,
          tax: item.tax || 0,
          total: item.total || 0,
          status: item.status || 'new'
        }));
        await this.db.repairOrders.clear();
        await this.db.repairOrders.bulkAdd(repairOrders);
        console.log(`Loaded ${repairOrders.length} repair orders from Supabase`);
      }

      // Load repair order items
      const { data: repairOrderItemsData, error: repairOrderItemsError } = await this.client.from('repair_order_items').select('*');
      if (repairOrderItemsError) throw repairOrderItemsError;
      if (repairOrderItemsData?.length) {
        const repairOrderItems = repairOrderItemsData.map(item => ({
          id: item.id,
          repairOrderId: item.repair_order_id,
          type: item.type,
          itemId: item.item_id,
          name: item.name,
          quantity: item.quantity || 1,
          unitPrice: item.unit_price || 0,
          total: item.total || 0
        }));
        await this.db.repairOrderItems.clear();
        await this.db.repairOrderItems.bulkAdd(repairOrderItems);
        console.log(`Loaded ${repairOrderItems.length} repair order items from Supabase`);
      }

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await this.client.from('invoices').select('*');
      if (invoicesError) throw invoicesError;
      if (invoicesData?.length) {
        const invoices = invoicesData.map(item => ({
          id: item.id,
          code: item.code,
          dateCreated: new Date(item.date_created),
          repairOrderId: item.repair_order_id,
          customerId: item.customer_id,
          vehicleId: item.vehicle_id,
          subtotal: item.subtotal || 0,
          discount: item.discount || 0,
          tax: item.tax || 0,
          total: item.total || 0,
          amountPaid: item.amount_paid || 0,
          paymentMethod: item.payment_method,
          status: item.status || 'unpaid'
        }));
        await this.db.invoices.clear();
        await this.db.invoices.bulkAdd(invoices);
        console.log(`Loaded ${invoices.length} invoices from Supabase`);
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

      // Sync to Supabase in correct order to avoid foreign key constraints
      await this.syncCustomers(customers);
      await this.syncVehicles(vehicles);
      await this.syncInventoryCategories(categories);
      await this.syncInventoryItems(items);
      await this.syncServices(services);
      await this.syncQuotations(quotations);
      await this.syncQuotationItems(quotationItems);
      await this.syncRepairOrders(repairOrders);
      await this.syncRepairOrderItems(repairOrderItems);
      await this.syncInvoices(invoices);

      console.log('All data synced to Supabase successfully');
    } catch (error) {
      console.error('Error syncing data to Supabase:', error);
    }
  }

  private db: any; // Will be set dynamically to avoid circular dependency
}

export const supabaseService = new SupabaseService();