-- Tệp SQL này chứa các lệnh tạo bảng cho cơ sở dữ liệu Supabase
-- Sử dụng SQL Editor trong Supabase dashboard để chạy các lệnh này

-- Tạo bảng settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  garage_name TEXT NOT NULL,
  garage_address TEXT,
  garage_phone TEXT,
  garage_email TEXT,
  garage_tax_code TEXT,
  logo_url TEXT,
  icon_color TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  email TEXT,
  tax_code TEXT,
  notes TEXT
);

-- Tạo bảng vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  license_plate TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  vin TEXT,
  year INTEGER,
  color TEXT,
  last_odometer INTEGER NOT NULL
);

-- Tạo bảng inventory_categories
CREATE TABLE IF NOT EXISTS inventory_categories (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

-- Tạo bảng inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE,
  unit TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  supplier TEXT,
  location TEXT,
  min_quantity INTEGER,
  notes TEXT
);

-- Tạo bảng services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  estimated_time INTEGER
);

-- Tạo bảng quotations
CREATE TABLE IF NOT EXISTS quotations (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  subtotal REAL NOT NULL,
  tax REAL,
  total REAL NOT NULL,
  notes TEXT,
  status TEXT NOT NULL
);

-- Tạo bảng quotation_items
CREATE TABLE IF NOT EXISTS quotation_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'part' hoặc 'service'
  item_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

-- Tạo bảng repair_orders
CREATE TABLE IF NOT EXISTS repair_orders (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  date_expected DATE,
  quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  odometer INTEGER NOT NULL,
  customer_request TEXT,
  technician_notes TEXT,
  technician_id INTEGER,
  subtotal REAL NOT NULL,
  tax REAL,
  total REAL NOT NULL,
  status TEXT NOT NULL
);

-- Tạo bảng repair_order_items
CREATE TABLE IF NOT EXISTS repair_order_items (
  id SERIAL PRIMARY KEY,
  repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'part' hoặc 'service'
  item_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

-- Tạo bảng invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  subtotal REAL NOT NULL,
  discount REAL,
  tax REAL,
  total REAL NOT NULL,
  amount_paid REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  status TEXT NOT NULL
);

-- Thêm dữ liệu mặc định cho settings nếu không tồn tại
INSERT INTO settings (garage_name, garage_address, garage_phone, garage_email, garage_tax_code, icon_color)
SELECT 'Garage Manager', '', '', '', '', '#f97316'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Tạo các RLS policies để bảo vệ dữ liệu (Row Level Security)
-- Chỉ cho phép truy cập khi xác thực
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access customers" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access vehicles" ON vehicles
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access inventory_categories" ON inventory_categories
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access inventory_items" ON inventory_items
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access services" ON services
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access quotations" ON quotations
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access quotation_items" ON quotation_items
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access repair_orders" ON repair_orders
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE repair_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access repair_order_items" ON repair_order_items
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access invoices" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');