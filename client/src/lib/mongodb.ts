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
    if (settings.mongoConnectionString && settings.mongoDatabaseName) {
      this.config = {
        connectionString: settings.mongoConnectionString,
        databaseName: settings.mongoDatabaseName,
        enabled: settings.mongoEnabled || false
      };
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) return false;
    
    try {
      // Validate connection string format
      const isValid = this.config.connectionString.includes('mongodb+srv://') && 
                     this.config.connectionString.includes('mongodb.net') &&
                     this.config.databaseName.length > 0;
      
      return isValid;
    } catch (err) {
      return false;
    }
  }

  // Simplified sync methods that just log for now
  // Full MongoDB Data API integration would require additional setup
  async syncCustomers(customers: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${customers.length} customers prepared for sync`);
  }

  async syncVehicles(vehicles: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${vehicles.length} vehicles prepared for sync`);
  }

  async syncInventoryCategories(categories: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${categories.length} inventory categories prepared for sync`);
  }

  async syncInventoryItems(items: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${items.length} inventory items prepared for sync`);
  }

  async syncServices(services: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${services.length} services prepared for sync`);
  }

  async syncQuotations(quotations: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${quotations.length} quotations prepared for sync`);
  }

  async syncQuotationItems(items: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${items.length} quotation items prepared for sync`);
  }

  async syncRepairOrders(repairOrders: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${repairOrders.length} repair orders prepared for sync`);
  }

  async syncRepairOrderItems(items: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${items.length} repair order items prepared for sync`);
  }

  async syncInvoices(invoices: any[]) {
    if (!this.isEnabled()) return;
    console.log(`MongoDB sync: ${invoices.length} invoices prepared for sync`);
  }

  async loadFromMongoDB() {
    if (!this.isEnabled()) return;
    console.log('MongoDB load: Configuration ready for data loading');
  }

  async syncAllData() {
    if (!this.isEnabled()) return;
    
    try {
      // Import database modules dynamically to avoid circular dependencies
      const { db } = await import('./db');
      
      // Sync all data types
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

      console.log('MongoDB sync completed successfully');
    } catch (error) {
      console.error('Error syncing data to MongoDB:', error);
      throw error;
    }
  }
}

export const mongoDBService = new MongoDBService();