// MongoDB Database Service with Real Data API Integration
import { settingsDb } from './settings';

export interface MongoDBConfig {
  connectionString: string;
  databaseName: string;
  enabled: boolean;
  dataApiUrl: string;
  apiKey: string;
}

class MongoDBService {
  private config: MongoDBConfig | null = null;

  async initialize() {
    const settings = await settingsDb.getSettings();
    if (settings.mongoDataApiUrl && settings.mongoApiKey && settings.mongoDatabaseName) {
      this.config = {
        connectionString: settings.mongoConnectionString || '',
        databaseName: settings.mongoDatabaseName,
        enabled: settings.mongoEnabled || false,
        dataApiUrl: settings.mongoDataApiUrl,
        apiKey: settings.mongoApiKey
      };
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config || !this.config.dataApiUrl || !this.config.apiKey) return false;
    
    try {
      const response = await fetch(`${this.config.dataApiUrl}/action/findOne`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify({
          dataSource: 'Cluster0',
          database: this.config.databaseName,
          collection: 'test',
          filter: {}
        })
      });
      
      return response.ok;
    } catch (err) {
      console.error('MongoDB connection test failed:', err);
      return false;
    }
  }

  private async replaceCollection(collectionName: string, documents: any[]): Promise<void> {
    if (!this.config) throw new Error('MongoDB not configured');

    // Delete all existing documents
    await fetch(`${this.config.dataApiUrl}/action/deleteMany`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey
      },
      body: JSON.stringify({
        dataSource: 'Cluster0',
        database: this.config.databaseName,
        collection: collectionName,
        filter: {}
      })
    });

    // Insert new documents if any
    if (documents.length > 0) {
      await fetch(`${this.config.dataApiUrl}/action/insertMany`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey
        },
        body: JSON.stringify({
          dataSource: 'Cluster0',
          database: this.config.databaseName,
          collection: collectionName,
          documents: documents
        })
      });
    }
  }

  private async getCollection(collectionName: string): Promise<any[]> {
    if (!this.config) throw new Error('MongoDB not configured');

    const response = await fetch(`${this.config.dataApiUrl}/action/find`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.apiKey
      },
      body: JSON.stringify({
        dataSource: 'Cluster0',
        database: this.config.databaseName,
        collection: collectionName,
        filter: {}
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${collectionName}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.documents || [];
  }

  async syncCustomers(customers: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('customers', customers);
  }

  async syncVehicles(vehicles: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('vehicles', vehicles);
  }

  async syncInventoryCategories(categories: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('inventory_categories', categories);
  }

  async syncInventoryItems(items: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('inventory_items', items);
  }

  async syncServices(services: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('services', services);
  }

  async syncQuotations(quotations: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('quotations', quotations);
  }

  async syncQuotationItems(items: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('quotation_items', items);
  }

  async syncRepairOrders(repairOrders: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('repair_orders', repairOrders);
  }

  async syncRepairOrderItems(items: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('repair_order_items', items);
  }

  async syncInvoices(invoices: any[]) {
    if (!this.isEnabled()) return;
    await this.replaceCollection('invoices', invoices);
  }

  async loadFromMongoDB() {
    if (!this.isEnabled()) return;
    
    const { db } = await import('./db');
    
    try {
      console.log('Starting data load from MongoDB...');
      
      // Load all collections from MongoDB
      const collections = [
        'customers', 'vehicles', 'inventory_categories', 'inventory_items',
        'services', 'quotations', 'quotation_items', 'repair_orders', 'repair_order_items', 'invoices'
      ];

      for (const collectionName of collections) {
        try {
          const documents = await this.getCollection(collectionName);
          
          if (documents.length === 0) continue;

          switch (collectionName) {
            case 'customers':
              await db.customers.clear();
              await db.customers.bulkAdd(documents);
              console.log(`Loaded ${documents.length} customers from MongoDB`);
              break;
            case 'vehicles':
              await db.vehicles.clear();
              await db.vehicles.bulkAdd(documents);
              console.log(`Loaded ${documents.length} vehicles from MongoDB`);
              break;
            case 'inventory_categories':
              await db.inventoryCategories.clear();
              await db.inventoryCategories.bulkAdd(documents);
              console.log(`Loaded ${documents.length} inventory categories from MongoDB`);
              break;
            case 'inventory_items':
              await db.inventoryItems.clear();
              await db.inventoryItems.bulkAdd(documents);
              console.log(`Loaded ${documents.length} inventory items from MongoDB`);
              break;
            case 'services':
              await db.services.clear();
              await db.services.bulkAdd(documents);
              console.log(`Loaded ${documents.length} services from MongoDB`);
              break;
            case 'quotations':
              await db.quotations.clear();
              await db.quotations.bulkAdd(documents.map((q: any) => ({
                ...q,
                dateCreated: new Date(q.dateCreated)
              })));
              console.log(`Loaded ${documents.length} quotations from MongoDB`);
              break;
            case 'quotation_items':
              await db.quotationItems.clear();
              await db.quotationItems.bulkAdd(documents);
              console.log(`Loaded ${documents.length} quotation items from MongoDB`);
              break;
            case 'repair_orders':
              await db.repairOrders.clear();
              await db.repairOrders.bulkAdd(documents.map((r: any) => ({
                ...r,
                dateCreated: new Date(r.dateCreated),
                dateExpected: r.dateExpected ? new Date(r.dateExpected) : undefined
              })));
              console.log(`Loaded ${documents.length} repair orders from MongoDB`);
              break;
            case 'repair_order_items':
              await db.repairOrderItems.clear();
              await db.repairOrderItems.bulkAdd(documents);
              console.log(`Loaded ${documents.length} repair order items from MongoDB`);
              break;
            case 'invoices':
              await db.invoices.clear();
              await db.invoices.bulkAdd(documents.map((i: any) => ({
                ...i,
                dateCreated: new Date(i.dateCreated)
              })));
              console.log(`Loaded ${documents.length} invoices from MongoDB`);
              break;
          }
        } catch (error) {
          console.error(`Error loading ${collectionName}:`, error);
        }
      }

      console.log('Data loading from MongoDB completed');
      
      // Trigger data change event to update UI
      db.triggerDataChange();
      
    } catch (error) {
      console.error('Error loading from MongoDB:', error);
      throw error;
    }
  }

  async syncAllData() {
    if (!this.isEnabled()) return;
    
    try {
      const { db } = await import('./db');
      
      console.log('Starting data sync to MongoDB...');
      
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

      // Sync all data types to MongoDB
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

      // Update last sync time
      const currentSettings = await settingsDb.getSettings();
      await settingsDb.updateSettings({
        ...currentSettings,
        lastSyncTime: new Date()
      });

      console.log('Data sync to MongoDB completed successfully');
    } catch (error) {
      console.error('Error syncing data to MongoDB:', error);
      throw error;
    }
  }
}

export const mongoDBService = new MongoDBService();