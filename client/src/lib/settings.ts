// Lưu trữ và quản lý cài đặt của ứng dụng
import Dexie, { Table } from 'dexie';

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
  updatedAt: Date;
}

// Lớp Dexie để lưu trữ cài đặt
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
