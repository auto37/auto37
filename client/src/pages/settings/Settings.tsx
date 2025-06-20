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
import { googleSheetsService } from '@/lib/googlesheets';


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
    googleSheetsId: '',
    googleSheetsApiKey: '',
    googleSheetsWebAppUrl: '',
    googleSheetsEnabled: false,
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
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const currentSettings = await settingsDb.getSettings();
      setSettings(currentSettings);
      if (currentSettings.logoUrl) {
        setLogoPreview(currentSettings.logoUrl);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      let logoUrl = settings.logoUrl;
      
      // Upload logo if new file selected
      if (logoFile) {
        logoUrl = await settingsDb.saveLogoAsBase64(logoFile);
      }
      
      const updatedSettings: Partial<Settings> = {
        ...settings,
        logoUrl,
        updatedAt: new Date()
      };
      
      await settingsDb.updateSettings(updatedSettings);
      setSettings(prev => ({ ...prev, ...updatedSettings }));
      setLogoFile(null);
      
      toast({
        title: 'Thành công',
        description: 'Đã lưu cài đặt thành công!'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lưu cài đặt.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Google Sheets handlers
  const handleTestConnection = async () => {
    try {
      await settingsDb.updateSettings({
        googleSheetsId: settings.googleSheetsId,
        googleSheetsApiKey: settings.googleSheetsApiKey
      });
      
      await googleSheetsService.initialize();
      const isConnected = await googleSheetsService.testConnection();
      
      if (isConnected) {
        toast({
          title: 'Thành công',
          description: 'Kết nối Google Sheets thành công!'
        });
      } else {
        toast({
          title: 'Lỗi kết nối',
          description: 'Không thể kết nối tới Google Sheets. Vui lòng kiểm tra Sheets ID và API Key.',
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
      await googleSheetsService.initialize();
      await googleSheetsService.syncAllData();
      
      const updatedSettings = {
        ...settings,
        lastSyncTime: new Date()
      };
      await settingsDb.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      
      toast({
        title: 'Thành công',
        description: 'Đã đồng bộ dữ liệu lên Google Sheets!'
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

  const handleLoadFromGoogleSheets = async () => {
    try {
      await googleSheetsService.initialize();
      await googleSheetsService.loadFromGoogleSheets();
      
      const updatedSettings = {
        ...settings,
        lastSyncTime: new Date()
      };
      await settingsDb.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      
      toast({
        title: 'Thành công',
        description: 'Đã tải dữ liệu từ Google Sheets!'
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Lỗi tải dữ liệu',
        description: 'Không thể tải dữ liệu từ Google Sheets. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  // Backup and restore handlers
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await downloadBackup();
      toast({
        title: 'Thành công',
        description: 'Đã tải xuống file sao lưu!'
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi tạo file sao lưu.',
        variant: 'destructive'
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    
    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = e.target?.result as string;
          await importDatabaseFromJson(jsonData);
          
          toast({
            title: 'Thành công',
            description: 'Đã khôi phục dữ liệu thành công!'
          });
          
          setRestoreFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          console.error('Error restoring data:', error);
          toast({
            title: 'Lỗi',
            description: 'Có lỗi xảy ra khi khôi phục dữ liệu.',
            variant: 'destructive'
          });
        } finally {
          setIsRestoring(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (error) {
      console.error('Error reading file:', error);
      setIsRestoring(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      toast({
        title: 'Thành công',
        description: 'Đã xóa toàn bộ dữ liệu!'
      });
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi xóa dữ liệu.',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cài Đặt Hệ Thống</h1>
        <Button 
          onClick={handleSaveSettings} 
          disabled={isSaving}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isSaving ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Đang lưu...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              Lưu cài đặt
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Chung</TabsTrigger>
          <TabsTrigger value="display">Hiển thị</TabsTrigger>
          <TabsTrigger value="database">Cơ sở dữ liệu</TabsTrigger>
          <TabsTrigger value="backup">Sao lưu</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông Tin Garage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="garageName">Tên Garage</Label>
                  <Input 
                    id="garageName" 
                    name="garageName"
                    value={settings.garageName} 
                    onChange={handleInputChange}
                    placeholder="Nhập tên garage"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="garageAddress">Địa chỉ</Label>
                  <Input 
                    id="garageAddress" 
                    name="garageAddress"
                    value={settings.garageAddress || ''} 
                    onChange={handleInputChange}
                    placeholder="Nhập địa chỉ garage"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="garagePhone">Số điện thoại</Label>
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
                    placeholder="Nhập email garage"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="garageTaxCode">Mã số thuế</Label>
                  <Input 
                    id="garageTaxCode" 
                    name="garageTaxCode"
                    value={settings.garageTaxCode || ''} 
                    onChange={handleInputChange}
                    placeholder="Nhập mã số thuế"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông Tin Ngân Hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Tên ngân hàng</Label>
                  <Input 
                    id="bankName" 
                    name="bankName"
                    value={settings.bankName || ''} 
                    onChange={handleInputChange}
                    placeholder="Vietcombank, Techcombank, ..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Số tài khoản</Label>
                  <Input 
                    id="bankAccount" 
                    name="bankAccount"
                    value={settings.bankAccount || ''} 
                    onChange={handleInputChange}
                    placeholder="Nhập số tài khoản"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankOwner">Tên chủ tài khoản</Label>
                  <Input 
                    id="bankOwner" 
                    name="bankOwner"
                    value={settings.bankOwner || ''} 
                    onChange={handleInputChange}
                    placeholder="Nhập tên chủ tài khoản"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bankBranch">Chi nhánh</Label>
                  <Input 
                    id="bankBranch" 
                    name="bankBranch"
                    value={settings.bankBranch || ''} 
                    onChange={handleInputChange}
                    placeholder="Chi nhánh ngân hàng"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Logo Garage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Chọn logo (PNG, JPG)</Label>
                <Input 
                  id="logo" 
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              
              {logoPreview && (
                <div className="space-y-2">
                  <Label>Xem trước logo</Label>
                  <div className="flex items-center space-x-4">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-24 h-24 object-contain border rounded-md"
                    />
                    <div className="text-sm text-gray-500">
                      Logo sẽ hiển thị trên các hóa đơn, báo giá và tài liệu in ấn.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Giao Diện & Hiển Thị</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="database" className="space-y-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Cấu Hình Google Sheets</h3>
            <p className="text-sm text-gray-500">
              Kết nối với Google Sheets để đồng bộ dữ liệu giữa các thiết bị và trình duyệt khác nhau. Đơn giản và dễ sử dụng hơn MongoDB.
            </p>
            
            <Alert>
              <i className="fas fa-lightbulb"></i>
              <AlertTitle>Thông tin quan trọng</AlertTitle>
              <AlertDescription>
                <strong>API Key chỉ cho phép đọc dữ liệu.</strong> Để ghi dữ liệu lên Google Sheets, cần thiết lập Google Apps Script Web App URL. 
                Xem hướng dẫn chi tiết trong file <strong>GOOGLE_APPS_SCRIPT_SETUP.md</strong>
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="googleSheetsId">Google Sheets ID hoặc URL đầy đủ</Label>
                <Input 
                  id="googleSheetsId" 
                  name="googleSheetsId"
                  value={settings.googleSheetsId || ''}
                  onChange={handleInputChange}
                  placeholder="Paste URL hoặc chỉ ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                />
                <p className="text-xs text-gray-500">
                  Có thể paste toàn bộ URL Google Sheets hoặc chỉ ID. Hệ thống sẽ tự động trích xuất ID.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="googleSheetsApiKey">Google Sheets API Key</Label>
                <Input 
                  id="googleSheetsApiKey" 
                  name="googleSheetsApiKey"
                  type="password"
                  value={settings.googleSheetsApiKey || ''}
                  onChange={handleInputChange}
                  placeholder="API Key từ Google Cloud Console"
                />
                <p className="text-xs text-gray-500">
                  API Key cho đọc dữ liệu từ Google Sheets (chỉ đọc)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="googleSheetsWebAppUrl">Google Apps Script Web App URL (Tùy chọn)</Label>
                <Input 
                  id="googleSheetsWebAppUrl" 
                  name="googleSheetsWebAppUrl"
                  value={settings.googleSheetsWebAppUrl || ''}
                  onChange={handleInputChange}
                  placeholder="https://script.google.com/macros/s/ABC.../exec"
                />
                <p className="text-xs text-gray-500">
                  Web App URL để ghi dữ liệu lên Google Sheets. Xem hướng dẫn trong GOOGLE_APPS_SCRIPT_SETUP.md
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="googleSheetsEnabled" 
                  name="googleSheetsEnabled"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={settings.googleSheetsEnabled || false}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    googleSheetsEnabled: e.target.checked
                  }))}
                />
                <Label htmlFor="googleSheetsEnabled" className="cursor-pointer">
                  Bật đồng bộ dữ liệu tự động
                </Label>
              </div>
              
              {settings.lastSyncTime && (
                <Alert>
                  <i className="fas fa-info-circle"></i>
                  <AlertTitle>Đồng bộ gần nhất</AlertTitle>
                  <AlertDescription>
                    {new Date(settings.lastSyncTime).toLocaleString('vi-VN')}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-4">
                <Button 
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={!settings.googleSheetsId || !settings.googleSheetsApiKey}
                >
                  <i className="fas fa-plug mr-2"></i>
                  Kiểm tra kết nối
                </Button>
                
                <Button 
                  onClick={handleSyncNow}
                  disabled={!settings.googleSheetsEnabled || !settings.googleSheetsId || !settings.googleSheetsApiKey}
                >
                  <i className="fas fa-sync mr-2"></i>
                  Đồng bộ ngay
                </Button>
                
                <Button 
                  onClick={handleLoadFromGoogleSheets}
                  variant="destructive"
                  disabled={!settings.googleSheetsEnabled || !settings.googleSheetsId || !settings.googleSheetsApiKey}
                >
                  <i className="fas fa-download mr-2"></i>
                  Tải từ Google Sheets
                </Button>
              </div>
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
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download mr-2"></i>
                    Tải xuống bản sao lưu
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Khôi Phục Dữ Liệu</h3>
            <p className="text-sm text-gray-500">
              Khôi phục dữ liệu từ file sao lưu đã tải xuống trước đó.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restore">Chọn file sao lưu (.json)</Label>
                <Input 
                  ref={fileInputRef}
                  id="restore" 
                  type="file"
                  accept=".json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button 
                variant="destructive"
                onClick={handleRestore}
                disabled={!restoreFile || isRestoring}
              >
                {isRestoring ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Đang khôi phục...
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload mr-2"></i>
                    Khôi phục dữ liệu
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-600">Xóa Toàn Bộ Dữ Liệu</h3>
            <p className="text-sm text-gray-500">
              <strong>Cảnh báo:</strong> Thao tác này sẽ xóa hoàn toàn tất cả dữ liệu trong hệ thống và không thể khôi phục.
            </p>
            
            {!showClearConfirm ? (
              <Button 
                variant="destructive"
                onClick={() => setShowClearConfirm(true)}
              >
                <i className="fas fa-trash mr-2"></i>
                Xóa toàn bộ dữ liệu
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <i className="fas fa-exclamation-triangle"></i>
                  <AlertTitle>Xác nhận xóa dữ liệu</AlertTitle>
                  <AlertDescription>
                    Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Thao tác này không thể hoàn tác.
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive"
                    onClick={handleClearData}
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check mr-2"></i>
                        Xác nhận xóa
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Hủy bỏ
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}