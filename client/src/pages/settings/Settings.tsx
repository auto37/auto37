import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { settingsDb, Settings } from '@/lib/settings';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    garageName: '',
    garageAddress: '',
    garagePhone: '',
    garageEmail: '',
    garageTaxCode: '',
    logoUrl: '',
    updatedAt: new Date()
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        garageTaxCode: settings.garageTaxCode
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
              <TabsTrigger value="appearance">Giao Diện</TabsTrigger>
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
                  <h3 className="text-lg font-semibold">Cài Đặt In Ấn</h3>
                  <div className="p-4 border rounded-md space-y-4">
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
            </TabsContent>
            
            <TabsContent value="backup" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sao Lưu Dữ Liệu</h3>
                <p className="text-sm text-gray-500">
                  Sao lưu toàn bộ dữ liệu hệ thống, bao gồm khách hàng, phương tiện, kho, hóa đơn và các giao dịch khác.
                </p>
                <div className="flex space-x-2">
                  <Button variant="secondary">
                    <i className="fas fa-download mr-2"></i>
                    Tạo bản sao lưu
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="text-lg font-semibold">Phục Hồi Dữ Liệu</h3>
                <p className="text-sm text-gray-500">
                  Cảnh báo: Phục hồi dữ liệu sẽ ghi đè dữ liệu hiện tại. Hãy đảm bảo bạn đã sao lưu trước khi tiến hành.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="restoreFile">Chọn tệp sao lưu</Label>
                    <Input id="restoreFile" type="file" accept=".json" />
                  </div>
                  <Button variant="destructive">
                    <i className="fas fa-sync-alt mr-2"></i>
                    Phục hồi dữ liệu
                  </Button>
                </div>
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
