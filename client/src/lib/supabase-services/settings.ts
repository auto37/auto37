// Supabase service cho Settings
import { supabase, handleSupabaseError } from '../supabase';
import { Settings } from '../settings';

// Định nghĩa kiểu dữ liệu Settings cho Supabase
export interface SupabaseSettings {
  id?: number;
  garage_name: string;
  garage_address?: string;
  garage_phone?: string;
  garage_email?: string;
  garage_tax_code?: string;
  logo_url?: string;
  icon_color?: string;
  updated_at: string;
}

// Chuyển đổi từ SupabaseSettings sang Settings
function mapToSettings(data: SupabaseSettings): Settings {
  return {
    id: data.id,
    garageName: data.garage_name,
    garageAddress: data.garage_address,
    garagePhone: data.garage_phone,
    garageEmail: data.garage_email,
    garageTaxCode: data.garage_tax_code,
    logoUrl: data.logo_url,
    iconColor: data.icon_color,
    updatedAt: new Date(data.updated_at)
  };
}

// Chuyển đổi từ Settings sang SupabaseSettings
function mapFromSettings(data: Partial<Settings>): Partial<SupabaseSettings> {
  const result: Partial<SupabaseSettings> = {};
  
  if (data.garageName !== undefined) result.garage_name = data.garageName;
  if (data.garageAddress !== undefined) result.garage_address = data.garageAddress;
  if (data.garagePhone !== undefined) result.garage_phone = data.garagePhone;
  if (data.garageEmail !== undefined) result.garage_email = data.garageEmail;
  if (data.garageTaxCode !== undefined) result.garage_tax_code = data.garageTaxCode;
  if (data.logoUrl !== undefined) result.logo_url = data.logoUrl;
  if (data.iconColor !== undefined) result.icon_color = data.iconColor;
  
  return result;
}

// Service cho Settings
export class SupabaseSettingsService {
  // Lấy cài đặt từ Supabase
  async getSettings(): Promise<Settings> {
    if (!supabase) {
      throw new Error('Không thể kết nối đến Supabase: Thông tin kết nối chưa được cấu hình');
    }
    
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single();
      
      if (error) {
        throw error;
      }
      
      return mapToSettings(data as SupabaseSettings);
    } catch (error: any) {
      // Nếu không có dữ liệu trong DB, tạo mới với giá trị mặc định
      if (error.code === 'PGRST116') {
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
        
        await this.createSettings(defaultSettings);
        return defaultSettings;
      }
      
      throw new Error(handleSupabaseError(error, 'lấy cài đặt'));
    }
  }
  
  // Tạo mới cài đặt trong Supabase
  async createSettings(settings: Settings): Promise<void> {
    if (!supabase) {
      throw new Error('Không thể kết nối đến Supabase: Thông tin kết nối chưa được cấu hình');
    }
    
    try {
      const { error } = await supabase
        .from('settings')
        .insert(mapFromSettings(settings));
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'tạo cài đặt'));
    }
  }
  
  // Cập nhật cài đặt trong Supabase
  async updateSettings(settings: Partial<Settings>): Promise<void> {
    if (!supabase) {
      throw new Error('Không thể kết nối đến Supabase: Thông tin kết nối chưa được cấu hình');
    }
    
    try {
      // Lấy settings hiện tại trước
      const currentSettings = await this.getSettings();
      
      if (!currentSettings.id) {
        // Nếu không có settings, tạo mới
        await this.createSettings({
          ...currentSettings,
          ...settings,
          updatedAt: new Date()
        });
        return;
      }
      
      // Có settings, cập nhật
      const { error } = await supabase
        .from('settings')
        .update({
          ...mapFromSettings(settings),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSettings.id);
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'cập nhật cài đặt'));
    }
  }
  
  // Lưu logo dưới dạng base64
  async saveLogoAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (event.target && typeof event.target.result === 'string') {
          const base64data = event.target.result;
          
          try {
            const currentSettings = await this.getSettings();
            
            await this.updateSettings({
              logoUrl: base64data
            });
            
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

export const supabaseSettingsService = new SupabaseSettingsService();