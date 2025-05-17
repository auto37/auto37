// Lưu trữ và quản lý cài đặt của ứng dụng
import Dexie, { Table } from 'dexie';
import { supabaseSettingsService } from './supabase-services/settings';
import { supabase } from './supabase';

// Định nghĩa kiểu dữ liệu cài đặt
export interface Settings {
  id?: number;
  garageName: string;
  garageAddress?: string;
  garagePhone?: string;
  garageEmail?: string;
  garageTaxCode?: string;
  logoUrl?: string;
  iconColor?: string;
  useSupabase?: boolean; // Tùy chọn sử dụng Supabase
  updatedAt: Date;
}

// Kiểm tra xem có thể kết nối Supabase hay không
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const SUPABASE_AVAILABLE = supabaseUrl && supabaseKey && supabaseUrl.length > 0 && supabaseKey.length > 0;

// Kiểm tra cài đặt người dùng về việc sử dụng Supabase (localStorage)
const userPreference = localStorage.getItem('useSupabase');
// Chỉ sử dụng Supabase nếu có thể kết nối và người dùng không tắt
const USE_SUPABASE = SUPABASE_AVAILABLE && (userPreference === null || userPreference === 'true');

// Lớp Dexie để lưu trữ cài đặt cục bộ (fallback)
class SettingsDatabase extends Dexie {
  settings!: Table<Settings>;

  constructor() {
    super('settingsDatabase');
    this.version(1).stores({
      settings: '++id, updatedAt'
    });
  }

  // Lấy cài đặt hiện tại
  async getSettings(): Promise<Settings> {
    // Chỉ sử dụng Supabase nếu có kết nối
    if (USE_SUPABASE) {
      try {
        // Thử lấy cài đặt từ Supabase
        const settings = await supabaseSettingsService.getSettings();
        return settings;
      } catch (error) {
        console.error('Lỗi khi lấy cài đặt từ Supabase:', error);
        console.log('Fallback sang IndexedDB...');
        // Sau khi có lỗi, tắt tùy chọn sử dụng Supabase cho session này
        (window as any).DISABLE_SUPABASE = true;
      }
    }
    
    // Fallback sang IndexedDB nếu không kết nối được Supabase
    const allSettings = await this.settings.toArray();
    
    // Nếu không có cài đặt nào, tạo mới với giá trị mặc định
    if (allSettings.length === 0) {
      const defaultSettings: Settings = {
        garageName: 'Garage Manager',
        garageAddress: '',
        garagePhone: '',
        garageEmail: '',
        garageTaxCode: '',
        logoUrl: '',
        iconColor: '#f97316', // Màu cam mặc định (orange-500)
        updatedAt: new Date()
      };
      
      await this.settings.add(defaultSettings);
      return defaultSettings;
    }
    
    // Trả về cài đặt gần nhất
    return allSettings[0];
  }

  // Cập nhật cài đặt
  async updateSettings(settings: Partial<Settings>): Promise<void> {
    // Nếu có kết nối Supabase, sử dụng Supabase
    if (USE_SUPABASE) {
      try {
        await supabaseSettingsService.updateSettings(settings);
        return;
      } catch (error) {
        console.error('Lỗi khi cập nhật cài đặt trên Supabase:', error);
        console.log('Fallback sang IndexedDB...');
      }
    }
    
    // Fallback sang IndexedDB
    const currentSettings = await this.getSettings();
    
    // Cập nhật cài đặt với ID hiện tại
    if (currentSettings.id) {
      await this.settings.update(currentSettings.id, {
        ...settings,
        updatedAt: new Date()
      });
    }
  }

  // Lưu ảnh dưới dạng base64
  async saveLogoAsBase64(file: File): Promise<string> {
    // Nếu có kết nối Supabase, sử dụng Supabase
    if (USE_SUPABASE) {
      try {
        return await supabaseSettingsService.saveLogoAsBase64(file);
      } catch (error) {
        console.error('Lỗi khi lưu logo trên Supabase:', error);
        console.log('Fallback sang IndexedDB...');
      }
    }
    
    // Fallback sang IndexedDB
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (event.target && typeof event.target.result === 'string') {
          const base64data = event.target.result;
          
          try {
            const currentSettings = await this.getSettings();
            if (currentSettings.id) {
              await this.settings.update(currentSettings.id, {
                logoUrl: base64data,
                updatedAt: new Date()
              });
            }
            
            resolve(base64data);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('Không thể đọc file'));
        }
      };
      
      reader.onerror = () => {
        reject(reader.error);
      };
      
      reader.readAsDataURL(file);
    });
  }
}

export const settingsDb = new SettingsDatabase();

// Khởi tạo giá trị mặc định
const initializeSettings = async () => {
  await settingsDb.getSettings();
};

initializeSettings();

export default settingsDb;
