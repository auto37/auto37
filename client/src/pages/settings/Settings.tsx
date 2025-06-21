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
import { SupabaseConfig } from '@/components/SupabaseConfig';

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
    supabaseDatabaseUrl: 'postgresql://postgres:1PhuocKhanh@db.tmsvwvajgfdhjrfigtuy.supabase.co:5432/postgres',
    supabaseEnabled: true,
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
      const loadedSettings = await settingsDb.getSettings();
      setSettings(loadedSettings);
      
      if (loadedSettings.logoUrl) {
        setLogoPreview(loadedSettings.logoUrl);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải cài đặt.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let logoUrl = settings.logoUrl;
      
      if (logoFile) {
        logoUrl = await settingsDb.saveLogoAsBase64(logoFile);
      }

      const updatedSettings = {
        ...settings,
        logoUrl,
        updatedAt: new Date()
      };

      await settingsDb.updateSettings(updatedSettings);
      setSettings(updatedSettings);

      toast({
        title: 'Thành công',
        description: 'Đã lưu cài đặt thành công!'
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

  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Backup and restore handlers
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await downloadBackup();
      toast({
        title: 'Thành công',
        description: 'Đã tạo và tải xuống file sao lưu!'
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Lỗi sao lưu',
        description: 'Không thể tạo file sao lưu. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file sao lưu.',
        variant: 'destructive'
      });
      return;
    }

    setIsRestoring(true);
    try {
      const fileContent = await restoreFile.text();
      await importDatabaseFromJson(fileContent);
      
      // Reload settings after restore
      await loadSettings();
      
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
        title: 'Lỗi khôi phục',
        description: 'Không thể khôi phục dữ liệu. Vui lòng kiểm tra file sao lưu.',
        variant: 'destructive'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      await loadSettings(); // Reload default settings
      
      toast({
        title: 'Thành công',
        description: 'Đã xóa toàn bộ dữ liệu!'
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl mb-4"></i>
          <p>Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cài Đặt Hệ Thống</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Thông Tin Chung</TabsTrigger>
          <TabsTrigger value="display">Hiển Thị</TabsTrigger>
          <TabsTrigger value="database">Cơ Sở Dữ Liệu</TabsTrigger>
          <TabsTrigger value="backup">Sao Lưu</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thông Tin Garage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="garageName">Tên garage *</Label>
                    <Input 
                      id="garageName" 
                      name="garageName"
                      value={settings.garageName} 
                      onChange={handleInputChange}
                      placeholder="Garage ABC"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="garageAddress">Địa chỉ</Label>
                    <Input 
                      id="garageAddress" 
                      name="garageAddress"
                      value={settings.garageAddress || ''} 
                      onChange={handleInputChange}
                      placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="garagePhone">Số điện thoại</Label>
                    <Input 
                      id="garagePhone" 
                      name="garagePhone"
                      value={settings.garagePhone || ''} 
                      onChange={handleInputChange}
                      placeholder="0123 456 789"
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
                      placeholder="contact@garage.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="garageTaxCode">Mã số thuế</Label>
                    <Input 
                      id="garageTaxCode" 
                      name="garageTaxCode"
                      value={settings.garageTaxCode || ''} 
                      onChange={handleInputChange}
                      placeholder="0123456789"
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

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
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
          </TabsContent>
        </form>

        <TabsContent value="display" className="space-y-6">
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
                          value={settings.iconColor || '#3b82f6'}
                          onChange={handleInputChange}
                          className="w-20 h-10"
                        />
                        <span className="text-sm text-gray-500">
                          Màu này sẽ áp dụng cho các biểu tượng trong ứng dụng
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <SupabaseConfig 
            settings={settings} 
            onSettingsChange={handleSettingsChange}
          />
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
              <div>
                <Label htmlFor="restore-file">Chọn file sao lưu</Label>
                <Input 
                  id="restore-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  ref={fileInputRef}
                />
              </div>
              
              <Button 
                onClick={handleRestore}
                disabled={!restoreFile || isRestoring}
                variant="destructive"
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
              <strong>Cảnh báo:</strong> Hành động này sẽ xóa toàn bộ dữ liệu và không thể hoàn tác. Hãy tạo bản sao lưu trước khi thực hiện.
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
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <p className="text-sm font-medium text-red-800 mb-4">
                  Bạn có chắc chắn muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.
                </p>
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