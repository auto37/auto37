// Kết nối và cấu hình Supabase
import { createClient } from '@supabase/supabase-js';

// URL và khóa API từ biến môi trường (sẽ cần được cấu hình)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Tạo client Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Kiểm tra kết nối Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('settings').select('id').limit(1);
    if (error) {
      console.error('Lỗi kết nối Supabase:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Lỗi kết nối Supabase:', error);
    return false;
  }
}

// Helper function để xử lý lỗi Supabase
export function handleSupabaseError(error: any, actionName: string): string {
  console.error(`Lỗi ${actionName}:`, error);
  
  if (error.code === 'PGRST301') {
    return 'Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra kết nối mạng.';
  }
  
  if (error.code === '42P01') {
    return 'Bảng dữ liệu không tồn tại. Vui lòng kiểm tra cấu hình cơ sở dữ liệu.';
  }
  
  if (error.code === '23505') {
    return 'Dữ liệu đã tồn tại. Vui lòng kiểm tra lại thông tin.';
  }
  
  return `Lỗi ${actionName}: ${error.message || 'Đã xảy ra lỗi không xác định'}`;
}