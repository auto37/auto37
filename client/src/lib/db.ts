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
import { supabaseCustomerService } from './supabase-services/customers';
import { supabase } from './supabase';

// Kiểm tra xem có kết nối Supabase hay không
const USE_SUPABASE = true; // Mặc định sử dụng Supabase

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

  // Sự kiện thay đổi dữ liệu
  triggerDataChange() {
    // Phát sự kiện thay đổi dữ liệu để đồng bộ với Supabase
    window.dispatchEvent(new CustomEvent('data-changed'));
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
    if (USE_SUPABASE) {
      try {
        return await supabaseCustomerService.generateCustomerCode();
      } catch (error) {
        console.error('Lỗi khi tạo mã khách hàng từ Supabase:', error);
        console.log('Fallback sang IndexedDB...');
      }
    }
    
    // Fallback về IndexedDB
    const count = await this.customers.count();
    return `KH${(count + 1).toString().padStart(4, '0')}`;
  }

  async generateVehicleCode(): Promise<string> {
    const count = await this.vehicles.count();
    return `XE${(count + 1).toString().padStart(4, '0')}`;
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

// Hook vào sự kiện thêm, sửa, xóa để kích hoạt đồng bộ dữ liệu
// Khách hàng
db.customers.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.customers.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.customers.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Xe
db.vehicles.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.vehicles.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.vehicles.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Danh mục kho
db.inventoryCategories.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.inventoryCategories.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.inventoryCategories.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Vật tư phụ tùng
db.inventoryItems.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.inventoryItems.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.inventoryItems.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Dịch vụ
db.services.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.services.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.services.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Báo giá
db.quotations.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.quotations.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.quotations.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Chi tiết báo giá
db.quotationItems.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.quotationItems.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.quotationItems.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Lệnh sửa chữa
db.repairOrders.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.repairOrders.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.repairOrders.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Chi tiết lệnh sửa chữa
db.repairOrderItems.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.repairOrderItems.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.repairOrderItems.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Hóa đơn
db.invoices.hook('creating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.invoices.hook('updating', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});
db.invoices.hook('deleting', function() {
  this.onsuccess = function() {
    db.triggerDataChange();
  };
});

// Initialize some sample data for development if needed
const initializeData = async () => {
  const categoryCount = await db.inventoryCategories.count();
  
  if (categoryCount === 0) {
    console.log('Initializing sample categories...');
    
    // Add some basic inventory categories
    await db.inventoryCategories.bulkAdd([
      { code: 'DM001', name: 'Phụ tùng gầm' },
      { code: 'DM002', name: 'Phụ tùng máy' },
      { code: 'DM003', name: 'Dầu nhớt' },
      { code: 'DM004', name: 'Lọc gió, lọc dầu' },
      { code: 'DM005', name: 'Vật tư tiêu hao' }
    ]);
  }

  const serviceCount = await db.services.count();
  
  if (serviceCount === 0) {
    console.log('Initializing sample services...');
    
    // Add some basic services
    await db.services.bulkAdd([
      { 
        code: 'DV001', 
        name: 'Thay dầu máy', 
        description: 'Thay dầu động cơ và lọc dầu', 
        price: 300000, 
        estimatedTime: 30 
      },
      { 
        code: 'DV002', 
        name: 'Bảo dưỡng cấp 1', 
        description: 'Kiểm tra tổng thể, thay dầu, lọc dầu, vệ sinh lọc gió', 
        price: 850000, 
        estimatedTime: 120 
      },
      { 
        code: 'DV003', 
        name: 'Vệ sinh dàn lạnh', 
        description: 'Tháo vệ sinh dàn lạnh, thay lọc gió điều hòa', 
        price: 500000, 
        estimatedTime: 90 
      },
      { 
        code: 'DV004', 
        name: 'Chuẩn đoán lỗi', 
        description: 'Kiểm tra, chuẩn đoán lỗi hệ thống điện và điện tử', 
        price: 200000, 
        estimatedTime: 60 
      },
      { 
        code: 'DV005', 
        name: 'Kiểm tra tổng quát', 
        description: 'Kiểm tra toàn diện xe', 
        price: 150000, 
        estimatedTime: 45 
      }
    ]);
  }
};

// Only initialize for development if needed
initializeData().catch(error => console.error('Error initializing data:', error));

export default db;
