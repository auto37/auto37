-- Complete Supabase Database Setup with Correct Field Names
-- This matches the IndexedDB structure exactly

-- Drop existing tables if they exist
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS repair_order_items CASCADE;
DROP TABLE IF EXISTS repair_orders CASCADE;
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_categories CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables with exact field names from IndexedDB
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    taxCode VARCHAR(20),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customerId INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    licensePlate VARCHAR(20) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    engineNumber VARCHAR(100),
    chassisNumber VARCHAR(100),
    lastOdometer INTEGER DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    categoryId INTEGER REFERENCES inventory_categories(id) ON DELETE SET NULL,
    unit VARCHAR(50),
    quantity INTEGER DEFAULT 0,
    minQuantity INTEGER DEFAULT 0,
    costPrice DECIMAL(15,2) DEFAULT 0,
    sellingPrice DECIMAL(15,2) DEFAULT 0,
    supplier VARCHAR(255),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15,2) DEFAULT 0,
    estimatedTime INTEGER DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quotations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customerId INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    vehicleId INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    dateCreated DATE DEFAULT CURRENT_DATE,
    validUntil DATE,
    status VARCHAR(50) DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    taxAmount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quotation_items (
    id SERIAL PRIMARY KEY,
    quotationId INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('service', 'part')),
    itemId INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unitPrice DECIMAL(15,2) DEFAULT 0,
    totalPrice DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE repair_orders (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customerId INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    vehicleId INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    quotationId INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
    dateCreated DATE DEFAULT CURRENT_DATE,
    estimatedCompletion DATE,
    actualCompletion DATE,
    status VARCHAR(50) DEFAULT 'pending',
    customerRequest TEXT,
    subtotal DECIMAL(15,2) DEFAULT 0,
    taxAmount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE repair_order_items (
    id SERIAL PRIMARY KEY,
    repairOrderId INTEGER REFERENCES repair_orders(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('service', 'part')),
    itemId INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unitPrice DECIMAL(15,2) DEFAULT 0,
    totalPrice DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    customerId INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    vehicleId INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    repairOrderId INTEGER REFERENCES repair_orders(id) ON DELETE SET NULL,
    dateCreated DATE DEFAULT CURRENT_DATE,
    dueDate DATE,
    paymentStatus VARCHAR(50) DEFAULT 'unpaid',
    paymentMethod VARCHAR(50),
    paymentDate DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    taxAmount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    amountPaid DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_vehicles_license_plate ON vehicles(licensePlate);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customerId);
CREATE INDEX idx_inventory_items_category_id ON inventory_items(categoryId);
CREATE INDEX idx_quotations_customer_id ON quotations(customerId);
CREATE INDEX idx_quotations_vehicle_id ON quotations(vehicleId);
CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotationId);
CREATE INDEX idx_repair_orders_customer_id ON repair_orders(customerId);
CREATE INDEX idx_repair_orders_vehicle_id ON repair_orders(vehicleId);
CREATE INDEX idx_repair_order_items_repair_order_id ON repair_order_items(repairOrderId);
CREATE INDEX idx_invoices_customer_id ON invoices(customerId);
CREATE INDEX idx_invoices_vehicle_id ON invoices(vehicleId);

-- Disable RLS for easier development (enable later for security)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE repair_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Insert sample categories for testing
INSERT INTO inventory_categories (code, name, description) VALUES 
('DM001', 'Phụ tùng động cơ', 'Các phụ tùng liên quan đến động cơ'),
('DM002', 'Hệ thống phanh', 'Phụ tùng hệ thống phanh'),
('DM003', 'Hệ thống điện', 'Các thiết bị điện tử, dây điện'),
('DM004', 'Thân vỏ xe', 'Phụ tùng thân vỏ, nội thất')
ON CONFLICT (code) DO NOTHING;

SELECT 'Database setup completed successfully! All tables created with correct field names.' as result;