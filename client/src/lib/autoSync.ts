import { googleSheetsService } from './googlesheets';
import { settingsDb } from './settings';
import { db } from './db';

class AutoSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      const settings = await settingsDb.getSettings();
      
      if (settings.googleSheetsEnabled && settings.googleSheetsId && settings.googleSheetsApiKey) {
        await googleSheetsService.initialize();
        
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
        // New device - try to load data from Google Sheets
        console.log('Empty local database detected, attempting to load from Google Sheets...');
        await googleSheetsService.loadFromGoogleSheets();
      } else {
        // Existing data - sync to Google Sheets
        console.log('Local data found, syncing to Google Sheets...');
        await googleSheetsService.syncAllData();
        console.log('Local data synced to Google Sheets');
      }
    } catch (error) {
      console.error('Initial sync failed:', error);
    }
  }

  private setupPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      await this.performPeriodicSync();
    }, 5 * 60 * 1000);
  }

  private async performPeriodicSync() {
    try {
      const settings = await settingsDb.getSettings();
      if (settings.googleSheetsEnabled) {
        await googleSheetsService.syncAllData();
        console.log('Periodic sync completed');
      }
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }

  async syncOnDataChange() {
    try {
      const settings = await settingsDb.getSettings();
      if (settings.googleSheetsEnabled) {
        await googleSheetsService.syncAllData();
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
    this.stopPeriodicSync();
    this.isInitialized = false;
    await this.initialize();
  }
}

export const autoSyncService = new AutoSyncService();

// Initialize auto-sync when the module loads
autoSyncService.initialize();

export function setupDatabaseChangeSync() {
  // Listen for data changes and trigger sync
  db.customers.hook('creating', () => autoSyncService.syncOnDataChange());
  db.customers.hook('updating', () => autoSyncService.syncOnDataChange());
  db.customers.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.vehicles.hook('creating', () => autoSyncService.syncOnDataChange());
  db.vehicles.hook('updating', () => autoSyncService.syncOnDataChange());
  db.vehicles.hook('deleting', () => autoSyncService.syncOnDataChange());
  
  db.inventoryItems.hook('creating', () => autoSyncService.syncOnDataChange());
  db.inventoryItems.hook('updating', () => autoSyncService.syncOnDataChange());
  db.inventoryItems.hook('deleting', () => autoSyncService.syncOnDataChange());
}