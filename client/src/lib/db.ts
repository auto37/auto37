import Dexie, { Table } from 'dexie';
import { 
  Customer, 
  Vehicle, 
  InventoryCategory, 
  InventoryItem, 
  Service,
  Quotation,
  QuotationItem,
  RepairOrder,
  RepairOrderItem,
  Invoice
} from './types';
// Database wrapper for IndexedDB storage

class GarageDexie extends Dexie {
  customers!: Table<Customer>;
  vehicles!: Table<Vehicle>;
  inventoryCategories!: Table<InventoryCategory>;
  inventoryItems!: Table<InventoryItem>;
  services!: Table<Service>;
  quotations!: Table<Quotation>;
  quotationItems!: Table<QuotationItem>;
  repairOrders!: Table<RepairOrder>;
  repairOrderItems!: Table<RepairOrderItem>;
  invoices!: Table<Invoice>;

  // Sự kiện thay đổi dữ liệu - HOÀN TOÀN TẮT
  triggerDataChange() {
    // KHÔNG làm gì cả để tránh Promise injection
  }

  constructor() {
    super('garageDatabase');
    
    this.version(1).stores({
      customers: '++id, code, name, phone, email',
      vehicles: '++id, code, customerId, licensePlate, brand, model',
      inventoryCategories: '++id, code, name',
      inventoryItems: '++id, sku, name, categoryId, quantity',
      services: '++id, code, name, price',
      quotations: '++id, code, dateCreated, customerId, vehicleId, status',
      quotationItems: '++id, quotationId, type, itemId, name',
      repairOrders: '++id, code, dateCreated, quotationId, customerId, vehicleId, status',
      repairOrderItems: '++id, repairOrderId, type, itemId, name',
      invoices: '++id, code, dateCreated, repairOrderId, customerId, vehicleId, status'
    });
  }

  // Helper functions for generating auto-increment codes
  async generateCustomerCode(): Promise<string> {
    try {
      const count = await this.customers.count();
      const code = `KH${(count + 1).toString().padStart(4, '0')}`;
      return code;
    } catch (error) {
      console.error('Error generating customer code:', error);
      return `KH0001`; // Fallback
    }
  }

  async generateVehicleCode(): Promise<string> {
    try {
      const count = await this.vehicles.count();
      const code = `XE${(count + 1).toString().padStart(4, '0')}`;
      return code;
    } catch (error) {
      console.error('Error generating vehicle code:', error);
      return `XE0001`; // Fallback
    }
  }

  async generateCategoryCode(): Promise<string> {
    const count = await this.inventoryCategories.count();
    return `DM${(count + 1).toString().padStart(3, '0')}`;
  }

  async generateServiceCode(): Promise<string> {
    const count = await this.services.count();
    return `DV${(count + 1).toString().padStart(3, '0')}`;
  }

  async generateQuotationCode(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await this.quotations.count();
    return `BG${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async generateRepairOrderCode(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await this.repairOrders.count();
    return `SC${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async generateInvoiceCode(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await this.invoices.count();
    return `HD${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }

  // Update inventory quantity when repair order is completed
  async updateInventoryQuantities(repairOrderId: number): Promise<void> {
    const items = await this.repairOrderItems
      .where('repairOrderId')
      .equals(repairOrderId)
      .and(item => item.type === 'part')
      .toArray();

    for (const item of items) {
      const inventoryItem = await this.inventoryItems.get(item.itemId);
      if (inventoryItem) {
        const newQuantity = Math.max(0, inventoryItem.quantity - item.quantity);
        await this.inventoryItems.update(item.itemId, { quantity: newQuantity });
      }
    }
  }

  // Add inventory quantity when entering new stock
  async addInventoryQuantity(itemId: number, quantity: number): Promise<void> {
    const item = await this.inventoryItems.get(itemId);
    if (item) {
      await this.inventoryItems.update(itemId, { 
        quantity: item.quantity + quantity 
      });
    }
  }
}

export const db = new GarageDexie();

// DISABLED: All database hooks removed to prevent DataCloneError
// Khách hàng
