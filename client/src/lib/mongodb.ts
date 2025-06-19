// MongoDB Database Service
import { settingsDb, Settings } from './settings';

export interface MongoDBConfig {
  connectionString: string;
  databaseName: string;
  enabled: boolean;
}

class MongoDBService {
  private config: MongoDBConfig | null = null;

  async initialize() {
    const settings = await settingsDb.getSettings();
    if (settings.mongoConnectionString && settings.mongoDatabaseName && settings.mongoEnabled) {
      this.config = {
        connectionString: settings.mongoConnectionString,
        databaseName: settings.mongoDatabaseName,
        enabled: settings.mongoEnabled
      };
      return true;
    }
    return false;
  }

  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      // Test connection using fetch to a MongoDB Atlas Data API endpoint
      const response = await fetch(`${this.config.connectionString}/app/data-api/endpoint/data/v1/action/findOne`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      return false;
    }
  }

  async syncCustomers(customers: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (customers.length > 0) {
        // Replace all customers in MongoDB
        await this.replaceCollection('customers', customers);
      }
    } catch (error) {
      console.error('Error syncing customers to MongoDB:', error);
      throw error;
    }
  }

  async syncVehicles(vehicles: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (vehicles.length > 0) {
        await this.replaceCollection('vehicles', vehicles);
      }
    } catch (error) {
      console.error('Error syncing vehicles to MongoDB:', error);
      throw error;
    }
  }

  async syncInventoryCategories(categories: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (categories.length > 0) {
        await this.replaceCollection('inventory_categories', categories);
      }
    } catch (error) {
      console.error('Error syncing inventory categories to MongoDB:', error);
      throw error;
    }
  }

  async syncInventoryItems(items: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (items.length > 0) {
        await this.replaceCollection('inventory_items', items);
      }
    } catch (error) {
      console.error('Error syncing inventory items to MongoDB:', error);
      throw error;
    }
  }

  async syncServices(services: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (services.length > 0) {
        await this.replaceCollection('services', services);
      }
    } catch (error) {
      console.error('Error syncing services to MongoDB:', error);
      throw error;
    }
  }

  async syncQuotations(quotations: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (quotations.length > 0) {
        await this.replaceCollection('quotations', quotations);
      }
    } catch (error) {
      console.error('Error syncing quotations to MongoDB:', error);
      throw error;
    }
  }

  async syncQuotationItems(items: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (items.length > 0) {
        await this.replaceCollection('quotation_items', items);
      }
    } catch (error) {
      console.error('Error syncing quotation items to MongoDB:', error);
      throw error;
    }
  }

  async syncRepairOrders(repairOrders: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (repairOrders.length > 0) {
        await this.replaceCollection('repair_orders', repairOrders);
      }
    } catch (error) {
      console.error('Error syncing repair orders to MongoDB:', error);
      throw error;
    }
  }

  async syncRepairOrderItems(items: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (items.length > 0) {
        await this.replaceCollection('repair_order_items', items);
      }
    } catch (error) {
      console.error('Error syncing repair order items to MongoDB:', error);
      throw error;
    }
  }

  async syncInvoices(invoices: any[]) {
    if (!this.config || !this.isEnabled()) return;

    try {
      if (invoices.length > 0) {
        await this.replaceCollection('invoices', invoices);
      }
    } catch (error) {
      console.error('Error syncing invoices to MongoDB:', error);
      throw error;
    }
  }

  private async replaceCollection(collectionName: string, data: any[]) {
    if (!this.config) throw new Error('MongoDB not configured');

    // First, delete all existing documents
    await fetch(`${this.config.connectionString}/app/data-api/endpoint/data/v1/action/deleteMany`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataSource: 'Cluster0',
        database: this.config.databaseName,
        collection: collectionName,
        filter: {}
      })
    });

    // Then insert new data
    if (data.length > 0) {
      const response = await fetch(`${this.config.connectionString}/app/data-api/endpoint/data/v1/action/insertMany`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataSource: 'Cluster0',
          database: this.config.databaseName,
          collection: collectionName,
          documents: data
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync ${collectionName} to MongoDB`);
      }
    }
  }

  async loadFromMongoDB() {
    if (!this.config || !this.isEnabled()) return;

    try {
      console.log('Starting data load from MongoDB...');
      
      // Import db here to avoid circular dependency
      const { db } = await import('./db');

      // Load all collections from MongoDB
      const collections = [
        'customers', 'vehicles', 'inventory_categories', 'inventory_items', 
        'services', 'quotations', 'quotation_items', 'repair_orders', 
        'repair_order_items', 'invoices'
      ];

      for (const collectionName of collections) {
        const response = await fetch(`${this.config.connectionString}/app/data-api/endpoint/data/v1/action/find`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dataSource: 'Cluster0',
            database: this.config.databaseName,
            collection: collectionName,
            filter: {}
          })
        });

        if (response.ok) {
          const result = await response.json();
          const documents = result.documents || [];

          if (documents.length > 0) {
            // Clear local collection and add MongoDB data
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
                await db.quotations.bulkAdd(documents.map(q => ({
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
                await db.repairOrders.bulkAdd(documents.map(r => ({
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
                await db.invoices.bulkAdd(documents.map(i => ({
                  ...i,
                  dateCreated: new Date(i.dateCreated)
                })));
                console.log(`Loaded ${documents.length} invoices from MongoDB`);
                break;
            }
          }
        }
      }

      console.log('Data loaded from MongoDB successfully');
    } catch (error) {
      console.error('Error loading data from MongoDB:', error);
      throw error;
    }
  }

  async syncAllData() {
    if (!this.config || !this.isEnabled()) return;

    try {
      // Import db here to avoid circular dependency
      const { db } = await import('./db');

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

      // Sync data to MongoDB in correct order
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

      console.log('All data synced to MongoDB successfully');
    } catch (error) {
      console.error('Error syncing data to MongoDB:', error);
      throw error;
    }
  }
}

export const mongoDBService = new MongoDBService();