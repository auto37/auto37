// Kết nối và cấu hình Supabase
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL và khóa API từ biến môi trường (sẽ cần được cấu hình)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || null;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || null;

// Kiểm tra URL có hợp lệ không
function isValidUrl(url: string | null): boolean {
  if (!url) return false;
  
  // Kiểm tra nếu URL là JWT token (bắt đầu bằng eyJ), có thể người dùng đã nhầm lẫn URL và API key
  if (url.startsWith('eyJ')) {
    console.error('URL không hợp lệ! Có vẻ như bạn đã nhập API key vào trường URL. URL Supabase cần bắt đầu bằng https://');
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch (err) {
    console.error('URL Supabase không hợp lệ:', url);
    return false;
  }
}

// Kiểm tra xem cả URL và key có hợp lệ không
function hasValidCredentials(): boolean {
  return !!(supabaseUrl && 
           supabaseKey && 
           supabaseUrl.trim() !== '' && 
           supabaseKey.trim() !== '' && 
           isValidUrl(supabaseUrl));
}

// Tạo client Supabase nếu có đủ thông tin và URL hợp lệ
export const supabase: SupabaseClient | null = hasValidCredentials()
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

// Kiểm tra xem Supabase đã được khởi tạo chưa
export const isSupabaseInitialized = !!supabase;

// Kiểm tra kết nối Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabase) {
    console.error('Lỗi kết nối Supabase: Không có thông tin kết nối hoặc thông tin không hợp lệ');
    return false;
  }
  
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