import { db } from './db';
import { supabase } from './supabase';
import { settingsDb } from './settings';
import type { 
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

type TableName = 'customers' | 'vehicles' | 'inventory_categories' | 'inventory_items' 
  | 'services' | 'quotations' | 'quotation_items' | 'repair_orders' | 'repair_order_items' | 'invoices';

// Chuyển đổi kiểu dữ liệu từ local sang supabase format
const mapToSupabaseFormat = {
  customers: (customer: Customer) => ({
    id: customer.id,
    code: customer.code,
    name: customer.name,
    phone: customer.phone,
    address: customer.address || null,
    email: customer.email || null,
    tax_code: customer.taxCode || null,
    notes: customer.notes || null
  }),
  
  vehicles: (vehicle: Vehicle) => ({
    id: vehicle.id,
    code: vehicle.code,
    customer_id: vehicle.customerId,
    license_plate: vehicle.licensePlate,
    brand: vehicle.brand,
    model: vehicle.model,
    vin: vehicle.vin || null,
    year: vehicle.year || null,
    color: vehicle.color || null,
    last_odometer: vehicle.lastOdometer
  }),
  
  inventory_categories: (category: InventoryCategory) => ({
    id: category.id,
    code: category.code,
    name: category.name
  }),
  
  inventory_items: (item: InventoryItem) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    category_id: item.categoryId,
    unit: item.unit,
    quantity: item.quantity,
    cost_price: item.costPrice,
    selling_price: item.sellingPrice,
    supplier: item.supplier || null,
    location: item.location || null,
    min_quantity: item.minQuantity || null,
    notes: item.notes || null
  }),
  
  services: (service: Service) => ({
    id: service.id,
    code: service.code,
    name: service.name,
    description: service.description || null,
    price: service.price,
    estimated_time: service.estimatedTime || null
  }),
  
  quotations: (quotation: Quotation) => ({
    id: quotation.id,
    code: quotation.code,
    date_created: quotation.dateCreated.toISOString(),
    customer_id: quotation.customerId,
    vehicle_id: quotation.vehicleId,
    subtotal: quotation.subtotal,
    tax: quotation.tax || null,
    total: quotation.total,
    notes: quotation.notes || null,
    status: quotation.status
  }),
  
  quotation_items: (item: QuotationItem) => ({
    id: item.id,
    quotation_id: item.quotationId,
    type: item.type,
    item_id: item.itemId,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.total
  }),
  
  repair_orders: (order: RepairOrder) => ({
    id: order.id,
    code: order.code,
    date_created: order.dateCreated.toISOString(),
    date_expected: order.dateExpected ? order.dateExpected.toISOString() : null,
    quotation_id: order.quotationId || null,
    customer_id: order.customerId,
    vehicle_id: order.vehicleId,
    odometer: order.odometer,
    customer_request: order.customerRequest || null,
    technician_notes: order.technicianNotes || null,
    technician_id: order.technicianId || null,
    subtotal: order.subtotal,
    tax: order.tax || null,
    total: order.total,
    status: order.status
  }),
  
  repair_order_items: (item: RepairOrderItem) => ({
    id: item.id,
    repair_order_id: item.repairOrderId,
    type: item.type,
    item_id: item.itemId,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.total
  }),
  
  invoices: (invoice: Invoice) => ({
    id: invoice.id,
    code: invoice.code,
    date_created: invoice.dateCreated.toISOString(),
    repair_order_id: invoice.repairOrderId,
    customer_id: invoice.customerId,
    vehicle_id: invoice.vehicleId,
    subtotal: invoice.subtotal,
    discount: invoice.discount || null,
    tax: invoice.tax || null,
    total: invoice.total,
    amount_paid: invoice.amountPaid,
    payment_method: invoice.paymentMethod || null,
    status: invoice.status
  })
};

// Chuyển đổi kiểu dữ liệu từ supabase format sang local
const mapFromSupabaseFormat = {
  customers: (data: any): Customer => ({
    id: data.id,
    code: data.code,
    name: data.name,
    phone: data.phone,
    address: data.address || '',
    email: data.email || '',
    taxCode: data.tax_code || '',
    notes: data.notes || ''
  }),
  
  vehicles: (data: any): Vehicle => ({
    id: data.id,
    code: data.code,
    customerId: data.customer_id,
    licensePlate: data.license_plate,
    brand: data.brand,
    model: data.model,
    vin: data.vin || '',
    year: data.year || undefined,
    color: data.color || '',
    lastOdometer: data.last_odometer
  }),
  
  inventory_categories: (data: any): InventoryCategory => ({
    id: data.id,
    code: data.code,
    name: data.name
  }),
  
  inventory_items: (data: any): InventoryItem => ({
    id: data.id,
    sku: data.sku,
    name: data.name,
    categoryId: data.category_id,
    unit: data.unit,
    quantity: data.quantity,
    costPrice: data.cost_price,
    sellingPrice: data.selling_price,
    supplier: data.supplier || '',
    location: data.location || '',
    minQuantity: data.min_quantity || 0,
    notes: data.notes || ''
  }),
  
  services: (data: any): Service => ({
    id: data.id,
    code: data.code,
    name: data.name,
    description: data.description || '',
    price: data.price,
    estimatedTime: data.estimated_time || 0
  }),
  
  quotations: (data: any): Quotation => ({
    id: data.id,
    code: data.code,
    dateCreated: new Date(data.date_created),
    customerId: data.customer_id,
    vehicleId: data.vehicle_id,
    subtotal: data.subtotal,
    tax: data.tax || undefined,
    total: data.total,
    notes: data.notes || '',
    status: data.status as any
  }),
  
  quotation_items: (data: any): QuotationItem => ({
    id: data.id,
    quotationId: data.quotation_id,
    type: data.type as 'part' | 'service',
    itemId: data.item_id,
    name: data.name,
    quantity: data.quantity,
    unitPrice: data.unit_price,
    total: data.total
  }),
  
  repair_orders: (data: any): RepairOrder => ({
    id: data.id,
    code: data.code,
    dateCreated: new Date(data.date_created),
    dateExpected: data.date_expected ? new Date(data.date_expected) : undefined,
    quotationId: data.quotation_id || undefined,
    customerId: data.customer_id,
    vehicleId: data.vehicle_id,
    odometer: data.odometer,
    customerRequest: data.customer_request || '',
    technicianNotes: data.technician_notes || '',
    technicianId: data.technician_id || undefined,
    subtotal: data.subtotal,
    tax: data.tax || undefined,
    total: data.total,
    status: data.status as any
  }),
  
  repair_order_items: (data: any): RepairOrderItem => ({
    id: data.id,
    repairOrderId: data.repair_order_id,
    type: data.type as 'part' | 'service',
    itemId: data.item_id,
    name: data.name,
    quantity: data.quantity,
    unitPrice: data.unit_price,
    total: data.total
  }),
  
  invoices: (data: any): Invoice => ({
    id: data.id,
    code: data.code,
    dateCreated: new Date(data.date_created),
    repairOrderId: data.repair_order_id,
    customerId: data.customer_id,
    vehicleId: data.vehicle_id,
    subtotal: data.subtotal,
    discount: data.discount || undefined,
    tax: data.tax || undefined,
    total: data.total,
    amountPaid: data.amount_paid,
    paymentMethod: data.payment_method as any || undefined,
    status: data.status as any
  })
};

// Chức năng đồng bộ hóa dữ liệu
class DataSynchronizer {
  // Kiểm tra xem tính năng đồng bộ có được bật không
  private async isSyncEnabled(): Promise<boolean> {
    try {
      const settings = await settingsDb.getSettings();
      return !!settings.useSupabase;
    } catch (error) {
      console.error('Lỗi khi kiểm tra cài đặt đồng bộ:', error);
      return false;
    }
  }

  // Kiểm tra kết nối Supabase
  private async checkConnection(): Promise<boolean> {
    if (!supabase) return false;
    
    try {
      const { error } = await supabase.from('settings').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error('Lỗi khi kiểm tra kết nối Supabase:', error);
      return false;
    }
  }

  // Đồng bộ tất cả dữ liệu từ local lên Supabase
  public async syncAllToSupabase(): Promise<boolean> {
    if (!await this.isSyncEnabled() || !await this.checkConnection()) {
      console.log('Đồng bộ không được bật hoặc không có kết nối Supabase');
      return false;
    }

    if (!supabase) {
      console.error('Không có kết nối Supabase');
      return false;
    }

    try {
      // Danh sách các bảng cần đồng bộ
      const tables = [
        { name: 'customers' as TableName, data: await db.customers.toArray() },
        { name: 'vehicles' as TableName, data: await db.vehicles.toArray() },
        { name: 'inventory_categories' as TableName, data: await db.inventoryCategories.toArray() },
        { name: 'inventory_items' as TableName, data: await db.inventoryItems.toArray() },
        { name: 'services' as TableName, data: await db.services.toArray() },
        { name: 'quotations' as TableName, data: await db.quotations.toArray() },
        { name: 'quotation_items' as TableName, data: await db.quotationItems.toArray() },
        { name: 'repair_orders' as TableName, data: await db.repairOrders.toArray() },
        { name: 'repair_order_items' as TableName, data: await db.repairOrderItems.toArray() },
        { name: 'invoices' as TableName, data: await db.invoices.toArray() },
      ];

      // Đồng bộ từng bảng
      for (const table of tables) {
        const mapperFunction = mapToSupabaseFormat[table.name];
        
        if (!mapperFunction) {
          console.error(`Không tìm thấy hàm chuyển đổi cho bảng ${table.name}`);
          continue;
        }

        // Xóa dữ liệu cũ trên Supabase (cẩn thận với thao tác này)
        const { error: deleteError } = await supabase.from(table.name).delete().neq('id', 0);
        if (deleteError) {
          console.error(`Lỗi khi xóa dữ liệu cũ từ bảng ${table.name}:`, deleteError);
          continue;
        }

        // Nếu có dữ liệu để đồng bộ
        if (table.data.length > 0) {
          const dataToSync = table.data.map(item => mapperFunction(item));
          
          // Đẩy dữ liệu lên Supabase
          const { error: insertError } = await supabase.from(table.name).insert(dataToSync);
          
          if (insertError) {
            console.error(`Lỗi khi đồng bộ dữ liệu lên bảng ${table.name}:`, insertError);
            continue;
          }
          
          console.log(`Đã đồng bộ ${dataToSync.length} bản ghi lên bảng ${table.name}`);
        }
      }

      console.log('Đồng bộ dữ liệu lên Supabase thành công!');
      return true;
    } catch (error) {
      console.error('Lỗi khi đồng bộ dữ liệu lên Supabase:', error);
      return false;
    }
  }

  // Đồng bộ tất cả dữ liệu từ Supabase về local
  public async syncAllFromSupabase(): Promise<boolean> {
    if (!await this.isSyncEnabled() || !await this.checkConnection()) {
      console.log('Đồng bộ không được bật hoặc không có kết nối Supabase');
      return false;
    }

    if (!supabase) {
      console.error('Không có kết nối Supabase');
      return false;
    }

    try {
      // Danh sách các bảng cần đồng bộ
      const tables: TableName[] = [
        'customers',
        'vehicles',
        'inventory_categories',
        'inventory_items',
        'services',
        'quotations',
        'quotation_items',
        'repair_orders',
        'repair_order_items',
        'invoices',
      ];

      // Đồng bộ từng bảng
      for (const tableName of tables) {
        const mapperFunction = mapFromSupabaseFormat[tableName];
        
        if (!mapperFunction) {
          console.error(`Không tìm thấy hàm chuyển đổi cho bảng ${tableName}`);
          continue;
        }

        // Lấy dữ liệu từ Supabase
        const { data, error } = await supabase.from(tableName).select('*');
        
        if (error) {
          console.error(`Lỗi khi lấy dữ liệu từ bảng ${tableName}:`, error);
          continue;
        }

        if (data && data.length > 0) {
          // Xóa dữ liệu cũ trong IndexedDB
          await this.clearLocalTable(tableName);
          
          // Chuyển đổi dữ liệu và thêm vào IndexedDB
          const localData = data.map(item => mapperFunction(item));
          await this.addToLocalDb(tableName, localData);
          
          console.log(`Đã đồng bộ ${localData.length} bản ghi từ bảng ${tableName} về local`);
        }
      }

      console.log('Đồng bộ dữ liệu từ Supabase thành công!');
      return true;
    } catch (error) {
      console.error('Lỗi khi đồng bộ dữ liệu từ Supabase:', error);
      return false;
    }
  }

  // Xóa dữ liệu trong bảng local
  private async clearLocalTable(tableName: string): Promise<void> {
    switch (tableName) {
      case 'customers':
        await db.customers.clear();
        break;
      case 'vehicles':
        await db.vehicles.clear();
        break;
      case 'inventory_categories':
        await db.inventoryCategories.clear();
        break;
      case 'inventory_items':
        await db.inventoryItems.clear();
        break;
      case 'services':
        await db.services.clear();
        break;
      case 'quotations':
        await db.quotations.clear();
        break;
      case 'quotation_items':
        await db.quotationItems.clear();
        break;
      case 'repair_orders':
        await db.repairOrders.clear();
        break;
      case 'repair_order_items':
        await db.repairOrderItems.clear();
        break;
      case 'invoices':
        await db.invoices.clear();
        break;
      default:
        console.error(`Không tìm thấy bảng ${tableName} trong cơ sở dữ liệu local`);
    }
  }

  // Thêm dữ liệu vào bảng local
  private async addToLocalDb(tableName: string, data: any[]): Promise<void> {
    switch (tableName) {
      case 'customers':
        await db.customers.bulkAdd(data);
        break;
      case 'vehicles':
        await db.vehicles.bulkAdd(data);
        break;
      case 'inventory_categories':
        await db.inventoryCategories.bulkAdd(data);
        break;
      case 'inventory_items':
        await db.inventoryItems.bulkAdd(data);
        break;
      case 'services':
        await db.services.bulkAdd(data);
        break;
      case 'quotations':
        await db.quotations.bulkAdd(data);
        break;
      case 'quotation_items':
        await db.quotationItems.bulkAdd(data);
        break;
      case 'repair_orders':
        await db.repairOrders.bulkAdd(data);
        break;
      case 'repair_order_items':
        await db.repairOrderItems.bulkAdd(data);
        break;
      case 'invoices':
        await db.invoices.bulkAdd(data);
        break;
      default:
        console.error(`Không tìm thấy bảng ${tableName} trong cơ sở dữ liệu local`);
    }
  }
}

// Tạo instance
export const dataSynchronizer = new DataSynchronizer();