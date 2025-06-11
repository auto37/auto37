import { dataSynchronizer } from './sync';
import { db } from './db';
import { settingsDb } from './settings';
import { supabase, checkSupabaseConnection } from './supabase';

// Khoảng thời gian kiểm tra đồng bộ (mặc định 1 phút)
const SYNC_INTERVAL = 60 * 1000; 

// Biến lưu trạng thái đồng bộ
let isSyncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Kiểm tra xem đồng bộ có bật không
async function isSyncEnabled(): Promise<boolean> {
  try {
    const settings = await settingsDb.getSettings();
    return !!settings.useSupabase;
  } catch (error) {
    console.error('Lỗi khi kiểm tra cài đặt đồng bộ:', error);
    return false;
  }
}

// Đồng bộ lên Supabase
async function syncToSupabase(showToast = false): Promise<void> {
  if (isSyncing) return;
  if (!await isSyncEnabled()) return;

  isSyncing = true;
  try {
    // Chỉ hiển thị thông báo khi được yêu cầu (khi người dùng thực hiện thủ công)
    if (showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Đang đồng bộ',
          description: 'Đang đồng bộ dữ liệu lên Supabase...'
        }
      }));
    }
    
    const success = await dataSynchronizer.syncAllToSupabase();
    
    if (success && showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Thành công',
          description: 'Đã đồng bộ dữ liệu lên Supabase.'
        }
      }));
    } else if (!success && showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Lỗi',
          description: 'Không thể đồng bộ dữ liệu. Vui lòng thử lại sau.',
          variant: 'destructive'
        }
      }));
    }
  } catch (error) {
    console.error('Lỗi khi đồng bộ dữ liệu lên Supabase:', error);
    if (showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Lỗi',
          description: 'Không thể đồng bộ dữ liệu. Vui lòng thử lại sau.',
          variant: 'destructive'
        }
      }));
    }
  } finally {
    isSyncing = false;
  }
}

// Đồng bộ từ Supabase
async function syncFromSupabase(showToast = false): Promise<void> {
  if (isSyncing) return;
  if (!await isSyncEnabled()) return;

  isSyncing = true;
  try {
    // Chỉ hiển thị thông báo khi được yêu cầu (khi người dùng thực hiện thủ công)
    if (showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Đang đồng bộ',
          description: 'Đang đồng bộ dữ liệu từ Supabase...'
        }
      }));
    }
    
    const success = await dataSynchronizer.syncAllFromSupabase();
    
    if (success && showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Thành công',
          description: 'Đã đồng bộ dữ liệu từ Supabase.'
        }
      }));
    } else if (!success && showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Lỗi',
          description: 'Không thể đồng bộ dữ liệu. Vui lòng thử lại sau.',
          variant: 'destructive'
        }
      }));
    }
  } catch (error) {
    console.error('Lỗi khi đồng bộ dữ liệu từ Supabase:', error);
    if (showToast) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Lỗi',
          description: 'Không thể đồng bộ dữ liệu. Vui lòng thử lại sau.',
          variant: 'destructive'
        }
      }));
    }
  } finally {
    isSyncing = false;
  }
}

// Bắt đầu đồng bộ tự động
export async function startAutoSync(): Promise<void> {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Only attempt sync if Supabase is available and enabled
  const syncEnabled = await isSyncEnabled();
  if (!syncEnabled) {
    console.log('Auto-sync disabled - using IndexedDB only');
    return;
  }

  // Đồng bộ lần đầu khi mở ứng dụng
  await syncFromSupabase();

  // Thiết lập đồng bộ định kỳ
  syncInterval = setInterval(async () => {
    const isConnected = await checkSupabaseConnection();
    const syncStillEnabled = await isSyncEnabled();
    
    if (isConnected && syncStillEnabled && !isSyncing) {
      await syncToSupabase();
    }
  }, SYNC_INTERVAL);

  // Theo dõi sự kiện thay đổi dữ liệu và đồng bộ lên Supabase
  setupChangeTracking();
}

// Dừng đồng bộ tự động
export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Thiết lập theo dõi sự thay đổi dữ liệu
function setupChangeTracking(): void {
  // Lắng nghe sự kiện thay đổi dữ liệu từ IndexedDB
  const handleDataChange = () => {
    // Đồng bộ lên Supabase sau khi có thay đổi
    syncToSupabase();
  };

  // Đăng ký sự kiện tự tạo khi có thay đổi dữ liệu
  window.addEventListener('data-changed', handleDataChange);
}

// Kích hoạt sự kiện thay đổi dữ liệu (gọi sau khi thêm/sửa/xóa dữ liệu)
export function triggerDataChange(): void {
  window.dispatchEvent(new CustomEvent('data-changed'));
}

// Expose sync functions for manual triggering
export { syncToSupabase, syncFromSupabase };