// Customer Types
export interface Customer {
  id?: number;
  code: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  taxCode?: string;
  notes?: string;
}

// Vehicle Types
export interface Vehicle {
  id?: number;
  code: string;
  customerId: number;
  licensePlate: string;
  brand: string;
  model: string;
  vin?: string;
  year?: number;
  color?: string;
  lastOdometer: number;
}

// Inventory Category Types
export interface InventoryCategory {
  id?: number;
  code: string;
  name: string;
}

// Inventory Item Types
export interface InventoryItem {
  id?: number;
  sku: string;
  name: string;
  categoryId: number;
  unit: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  location?: string;
  minQuantity?: number;
  notes?: string;
}

// Service Types
export interface Service {
  id?: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  estimatedTime?: number;
}

// Quotation Types
export interface Quotation {
  id?: number;
  code: string;
  dateCreated: Date;
  customerId: number;
  vehicleId: number;
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
  status: 'new' | 'sent' | 'accepted' | 'rejected';
}

export interface QuotationItem {
  id?: number;
  quotationId: number;
  type: 'part' | 'service';
  itemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Repair Order Types
export interface RepairOrder {
  id?: number;
  code: string;
  dateCreated: Date;
  dateExpected?: Date;
  quotationId?: number;
  customerId: number;
  vehicleId: number;
  odometer: number;
  customerRequest?: string;
  technicianNotes?: string;
  technicianId?: number;
  subtotal: number;
  tax?: number;
  total: number;
  status: 'new' | 'in_progress' | 'waiting_parts' | 'completed' | 'delivered' | 'cancelled';
}

export interface RepairOrderItem {
  id?: number;
  repairOrderId: number;
  type: 'part' | 'service';
  itemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Invoice Types
export interface Invoice {
  id?: number;
  code: string;
  dateCreated: Date;
  repairOrderId: number;
  customerId: number;
  vehicleId: number;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  amountPaid: number;
  paymentMethod?: 'cash' | 'transfer' | 'card';
  status: 'unpaid' | 'partial' | 'paid';
}

// Extended types with relations
export interface CustomerWithVehicles extends Customer {
  vehicles?: Vehicle[];
}

export interface VehicleWithCustomer extends Vehicle {
  customer?: Customer;
}

export interface InventoryItemWithCategory extends InventoryItem {
  category?: InventoryCategory;
}

export interface QuotationWithDetails extends Quotation {
  customer?: Customer;
  vehicle?: Vehicle;
  items?: QuotationItem[];
}

export interface RepairOrderWithDetails extends RepairOrder {
  customer?: Customer;
  vehicle?: Vehicle;
  items?: RepairOrderItem[];
  quotation?: Quotation;
}

export interface InvoiceWithDetails extends Invoice {
  customer?: Customer;
  vehicle?: Vehicle;
  repairOrder?: RepairOrder;
  repairOrderItems?: RepairOrderItem[];
}

// Common types for select options
export interface SelectOption {
  value: string | number;
  label: string;
}

// Brand options
export const CAR_BRANDS = [
  'Toyota', 'Honda', 'Ford', 'Hyundai', 'Mazda', 
  'Kia', 'Chevrolet', 'Nissan', 'Suzuki', 'Mercedes-Benz', 
  'BMW', 'Audi', 'Lexus', 'Mitsubishi', 'Isuzu',
  'Peugeot', 'Porsche', 'Subaru', 'Volkswagen', 'Khác'
];

// Measurement units
export const UNITS = [
  'Cái', 'Chiếc', 'Bộ', 'Lít', 'Kg', 
  'Mét', 'Chai', 'Túi', 'Hộp', 'Thùng', 
  'Giờ', 'Gói', 'Cuộn'
];
