import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { settingsDb, Settings } from '@/lib/settings';
import { downloadBackup, importDatabaseFromJson, clearAllData } from '@/lib/backup';
import { mongoDBService } from '@/lib/mongodb';


export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    garageName: '',
    garageAddress: '',
    garagePhone: '',
    garageEmail: '',
    garageTaxCode: '',
    logoUrl: '',
    bankName: '',
    bankAccount: '',
    bankOwner: '',
    bankBranch: '',
    mongoConnectionString: '',
    mongoDatabaseName: '',
    mongoEnabled: false,
    mongoDataApiUrl: '',
    mongoApiKey: '',
    lastSyncTime: undefined,
    updatedAt: new Date()
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const currentSettings = await settingsDb.getSettings();
        setSettings(currentSettings);
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải cài đặt. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Kiểm tra xem có phải là file ảnh hay không
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn tệp tin ảnh hợp lệ (JPEG, PNG, SVG).',
          variant: 'destructive'
        });
        return;
      }
      
      // Kiểm tra kích thước file (<=2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Lỗi',
          description: 'Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 2MB.',
          variant: 'destructive'
        });
        return;
      }
      
      setLogoFile(file);
      
      // Hiển thị ảnh preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setLogoPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Lưu cài đặt cơ bản
      await settingsDb.updateSettings({
        garageName: settings.garageName,
        garageAddress: settings.garageAddress,
        garagePhone: settings.garagePhone,
        garageEmail: settings.garageEmail,
        garageTaxCode: settings.garageTaxCode,
        iconColor: settings.iconColor
      });
      
      // Nếu có logo mới, lưu logo
      if (logoFile) {
        await settingsDb.saveLogoAsBase64(logoFile);
      }
      
      toast({
        title: 'Thành công',
        description: 'Đã lưu cài đặt.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu cài đặt. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Xử lý sao lưu dữ liệu
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await downloadBackup();
      
      toast({
        title: 'Thành công',
        description: 'Đã tạo bản sao lưu dữ liệu.',
      });
    } catch (error) {
      console.error('Error backing up data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo bản sao lưu. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsBackingUp(false);
    }
  };
  
  // Xử lý khi chọn file khôi phục
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Kiểm tra định dạng file
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn file JSON hợp lệ.',
          variant: 'destructive'
        });
        return;
      }
      
      setRestoreFile(file);
    }
  };
  
  // Xử lý khôi phục dữ liệu
  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file sao lưu để khôi phục.',
        variant: 'destructive'
      });
      return;
    }
    
    const confirmRestore = window.confirm(
      'Khôi phục dữ liệu sẽ xóa toàn bộ dữ liệu hiện tại và thay thế bằng dữ liệu từ file sao lưu. Bạn có chắc chắn muốn tiếp tục?'
    );
    
    if (!confirmRestore) return;
    
    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target && typeof event.target.result === 'string') {
          try {
            await importDatabaseFromJson(event.target.result);
            
            // Tải lại cài đặt sau khi khôi phục
            const currentSettings = await settingsDb.getSettings();
            setSettings(currentSettings);
            if (currentSettings.logoUrl) {
              setLogoPreview(currentSettings.logoUrl);
            }
            
            toast({
              title: 'Thành công',
              description: 'Đã khôi phục dữ liệu thành công.',
            });
            
            // Reset file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setRestoreFile(null);
            
          } catch (importError) {
            console.error('Error importing data:', importError);
            toast({
              title: 'Lỗi',
              description: 'Không thể khôi phục dữ liệu. File sao lưu có thể không hợp lệ.',
              variant: 'destructive'
            });
          }
        }
      };
      reader.readAsText(restoreFile);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể đọc file sao lưu. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsRestoring(false);
    }
  };
  
  // Xử lý xóa toàn bộ dữ liệu
  const handleClearData = async () => {
    const confirmClear = window.confirm(
      'CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu trong hệ thống. Bạn có chắc chắn muốn tiếp tục?'
    );
    
    if (!confirmClear) return;
    
    // Yêu cầu xác nhận lần thứ hai
    const confirmFinal = window.confirm(
      'ĐÂY LÀ THAO TÁC XÓA VĨNH VIỄN. Nhập "XÓA" để xác nhận.'
    );
    
    if (!confirmFinal) return;
    
    setIsClearing(true);
    try {
      await clearAllData();
      
      // Khởi tạo lại cài đặt
      const currentSettings = await settingsDb.getSettings();
      setSettings(currentSettings);
      setLogoPreview('');
      
      toast({
        title: 'Thành công',
        description: 'Đã xóa toàn bộ dữ liệu.',
      });
      
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa dữ liệu. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };

  // MongoDB handlers
  const handleTestConnection = async () => {
    try {
      await settingsDb.updateSettings({
        mongoConnectionString: settings.mongoConnectionString,
        mongoDatabaseName: settings.mongoDatabaseName
      });
      
      await mongoDBService.initialize();
      const isConnected = await mongoDBService.testConnection();
      
      if (isConnected) {
        toast({
          title: 'Thành công',
          description: 'Kết nối MongoDB thành công!'
        });
      } else {
        toast({
          title: 'Lỗi kết nối',
          description: 'Không thể kết nối tới MongoDB. Vui lòng kiểm tra Connection String và Database Name.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi kiểm tra kết nối.',
        variant: 'destructive'
      });
    }
  };

  const handleSyncNow = async () => {
    try {
      await mongoDBService.initialize();
      await mongoDBService.syncAllData();
      
      const updatedSettings = {
        ...settings,
        lastSyncTime: new Date()
      };
      await settingsDb.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      
      toast({
        title: 'Thành công',
        description: 'Đã đồng bộ dữ liệu lên MongoDB!'
      });
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: 'Lỗi đồng bộ',
        description: 'Không thể đồng bộ dữ liệu. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const handleLoadFromMongoDB = async () => {
    try {
      await mongoDBService.initialize();
      await mongoDBService.loadFromMongoDB();
      
      const updatedSettings = {
        ...settings,
        lastSyncTime: new Date()
      };
      await settingsDb.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      
      toast({
        title: 'Thành công',
        description: 'Đã tải dữ liệu từ MongoDB!'
      });
    } catch (error) {
      console.error('Error loading from MongoDB:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải dữ liệu từ MongoDB. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Cài Đặt Hệ Thống</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="garage">
            <TabsList className="mb-4">
              <TabsTrigger value="garage">Thông Tin Gara</TabsTrigger>
              <TabsTrigger value="bank">Thông Tin Ngân Hàng</TabsTrigger>
              <TabsTrigger value="appearance">Giao Diện</TabsTrigger>
              <TabsTrigger value="database">Cơ Sở Dữ Liệu</TabsTrigger>
              <TabsTrigger value="backup">Sao Lưu & Phục Hồi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="garage" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="garageName">Tên Gara</Label>
                  <Input 
                    id="garageName" 
                    name="garageName"
                    value={settings.garageName}
                    onChange={handleInputChange}
                    placeholder="Nhập tên gara"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="garagePhone">Số Điện Thoại</Label>
                  <Input 
                    id="garagePhone" 
                    name="garagePhone"
                    value={settings.garagePhone || ''}
                    onChange={handleInputChange}
                    placeholder="Nhập số điện thoại"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="garageEmail">Email</Label>
                  <Input 
                    id="garageEmail" 
                    name="garageEmail"
                    type="email"
                    value={settings.garageEmail || ''}
                    onChange={handleInputChange}
                    placeholder="Nhập địa chỉ email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="garageTaxCode">Mã Số Thuế</Label>
                  <Input 
                    id="garageTaxCode" 
                    name="garageTaxCode"
                    value={settings.garageTaxCode || ''}
                    onChange={handleInputChange}
                    placeholder="Nhập mã số thuế (nếu có)"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="garageAddress">Địa Chỉ</Label>
                  <Input 
                    id="garageAddress" 
                    name="garageAddress"
                    value={settings.garageAddress || ''}
                    onChange={handleInputChange}
                    placeholder="Nhập địa chỉ gara"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="bank" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Tên Ngân Hàng</Label>
                  <Input 
                    id="bankName" 
                    name="bankName"
                    value={settings.bankName || ''}
                    onChange={handleInputChange}
                    placeholder="VD: Ngân hàng TMCP Đầu tư và Phát triển Việt Nam"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Số Tài Khoản</Label>
                  <Input 
                    id="bankAccount" 
                    name="bankAccount"
                    value={settings.bankAccount || ''}
                    onChange={handleInputChange}
                    placeholder="VD: 1234567890123"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankOwner">Tên Chủ Tài Khoản</Label>
                  <Input 
                    id="bankOwner" 
                    name="bankOwner"
                    value={settings.bankOwner || ''}
                    onChange={handleInputChange}
                    placeholder="VD: NGUYEN VAN A"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankBranch">Chi Nhánh</Label>
                  <Input 
                    id="bankBranch" 
                    name="bankBranch"
                    value={settings.bankBranch || ''}
                    onChange={handleInputChange}
                    placeholder="VD: Chi nhánh Hà Nội"
                  />
                </div>
              </div>
              
              <Alert>
                <AlertTitle>Lưu ý</AlertTitle>
                <AlertDescription>
                  Thông tin ngân hàng sẽ được hiển thị trên các phiếu báo giá, lệnh sửa chữa và hóa đơn quyết toán để khách hàng có thể thực hiện thanh toán.
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Logo Gara</h3>
                  <div className="p-4 border rounded-md">
                    {logoPreview ? (
                      <div className="mb-4 flex justify-center">
                        <img 
                          src={logoPreview} 
                          alt="Logo gara" 
                          className="max-h-40 max-w-full rounded"
                        />
                      </div>
                    ) : (
                      <div className="mb-4 p-8 text-center bg-gray-100 rounded">
                        <p className="text-gray-500">Chưa có logo</p>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="logoFile">Tải lên logo mới</Label>
                      <Input 
                        id="logoFile" 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                      <p className="text-xs text-gray-500">
                        Kích thước khuyến nghị: 200x100 pixels. Định dạng JPEG, PNG hoặc SVG. Tối đa 2MB.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Cài Đặt Hiển Thị</h3>
                  <div className="p-4 border rounded-md space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="iconColor">Màu Biểu Tượng (Icon)</Label>
                        <div className="flex items-center gap-4">
                          <Input 
                            id="iconColor" 
                            name="iconColor"
                            type="color"
                            value={settings.iconColor || '#f97316'} 
                            onChange={handleInputChange}
                            className="w-16 h-10 p-1 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="text-sm">
                              Màu hiển thị cho các biểu tượng trong thanh bên
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mt-4">
                      <h4 className="text-md font-medium">Cài Đặt In Ấn</h4>
                      <p className="text-sm text-gray-500">
                        Các tùy chọn hiển thị khi in ấn báo giá, hóa đơn và báo cáo.
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="showLogo" 
                            className="h-4 w-4 rounded border-gray-300"
                            checked
                          />
                          <Label htmlFor="showLogo" className="cursor-pointer">Hiển thị logo trên tài liệu in</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="showContactInfo" 
                            className="h-4 w-4 rounded border-gray-300"
                            checked
                          />
                          <Label htmlFor="showContactInfo" className="cursor-pointer">Hiển thị thông tin liên hệ</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            

            
            <TabsContent value="database" className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Cấu Hình MongoDB</h3>
                <p className="text-sm text-gray-500">
                  Kết nối với MongoDB để đồng bộ dữ liệu giữa các thiết bị và trình duyệt khác nhau.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="mongoConnectionString">MongoDB Connection String</Label>
                    <Input 
                      id="mongoConnectionString" 
                      name="mongoConnectionString"
                      value={settings.mongoConnectionString || ''}
                      onChange={handleInputChange}
                      placeholder="mongodb+srv://username:password@cluster.mongodb.net/"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mongoDatabaseName">Tên Database</Label>
                    <Input 
                      id="mongoDatabaseName" 
                      name="mongoDatabaseName"
                      value={settings.mongoDatabaseName || ''}
                      onChange={handleInputChange}
                      placeholder="garage_management"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mongoDataApiUrl">MongoDB Data API URL</Label>
                    <Input 
                      id="mongoDataApiUrl" 
                      name="mongoDataApiUrl"
                      value={settings.mongoDataApiUrl || ''}
                      onChange={handleInputChange}
                      placeholder="https://data.mongodb-api.com/app/your-app-id/endpoint/data/v1"
                    />
                    <p className="text-xs text-gray-500">
                      URL của MongoDB Atlas Data API từ App Services
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mongoApiKey">MongoDB API Key</Label>
                    <Input 
                      id="mongoApiKey" 
                      name="mongoApiKey"
                      type="password"
                      value={settings.mongoApiKey || ''}
                      onChange={handleInputChange}
                      placeholder="API Key từ MongoDB Atlas"
                    />
                    <p className="text-xs text-gray-500">
                      API Key được tạo trong MongoDB Atlas App Services
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="mongoEnabled" 
                      name="mongoEnabled"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={settings.mongoEnabled || false}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        mongoEnabled: e.target.checked
                      }))}
                    />
                    <Label htmlFor="mongoEnabled" className="cursor-pointer">
                      Bật đồng bộ dữ liệu tự động
                    </Label>
                  </div>
                  
                  {settings.lastSyncTime && (
                    <div className="text-sm text-gray-500">
                      Đồng bộ lần cuối: {new Date(settings.lastSyncTime).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
                
                <Alert>
                  <AlertTitle>Hướng dẫn thiết lập MongoDB</AlertTitle>
                  <AlertDescription>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Đăng nhập vào <a href="https://mongodb.com/atlas" target="_blank" className="text-blue-600 underline">MongoDB Atlas</a></li>
                      <li>Tạo cluster mới hoặc sử dụng cluster hiện có</li>
                      <li>Vào Database → Connect để lấy Connection String</li>
                      <li>Chọn "Connect your application" và copy connection string</li>
                      <li>Thay thế &lt;password&gt; bằng mật khẩu thực của bạn</li>
                      <li>Nhập tên database (ví dụ: garage_management)</li>
                      <li>Bật đồng bộ để tự động cập nhật dữ liệu</li>
                    </ol>
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={handleTestConnection}
                    variant="outline"
                    disabled={!settings.mongoConnectionString || !settings.mongoDatabaseName}
                  >
                    <i className="fas fa-plug mr-2"></i>
                    Kiểm tra kết nối
                  </Button>
                  
                  <Button 
                    onClick={handleSyncNow}
                    disabled={!settings.mongoEnabled || !settings.mongoConnectionString || !settings.mongoDatabaseName}
                  >
                    <i className="fas fa-sync mr-2"></i>
                    Đồng bộ ngay
                  </Button>
                  
                  <Button 
                    onClick={handleLoadFromMongoDB}
                    variant="destructive"
                    disabled={!settings.mongoEnabled || !settings.mongoConnectionString || !settings.mongoDatabaseName}
                  >
                    <i className="fas fa-download mr-2"></i>
                    Tải từ MongoDB
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="backup" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sao Lưu Dữ Liệu</h3>
                <p className="text-sm text-gray-500">
                  Sao lưu toàn bộ dữ liệu hệ thống, bao gồm khách hàng, phương tiện, kho, hóa đơn và các giao dịch khác.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="secondary"
                    onClick={handleBackup}
                    disabled={isBackingUp}
                  >
                    {isBackingUp ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Đang tạo sao lưu...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-download mr-2"></i>
                        Tạo bản sao lưu
                      </>
                    )}
                  </Button>
                </div>
                
                <Alert className="my-4">
                  <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                  <AlertTitle>Lưu ý về sao lưu</AlertTitle>
                  <AlertDescription>
                    Dữ liệu được lưu trong trình duyệt của bạn (IndexedDB). Để đảm bảo an toàn dữ liệu, 
                    bạn nên thường xuyên thực hiện sao lưu và lưu trữ các file sao lưu ở nơi an toàn.
                  </AlertDescription>
                </Alert>
                
                <Separator className="my-4" />
                
                <h3 className="text-lg font-semibold">Phục Hồi Dữ Liệu</h3>
                <p className="text-sm text-gray-500">
                  Cảnh báo: Phục hồi dữ liệu sẽ ghi đè dữ liệu hiện tại. Hãy đảm bảo bạn đã sao lưu trước khi tiến hành.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restoreFile">Chọn tệp sao lưu</Label>
                    <Input 
                      id="restoreFile" 
                      type="file" 
                      accept=".json" 
                      ref={fileInputRef}
                      onChange={handleRestoreFileChange} 
                      disabled={isRestoring}
                    />
                    {restoreFile && (
                      <p className="text-sm text-green-600">
                        Đã chọn: {restoreFile.name}
                      </p>
                    )}
                  </div>
                  <Button 
                    variant="destructive"
                    onClick={handleRestore}
                    disabled={!restoreFile || isRestoring}
                  >
                    {isRestoring ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Đang phục hồi...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt mr-2"></i>
                        Phục hồi dữ liệu
                      </>
                    )}
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="text-lg font-semibold">Xóa Tất Cả Dữ Liệu</h3>
                <p className="text-sm text-gray-500">
                  Cảnh báo: Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu. Hãy đảm bảo bạn đã sao lưu trước.
                </p>
                
                <Alert variant="destructive">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <AlertTitle>Thao tác nguy hiểm</AlertTitle>
                  <AlertDescription>
                    Dữ liệu đã xóa không thể khôi phục trừ khi bạn có bản sao lưu. 
                    Thao tác này sẽ xóa tất cả khách hàng, phương tiện, hóa đơn, báo giá và tất cả dữ liệu khác.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isClearing}
                  className="bg-red-700 hover:bg-red-800"
                >
                  {isClearing ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Đang xóa dữ liệu...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash-alt mr-2"></i>
                      Xóa Tất Cả Dữ Liệu
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              type="button" 
              onClick={handleSaveSettings}
              disabled={isSaving || isLoading}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang Lưu...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Lưu Cài Đặt
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
