import { firebaseService } from './firebase';
import { settingsDb } from './settings';
import { db } from './db';

class AutoSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      await firebaseService.initialize();
      
      // Auto-sync disabled to reduce console noise
      // Use manual sync in Settings when needed
      
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
        // New device - try to load data from Firebase
        console.log('Empty local database detected, attempting to load from Firebase...');
        await firebaseService.loadFromFirebase();
      } else {
        // Existing data - sync to Firebase
        console.log('Local data found, syncing to Firebase...');
        await firebaseService.syncAllData();
        console.log('Local data synced to Firebase');
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
      if (settings.firebaseEnabled) {
        await firebaseService.syncAllData();
        console.log('Periodic sync completed');
      }
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }

  async syncOnDataChange() {
    try {
      const settings = await settingsDb.getSettings();
      if (settings.firebaseEnabled) {
        await firebaseService.syncAllData();
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