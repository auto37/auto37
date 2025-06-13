-- Script để xóa sạch tất cả dữ liệu trong Supabase và reset ID sequences
-- Chạy script này trong SQL Editor của Supabase khi muốn reset hoàn toàn dữ liệu

-- Xóa dữ liệu theo thứ tự để tránh foreign key constraint
TRUNCATE TABLE public.invoices RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.repair_order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.repair_orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.quotation_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.quotations RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.services RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.inventory_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.inventory_categories RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.vehicles RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.customers RESTART IDENTITY CASCADE;

-- Reset sequences về 1
ALTER SEQUENCE public.customers_id_seq RESTART WITH 1;
ALTER SEQUENCE public.vehicles_id_seq RESTART WITH 1;
ALTER SEQUENCE public.inventory_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE public.inventory_items_id_seq RESTART WITH 1;
ALTER SEQUENCE public.services_id_seq RESTART WITH 1;
ALTER SEQUENCE public.quotations_id_seq RESTART WITH 1;
ALTER SEQUENCE public.quotation_items_id_seq RESTART WITH 1;
ALTER SEQUENCE public.repair_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE public.repair_order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE public.invoices_id_seq RESTART WITH 1;

-- Xác nhận dữ liệu đã được xóa
SELECT 'customers' as table_name, COUNT(*) as record_count FROM public.customers
UNION ALL
SELECT 'vehicles', COUNT(*) FROM public.vehicles
UNION ALL
SELECT 'inventory_categories', COUNT(*) FROM public.inventory_categories
UNION ALL
SELECT 'inventory_items', COUNT(*) FROM public.inventory_items
UNION ALL
SELECT 'services', COUNT(*) FROM public.services
UNION ALL
SELECT 'quotations', COUNT(*) FROM public.quotations
UNION ALL
SELECT 'quotation_items', COUNT(*) FROM public.quotation_items
UNION ALL
SELECT 'repair_orders', COUNT(*) FROM public.repair_orders
UNION ALL
SELECT 'repair_order_items', COUNT(*) FROM public.repair_order_items
UNION ALL
SELECT 'invoices', COUNT(*) FROM public.invoices;