import { pgTable, text, serial, integer, boolean, timestamp, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base User schema - maintained for compatibility
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Customer schema
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  email: text("email"),
  taxCode: text("tax_code"),
  notes: text("notes"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Vehicle schema
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  customerId: integer("customer_id").notNull(),
  licensePlate: text("license_plate").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  vin: text("vin"),
  year: integer("year"),
  color: text("color"),
  lastOdometer: integer("last_odometer").notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Inventory category schema
export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
});

export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({
  id: true,
});

export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;

// Inventory item schema
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull().default(0),
  costPrice: real("cost_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  supplier: text("supplier"),
  location: text("location"),
  minQuantity: integer("min_quantity"),
  notes: text("notes"),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Service schema
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  estimatedTime: integer("estimated_time"),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Quotation schema
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  dateCreated: timestamp("date_created").notNull(),
  customerId: integer("customer_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  subtotal: real("subtotal").notNull(),
  tax: real("tax"),
  total: real("total").notNull(),
  notes: text("notes"),
  status: text("status").notNull(),
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
});

export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotations.$inferSelect;

// Quotation items schema
export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull(),
  type: text("type").notNull(), // 'part' or 'service'
  itemId: integer("item_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({
  id: true,
});

export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;

// Repair Order schema
export const repairOrders = pgTable("repair_orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  dateCreated: timestamp("date_created").notNull(),
  dateExpected: date("date_expected"),
  quotationId: integer("quotation_id"),
  customerId: integer("customer_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  odometer: integer("odometer").notNull(),
  customerRequest: text("customer_request"),
  technicianNotes: text("technician_notes"),
  technicianId: integer("technician_id"),
  subtotal: real("subtotal").notNull(),
  tax: real("tax"),
  total: real("total").notNull(),
  status: text("status").notNull(),
});

export const insertRepairOrderSchema = createInsertSchema(repairOrders).omit({
  id: true,
});

export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;
export type RepairOrder = typeof repairOrders.$inferSelect;

// Repair Order items schema
export const repairOrderItems = pgTable("repair_order_items", {
  id: serial("id").primaryKey(),
  repairOrderId: integer("repair_order_id").notNull(),
  type: text("type").notNull(), // 'part' or 'service'
  itemId: integer("item_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  total: real("total").notNull(),
});

export const insertRepairOrderItemSchema = createInsertSchema(repairOrderItems).omit({
  id: true,
});

export type InsertRepairOrderItem = z.infer<typeof insertRepairOrderItemSchema>;
export type RepairOrderItem = typeof repairOrderItems.$inferSelect;

// Invoice schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  dateCreated: timestamp("date_created").notNull(),
  repairOrderId: integer("repair_order_id").notNull(),
  customerId: integer("customer_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  subtotal: real("subtotal").notNull(),
  discount: real("discount"),
  tax: real("tax"),
  total: real("total").notNull(),
  amountPaid: real("amount_paid").notNull().default(0),
  paymentMethod: text("payment_method"),
  status: text("status").notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
