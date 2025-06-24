import { initializeApp, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
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
          storageBucket: `${this.config.projectId}.firebasestorage.app`,
          messagingSenderId: "886259199861",
          appId: "1:886259199861:web:d8b988f2effbfa0517ad3c",
          measurementId: "G-YD8M01XCRV"
        };

        // Check if app already exists to avoid duplicate app error
        let app;
        try {
          app = getApp();
        } catch (error) {
          app = initializeApp(firebaseConfig);
        }
        
        this.app = app;
        this.firestore = getFirestore(this.app);
        console.log('Firebase initialized successfully with config:', { projectId: this.config.projectId, apiKey: this.config.apiKey?.substring(0, 10) + '...' });
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled === true && this.firestore !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.firestore) {
      throw new Error('Firebase chưa được khởi tạo. Vui lòng kiểm tra cấu hình.');
    }
    
    try {
      console.log('Testing Firebase connection with read-only test...');
      
      // First try a simple read operation to test basic connectivity
      const testCollection = collection(this.firestore, 'test_connection');
      const snapshot = await getDocs(testCollection);
      console.log('Read test successful, database is accessible');
      
      // Try a simple write test with timeout
      console.log('Testing write permissions...');
      const testDoc = doc(testCollection, 'connection_test');
      
      const writePromise = setDoc(testDoc, { 
        timestamp: new Date().toISOString(),
        test: true 
      });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );
      
      await Promise.race([writePromise, timeoutPromise]);
      console.log('Write test successful');
      
      // Clean up
      try {
        await deleteDoc(testDoc);
        console.log('Cleanup successful');
      } catch (cleanupError) {
        console.warn('Cleanup failed, but connection is working:', cleanupError);
      }
      
      return true;
    } catch (error: any) {
      console.error('Firebase connection test failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Check for specific error patterns
      if (error.message === 'Connection timeout') {
        throw new Error('Kết nối Firebase bị timeout. Kiểm tra firewall hoặc network settings.');
      } else if (error.code === 'permission-denied') {
        throw new Error('Lỗi quyền truy cập: Kiểm tra Firestore Database Rules. Đảm bảo database ở test mode.');
      } else if (error.code === 'not-found') {
        throw new Error('Project không tồn tại. Kiểm tra Project ID: ' + this.config?.projectId);
      } else if (error.code === 'invalid-argument' || error.code === 'invalid-api-key') {
        throw new Error('API Key không hợp lệ hoặc đã hết hạn.');
      } else if (error.code === 'unavailable') {
        throw new Error('Firestore service tạm thời không khả dụng. Thử lại sau.');
      } else if (error.message?.includes('transport')) {
        throw new Error('Lỗi network connection. Kiểm tra internet hoặc firewall settings.');
      }
      
      throw new Error(`Lỗi kết nối Firebase: ${error.message || 'Unknown error'}`);
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
      // Clear all local data first
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

      // Load customers
      try {
        const customersSnapshot = await getDocs(collection(this.firestore, 'customers'));
        const customers = customersSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (customers.length > 0) {
          await db.customers.bulkAdd(customers as any);
          console.log(`Loaded ${customers.length} customers`);
        }
      } catch (error) {
        console.warn('Error loading customers:', error);
      }

      // Load vehicles  
      try {
        const vehiclesSnapshot = await getDocs(collection(this.firestore, 'vehicles'));
        const vehicles = vehiclesSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (vehicles.length > 0) {
          await db.vehicles.bulkAdd(vehicles as any);
          console.log(`Loaded ${vehicles.length} vehicles`);
        }
      } catch (error) {
        console.warn('Error loading vehicles:', error);
      }

      // Load inventory categories
      try {
        const categoriesSnapshot = await getDocs(collection(this.firestore, 'inventory_categories'));
        const categories = categoriesSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (categories.length > 0) {
          await db.inventoryCategories.bulkAdd(categories as any);
          console.log(`Loaded ${categories.length} inventory categories`);
        }
      } catch (error) {
        console.warn('Error loading inventory categories:', error);
      }

      // Load inventory items
      try {
        const itemsSnapshot = await getDocs(collection(this.firestore, 'inventory_items'));
        const items = itemsSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (items.length > 0) {
          for (const item of items) {
            await db.inventoryItems.add(item as any);
          }
          console.log(`Loaded ${items.length} inventory items`);
        }
      } catch (error) {
        console.warn('Error loading inventory items:', error);
      }



      // Load services
      try {
        const servicesSnapshot = await getDocs(collection(this.firestore, 'services'));
        const services = servicesSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (services.length > 0) {
          await db.services.bulkAdd(services as any);
          console.log(`Loaded ${services.length} services`);
        }
      } catch (error) {
        console.warn('Error loading services:', error);
      }

      // Load quotations
      try {
        const quotationsSnapshot = await getDocs(collection(this.firestore, 'quotations'));
        const quotations = quotationsSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (quotations.length > 0) {
          await db.quotations.bulkAdd(quotations as any);
          console.log(`Loaded ${quotations.length} quotations`);
        }
      } catch (error) {
        console.warn('Error loading quotations:', error);
      }

      // Load quotation items
      try {
        const quotationItemsSnapshot = await getDocs(collection(this.firestore, 'quotation_items'));
        const quotationItems = quotationItemsSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (quotationItems.length > 0) {
          await db.quotationItems.bulkAdd(quotationItems as any);
          console.log(`Loaded ${quotationItems.length} quotation items`);
        }
      } catch (error) {
        console.warn('Error loading quotation items:', error);
      }

      // Load repair orders
      try {
        const repairOrdersSnapshot = await getDocs(collection(this.firestore, 'repair_orders'));
        const repairOrders = repairOrdersSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (repairOrders.length > 0) {
          await db.repairOrders.bulkAdd(repairOrders as any);
          console.log(`Loaded ${repairOrders.length} repair orders`);
        }
      } catch (error) {
        console.warn('Error loading repair orders:', error);
      }

      // Load repair order items
      try {
        const repairOrderItemsSnapshot = await getDocs(collection(this.firestore, 'repair_order_items'));
        const repairOrderItems = repairOrderItemsSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (repairOrderItems.length > 0) {
          await db.repairOrderItems.bulkAdd(repairOrderItems as any);
          console.log(`Loaded ${repairOrderItems.length} repair order items`);
        }
      } catch (error) {
        console.warn('Error loading repair order items:', error);
      }

      // Load invoices
      try {
        const invoicesSnapshot = await getDocs(collection(this.firestore, 'invoices'));
        const invoices = invoicesSnapshot.docs.map(doc => ({ ...doc.data(), id: parseInt(doc.id) }));
        if (invoices.length > 0) {
          await db.invoices.bulkAdd(invoices as any);
          console.log(`Loaded ${invoices.length} invoices`);
        }
      } catch (error) {
        console.warn('Error loading invoices:', error);
      }

      console.log('Data loaded from Firebase successfully');
    } catch (error) {
      console.error('Failed to load data from Firebase:', error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();