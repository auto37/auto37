import { mongoDBService } from './mongodb';
import { settingsDb } from './settings';
import { db } from './db';

class AutoSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      const settings = await settingsDb.getSettings();
      
      if (settings.mongoEnabled && settings.mongoConnectionString && settings.mongoDatabaseName) {
        await mongoDBService.initialize();
        
        // Initial sync when app starts
        await this.performInitialSync();
        
        // Set up periodic sync every 5 minutes
        this.setupPeriodicSync();
        
        console.log('AutoSync initialized successfully');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AutoSync:', error);
    }
  }

  private async performInitialSync() {
    try {
      // Check if local database is empty (new device/browser)
      const customerCount = await db.customers.count();
      const vehicleCount = await db.vehicles.count();
      const inventoryCount = await db.inventoryItems.count();
      
      const isLocalDatabaseEmpty = customerCount === 0 && vehicleCount === 0 && inventoryCount === 0;
      
      if (isLocalDatabaseEmpty) {
        // New device/browser - load data from MongoDB first
        console.log('Empty local database detected, loading from MongoDB...');
        await mongoDBService.loadFromMongoDB();
        console.log('Initial data loaded from MongoDB');
      } else {
        // Existing data - sync local changes to MongoDB
        console.log('Local data found, syncing to MongoDB...');
        await mongoDBService.syncAllData();
        console.log('Local data synced to MongoDB');
      }
      
      // Update last sync time
      await settingsDb.updateSettings({
        lastSyncTime: new Date()
      });
    } catch (error) {
      console.error('Initial sync failed:', error);
    }
  }

  private setupPeriodicSync() {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set up sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      await this.performPeriodicSync();
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async performPeriodicSync() {
    try {
      const settings = await settingsDb.getSettings();
      
      if (!settings.mongoEnabled) {
        this.stopPeriodicSync();
        return;
      }

      await mongoDBService.syncAllData();
      await settingsDb.updateSettings({
        lastSyncTime: new Date()
      });
      
      console.log('Periodic sync completed');
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }

  async syncOnDataChange() {
    try {
      const settings = await settingsDb.getSettings();
      
      if (settings.mongoEnabled && mongoDBService.isEnabled()) {
        await mongoDBService.syncAllData();
        await settingsDb.updateSettings({
          lastSyncTime: new Date()
        });
      }
    } catch (error) {
      console.error('Data change sync failed:', error);
    }
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async reconfigure() {
    this.isInitialized = false;
    this.stopPeriodicSync();
    await this.initialize();
  }
}

export const autoSyncService = new AutoSyncService();

// Hook into database changes for automatic sync
export function setupDatabaseChangeSync() {
  // Listen for changes in the database and trigger sync
  db.customers.hook('creating', () => autoSyncService.syncOnDataChange());
  db.customers.hook('updating', () => autoSyncService.syncOnDataChange());
  db.customers.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.vehicles.hook('creating', () => autoSyncService.syncOnDataChange());
  db.vehicles.hook('updating', () => autoSyncService.syncOnDataChange());
  db.vehicles.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.inventoryCategories.hook('creating', () => autoSyncService.syncOnDataChange());
  db.inventoryCategories.hook('updating', () => autoSyncService.syncOnDataChange());
  db.inventoryCategories.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.inventoryItems.hook('creating', () => autoSyncService.syncOnDataChange());
  db.inventoryItems.hook('updating', () => autoSyncService.syncOnDataChange());
  db.inventoryItems.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.services.hook('creating', () => autoSyncService.syncOnDataChange());
  db.services.hook('updating', () => autoSyncService.syncOnDataChange());
  db.services.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.quotations.hook('creating', () => autoSyncService.syncOnDataChange());
  db.quotations.hook('updating', () => autoSyncService.syncOnDataChange());
  db.quotations.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.quotationItems.hook('creating', () => autoSyncService.syncOnDataChange());
  db.quotationItems.hook('updating', () => autoSyncService.syncOnDataChange());
  db.quotationItems.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.repairOrders.hook('creating', () => autoSyncService.syncOnDataChange());
  db.repairOrders.hook('updating', () => autoSyncService.syncOnDataChange());
  db.repairOrders.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.repairOrderItems.hook('creating', () => autoSyncService.syncOnDataChange());
  db.repairOrderItems.hook('updating', () => autoSyncService.syncOnDataChange());
  db.repairOrderItems.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.invoices.hook('creating', () => autoSyncService.syncOnDataChange());
  db.invoices.hook('updating', () => autoSyncService.syncOnDataChange());
  db.invoices.hook('deleting', () => autoSyncService.syncOnDataChange());
}