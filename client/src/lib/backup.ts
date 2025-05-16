import { db } from './db';
import { settingsDb } from './settings';

/**
 * Xuất toàn bộ dữ liệu trong cơ sở dữ liệu thành file JSON
 */
export async function exportDatabaseToJson(): Promise<string> {
  try {
    // Thu thập dữ liệu từ các bảng
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
    
    // Thu thập cài đặt
    const settings = await settingsDb.getSettings();
    
    // Gói dữ liệu
    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        customers,
        vehicles,
        inventoryCategories,
        inventoryItems,
        services,
        quotations,
        quotationItems,
        repairOrders,
        repairOrderItems,
        invoices,
        settings
      }
    };
    
    // Chuyển đổi thành chuỗi JSON
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Lỗi khi xuất dữ liệu:', error);
    throw new Error('Không thể xuất dữ liệu. Vui lòng thử lại.');
  }
}

/**
 * Nhập dữ liệu từ file JSON vào cơ sở dữ liệu
 */
export async function importDatabaseFromJson(jsonData: string): Promise<void> {
  try {
    // Parse chuỗi JSON
    const data = JSON.parse(jsonData);
    
    // Kiểm tra phiên bản và format
    if (!data.version || !data.data) {
      throw new Error('File dữ liệu không hợp lệ hoặc không đúng định dạng.');
    }
    
    // Xác nhận xóa dữ liệu hiện tại
    await db.delete();
    await db.open();
    
    // Nhập dữ liệu từng bảng
    if (data.data.customers && data.data.customers.length > 0) {
      await db.customers.bulkAdd(data.data.customers);
    }
    
    if (data.data.vehicles && data.data.vehicles.length > 0) {
      await db.vehicles.bulkAdd(data.data.vehicles);
    }
    
    if (data.data.inventoryCategories && data.data.inventoryCategories.length > 0) {
      await db.inventoryCategories.bulkAdd(data.data.inventoryCategories);
    }
    
    if (data.data.inventoryItems && data.data.inventoryItems.length > 0) {
      await db.inventoryItems.bulkAdd(data.data.inventoryItems);
    }
    
    if (data.data.services && data.data.services.length > 0) {
      await db.services.bulkAdd(data.data.services);
    }
    
    if (data.data.quotations && data.data.quotations.length > 0) {
      await db.quotations.bulkAdd(data.data.quotations);
    }
    
    if (data.data.quotationItems && data.data.quotationItems.length > 0) {
      await db.quotationItems.bulkAdd(data.data.quotationItems);
    }
    
    if (data.data.repairOrders && data.data.repairOrders.length > 0) {
      await db.repairOrders.bulkAdd(data.data.repairOrders);
    }
    
    if (data.data.repairOrderItems && data.data.repairOrderItems.length > 0) {
      await db.repairOrderItems.bulkAdd(data.data.repairOrderItems);
    }
    
    if (data.data.invoices && data.data.invoices.length > 0) {
      await db.invoices.bulkAdd(data.data.invoices);
    }
    
    // Nhập cài đặt nếu có
    if (data.data.settings) {
      await settingsDb.updateSettings(data.data.settings);
    }
    
  } catch (error) {
    console.error('Lỗi khi nhập dữ liệu:', error);
    throw new Error('Không thể nhập dữ liệu. Vui lòng kiểm tra định dạng file.');
  }
}

/**
 * Tạo file backup và tải xuống
 */
export async function downloadBackup(): Promise<void> {
  try {
    const jsonData = await exportDatabaseToJson();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const currentDate = new Date().toISOString().slice(0, 10);
    const filename = `garage_backup_${currentDate}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Lỗi khi tạo file backup:', error);
    throw error;
  }
}

/**
 * Xóa toàn bộ dữ liệu trong cơ sở dữ liệu
 */
export async function clearAllData(): Promise<void> {
  try {
    await db.delete();
    await db.open();
  } catch (error) {
    console.error('Lỗi khi xóa dữ liệu:', error);
    throw new Error('Không thể xóa dữ liệu. Vui lòng thử lại.');
  }
}