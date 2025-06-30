// Tệp này được sử dụng để kiểm tra kết nối tới Supabase
import { supabase } from './supabase';

// Hàm kiểm tra kết nối cơ bản
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    // Thử kết nối đơn giản để kiểm tra kết nối
    const { data, error } = await supabase.from('settings').select('id').limit(1);
    
    if (error) {
      console.error('Lỗi kết nối Supabase:', error.message);
      return false;
    }
    
    console.log('Kết nối Supabase thành công!', data);
    return true;
  } catch (error) {
    console.error('Lỗi kết nối Supabase:', error);
    return false;
  }
}

// Hàm kiểm tra cấu trúc cơ sở dữ liệu
export async function checkSupabaseTables(): Promise<{ [key: string]: boolean }> {
  const tables = [
    'settings',
    'customers',
    'vehicles',
    'inventory_categories',
    'inventory_items',
    'services',
    'quotations',
    'quotation_items',
    'repair_orders',
    'repair_order_items',
    'invoices'
  ];
  
  const result: { [key: string]: boolean } = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      
      if (error) {
        console.error(`Lỗi kiểm tra bảng ${table}:`, error.message);
        result[table] = false;
      } else {
        console.log(`Bảng ${table} tồn tại`);
        result[table] = true;
      }
    } catch (error) {
      console.error(`Lỗi kiểm tra bảng ${table}:`, error);
      result[table] = false;
    }
  }
  
  return result;
}

// Hàm để tạo dữ liệu mẫu cài đặt cơ bản nếu chưa có
export async function createInitialSettings(): Promise<boolean> {
  try {
    // Kiểm tra xem đã có dữ liệu cài đặt chưa
    const { data, error } = await supabase.from('settings').select('id').limit(1);
    
    if (error) {
      console.error('Lỗi kiểm tra cài đặt:', error.message);
      return false;
    }
    
    // Nếu chưa có dữ liệu cài đặt, tạo mới
    if (!data || data.length === 0) {
      const { error: insertError } = await supabase.from('settings').insert({
        garage_name: 'Garage Manager',
        garage_address: '',
        garage_phone: '',
        garage_email: '',
        garage_tax_code: '',
        icon_color: '#f97316', // Màu cam mặc định (orange-500)
        updated_at: new Date().toISOString()
      });
      
      if (insertError) {
        console.error('Lỗi tạo cài đặt ban đầu:', insertError.message);
        return false;
      }
      
      console.log('Đã tạo cài đặt ban đầu thành công');
      return true;
    }
    
    console.log('Đã có cài đặt từ trước');
    return true;
  } catch (error) {
    console.error('Lỗi tạo cài đặt ban đầu:', error);
    return false;
  }
}