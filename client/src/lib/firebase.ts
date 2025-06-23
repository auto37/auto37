import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, writeBatch, connectFirestoreEmulator } from 'firebase/firestore';
import { settingsDb } from './settings';
import { db } from './db';

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  enabled: boolean;
}

class FirebaseService {
  private config: FirebaseConfig | null = null;
  private firestore: any = null;
  private app: any = null;

  async initialize() {
    try {
      const settings = await settingsDb.getSettings();
      
      if (!settings.firebaseApiKey || !settings.firebaseProjectId) {
        console.warn('Firebase configuration not found');
        return;
      }

      this.config = {
        apiKey: settings.firebaseApiKey,
        projectId: settings.firebaseProjectId,
        enabled: settings.firebaseEnabled || false
      };

      if (this.config.enabled) {
        const firebaseConfig = {
          apiKey: this.config.apiKey,
          authDomain: `${this.config.projectId}.firebaseapp.com`,
          projectId: this.config.projectId,
          storageBucket: `${this.config.projectId}.appspot.com`,
          messagingSenderId: "123456789",
          appId: "1:123456789:web:abcdef123456"
        };

        this.app = initializeApp(firebaseConfig);
        this.firestore = getFirestore(this.app);
        console.log('Firebase initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled === true && this.firestore !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.firestore) return false;
    
    try {
      // Try to read from a test collection
      await getDocs(collection(this.firestore, 'test'));
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      return false;
    }
  }

  private async clearAndSyncCollection(collectionName: string, data: any[]): Promise<void> {
    if (!this.firestore || !data.length) return;
    
    try {
      // Get reference to collection
      const collectionRef = collection(this.firestore, collectionName);
      
      // Delete all existing documents
      const querySnapshot = await getDocs(collectionRef);
      const batch = writeBatch(this.firestore);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Add new documents
      data.forEach((item) => {
        const docRef = doc(collectionRef, item.id?.toString() || doc(collectionRef).id);
        batch.set(docRef, {
          ...item,
          updatedAt: new Date(),
          syncedAt: new Date()
        });
      });
      
      await batch.commit();
      console.log(`Synced ${data.length} records to ${collectionName}`);
    } catch (error) {
      console.error(`Failed to sync ${collectionName}:`, error);
      throw error;
    }
  }

  async syncAllData(): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('Firebase sync is not enabled');
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

      // Sync each collection
      await this.clearAndSyncCollection('customers', customers);
      await this.clearAndSyncCollection('vehicles', vehicles);
      await this.clearAndSyncCollection('inventory_categories', inventoryCategories);
      await this.clearAndSyncCollection('inventory_items', inventoryItems);
      await this.clearAndSyncCollection('services', services);
      await this.clearAndSyncCollection('quotations', quotations);
      await this.clearAndSyncCollection('quotation_items', quotationItems);
      await this.clearAndSyncCollection('repair_orders', repairOrders);
      await this.clearAndSyncCollection('repair_order_items', repairOrderItems);
      await this.clearAndSyncCollection('invoices', invoices);

      console.log('Data sync to Firebase completed successfully');
    } catch (error) {
      console.error('Failed to sync data to Firebase:', error);
      throw error;
    }
  }

  async loadFromFirebase(): Promise<void> {
    if (!this.isEnabled() || !this.firestore) {
      throw new Error('Firebase is not enabled or configured');
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

      // Load data from Firebase
      const collections = [
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

      for (const coll of collections) {
        try {
          const querySnapshot = await getDocs(collection(this.firestore, coll.name));
          const data = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: parseInt(doc.id) || doc.data().id
          }));
          
          if (data.length > 0) {
            await coll.dbTable.bulkAdd(data as any);
            console.log(`Loaded ${data.length} records from ${coll.name}`);
          }
        } catch (error) {
          console.warn(`Error loading ${coll.name}:`, error);
        }
      }

      console.log('Data loaded from Firebase successfully');
    } catch (error) {
      console.error('Failed to load data from Firebase:', error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();