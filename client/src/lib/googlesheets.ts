// Google Sheets Database Service
import { settingsDb } from './settings';

export interface GoogleSheetsConfig {
  sheetsId: string;
  apiKey: string;
  enabled: boolean;
}

interface SheetData {
  range: string;
  values: any[][];
}

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  async initialize() {
    const settings = await settingsDb.getSettings();
    if (settings.googleSheetsId && settings.googleSheetsApiKey) {
      this.config = {
        sheetsId: settings.googleSheetsId,
        apiKey: settings.googleSheetsApiKey,
        enabled: settings.googleSheetsEnabled || false
      };
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled || false;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      console.log('No Google Sheets config found');
      return false;
    }
    
    if (!this.config.sheetsId || !this.config.apiKey) {
      console.log('Missing Sheets ID or API Key');
      return false;
    }
    
    try {
      const url = `${this.baseUrl}/${this.config.sheetsId}?key=${this.config.apiKey}&fields=spreadsheetId,properties.title`;
      console.log('Testing Google Sheets connection to:', url.replace(this.config.apiKey, '[API_KEY]'));
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connection successful, spreadsheet found:', data.properties?.title);
        return true;
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        return false;
      }
    } catch (err) {
      console.error('Network error testing Google Sheets connection:', err);
      return false;
    }
  }

  private async getSheetData(sheetName: string): Promise<any[]> {
    if (!this.config) throw new Error('Google Sheets not configured');

    const response = await fetch(
      `${this.baseUrl}/${this.config.sheetsId}/values/${sheetName}?key=${this.config.apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sheetName}: ${response.statusText}`);
    }

    const result = await response.json();
    const values = result.values || [];
    
    if (values.length === 0) return [];

    // Convert rows to objects using first row as headers
    const headers = values[0];
    return values.slice(1).map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  }

  private async updateSheetData(sheetName: string, data: any[]): Promise<void> {
    if (!this.config) throw new Error('Google Sheets not configured');
    if (data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const values = [
      headers,
      ...data.map(item => headers.map(header => item[header] || ''))
    ];

    // Clear existing data first
    await fetch(
      `${this.baseUrl}/${this.config.sheetsId}/values/${sheetName}:clear?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }
    );

    // Update with new data
    await fetch(
      `${this.baseUrl}/${this.config.sheetsId}/values/${sheetName}?valueInputOption=RAW&key=${this.config.apiKey}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      }
    );
  }

  async syncCustomers(customers: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('Customers', customers);
  }

  async syncVehicles(vehicles: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('Vehicles', vehicles);
  }

  async syncInventoryCategories(categories: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('InventoryCategories', categories);
  }

  async syncInventoryItems(items: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('InventoryItems', items);
  }

  async syncServices(services: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('Services', services);
  }

  async syncQuotations(quotations: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('Quotations', quotations);
  }

  async syncQuotationItems(items: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('QuotationItems', items);
  }

  async syncRepairOrders(repairOrders: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('RepairOrders', repairOrders);
  }

  async syncRepairOrderItems(items: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('RepairOrderItems', items);
  }

  async syncInvoices(invoices: any[]) {
    if (!this.isEnabled()) return;
    await this.updateSheetData('Invoices', invoices);
  }

  async loadFromGoogleSheets() {
    if (!this.isEnabled()) return;
    
    const { db } = await import('./db');
    
    try {
      console.log('Starting data load from Google Sheets...');
      
      const sheetNames = [
        'Customers', 'Vehicles', 'InventoryCategories', 'InventoryItems',
        'Services', 'Quotations', 'QuotationItems', 'RepairOrders', 'RepairOrderItems', 'Invoices'
      ];

      for (const sheetName of sheetNames) {
        try {
          const data = await this.getSheetData(sheetName);
          
          if (data.length === 0) continue;

          switch (sheetName) {
            case 'Customers':
              await db.customers.clear();
              await db.customers.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined
              })));
              console.log(`Loaded ${data.length} customers from Google Sheets`);
              break;
            case 'Vehicles':
              await db.vehicles.clear();
              await db.vehicles.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                customerId: parseInt(item.customerId),
                lastOdometer: parseInt(item.lastOdometer) || 0,
                year: item.year ? parseInt(item.year) : undefined
              })));
              console.log(`Loaded ${data.length} vehicles from Google Sheets`);
              break;
            case 'InventoryCategories':
              await db.inventoryCategories.clear();
              await db.inventoryCategories.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined
              })));
              console.log(`Loaded ${data.length} inventory categories from Google Sheets`);
              break;
            case 'InventoryItems':
              await db.inventoryItems.clear();
              await db.inventoryItems.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                categoryId: parseInt(item.categoryId),
                quantity: parseInt(item.quantity) || 0,
                costPrice: parseFloat(item.costPrice) || 0,
                sellingPrice: parseFloat(item.sellingPrice) || 0,
                minQuantity: item.minQuantity ? parseInt(item.minQuantity) : undefined
              })));
              console.log(`Loaded ${data.length} inventory items from Google Sheets`);
              break;
            case 'Services':
              await db.services.clear();
              await db.services.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                price: parseFloat(item.price) || 0,
                estimatedTime: item.estimatedTime ? parseInt(item.estimatedTime) : undefined
              })));
              console.log(`Loaded ${data.length} services from Google Sheets`);
              break;
            case 'Quotations':
              await db.quotations.clear();
              await db.quotations.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                customerId: parseInt(item.customerId),
                vehicleId: parseInt(item.vehicleId),
                dateCreated: new Date(item.dateCreated),
                subtotal: parseFloat(item.subtotal) || 0,
                tax: item.tax ? parseFloat(item.tax) : undefined,
                total: parseFloat(item.total) || 0
              })));
              console.log(`Loaded ${data.length} quotations from Google Sheets`);
              break;
            case 'QuotationItems':
              await db.quotationItems.clear();
              await db.quotationItems.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                quotationId: parseInt(item.quotationId),
                itemId: parseInt(item.itemId),
                quantity: parseInt(item.quantity) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0,
                total: parseFloat(item.total) || 0
              })));
              console.log(`Loaded ${data.length} quotation items from Google Sheets`);
              break;
            case 'RepairOrders':
              await db.repairOrders.clear();
              await db.repairOrders.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                customerId: parseInt(item.customerId),
                vehicleId: parseInt(item.vehicleId),
                quotationId: item.quotationId ? parseInt(item.quotationId) : undefined,
                technicianId: item.technicianId ? parseInt(item.technicianId) : undefined,
                dateCreated: new Date(item.dateCreated),
                dateExpected: item.dateExpected ? new Date(item.dateExpected) : undefined,
                odometer: parseInt(item.odometer) || 0,
                subtotal: parseFloat(item.subtotal) || 0,
                tax: item.tax ? parseFloat(item.tax) : undefined,
                total: parseFloat(item.total) || 0
              })));
              console.log(`Loaded ${data.length} repair orders from Google Sheets`);
              break;
            case 'RepairOrderItems':
              await db.repairOrderItems.clear();
              await db.repairOrderItems.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                repairOrderId: parseInt(item.repairOrderId),
                itemId: parseInt(item.itemId),
                quantity: parseInt(item.quantity) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0,
                total: parseFloat(item.total) || 0
              })));
              console.log(`Loaded ${data.length} repair order items from Google Sheets`);
              break;
            case 'Invoices':
              await db.invoices.clear();
              await db.invoices.bulkAdd(data.map((item: any) => ({
                ...item,
                id: item.id ? parseInt(item.id) : undefined,
                repairOrderId: parseInt(item.repairOrderId),
                customerId: parseInt(item.customerId),
                vehicleId: parseInt(item.vehicleId),
                dateCreated: new Date(item.dateCreated),
                subtotal: parseFloat(item.subtotal) || 0,
                discount: item.discount ? parseFloat(item.discount) : undefined,
                tax: item.tax ? parseFloat(item.tax) : undefined,
                total: parseFloat(item.total) || 0,
                amountPaid: parseFloat(item.amountPaid) || 0
              })));
              console.log(`Loaded ${data.length} invoices from Google Sheets`);
              break;
          }
        } catch (error) {
          console.error(`Error loading ${sheetName}:`, error);
        }
      }

      console.log('Data loading from Google Sheets completed');
      
      // Trigger data change event to update UI
      db.triggerDataChange();
      
    } catch (error) {
      console.error('Error loading from Google Sheets:', error);
      throw error;
    }
  }

  async syncAllData() {
    if (!this.isEnabled()) return;
    
    try {
      const { db } = await import('./db');
      
      console.log('Starting data sync to Google Sheets...');
      
      // Get all data from local database
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

      // Sync all data types to Google Sheets
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

      console.log('Data sync to Google Sheets completed successfully');
    } catch (error) {
      console.error('Error syncing data to Google Sheets:', error);
      throw error;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();