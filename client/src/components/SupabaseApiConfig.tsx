import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { settingsDb, Settings } from '@/lib/settings';
import { supabaseApiService } from '@/lib/supabase-api';

interface SupabaseApiConfigProps {
  settings: Settings;
  onSettingsChange: (settings: Partial<Settings>) => void;
}

export function SupabaseApiConfig({ settings, onSettingsChange }: SupabaseApiConfigProps) {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onSettingsChange({ [name]: value });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await settingsDb.updateSettings({
        supabaseProjectUrl: settings.supabaseProjectUrl,
        supabaseAnonKey: settings.supabaseAnonKey
      });
      
      await supabaseApiService.initialize();
      const isConnected = await supabaseApiService.testConnection();
      
      if (isConnected) {
        toast({
          title: 'Thành công',
          description: 'Kết nối Supabase API thành công!'
        });
      } else {
        toast({
          title: 'Lỗi kết nối',
          description: 'Không thể kết nối tới Supabase API. Vui lòng kiểm tra Project URL và Anon Key.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: 'Lỗi kết nối',
        description: 'Có lỗi xảy ra khi kiểm tra kết nối.',
        variant: 'destructive'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleInitializeDatabase = async () => {
    setIsInitializing(true);
    try {
      await settingsDb.updateSettings({
        supabaseProjectUrl: settings.supabaseProjectUrl,
        supabaseAnonKey: settings.supabaseAnonKey
      });
      
      await supabaseApiService.initialize();
      const success = await supabaseApiService.initializeDatabase();
      
      if (success) {
        toast({
          title: 'Thành công',
          description: 'Khởi tạo database Supabase thành công!'
        });
      } else {
        toast({
          title: 'Lỗi khởi tạo',
          description: 'Không thể khởi tạo database. Kiểm tra quyền truy cập.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      toast({
        title: 'Lỗi khởi tạo',
        description: 'Có lỗi xảy ra khi khởi tạo database.',
        variant: 'destructive'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await settingsDb.updateSettings({
        supabaseProjectUrl: settings.supabaseProjectUrl,
        supabaseAnonKey: settings.supabaseAnonKey
      });
      
      await supabaseApiService.initialize();  
      await supabaseApiService.syncAllData();
      
      await settingsDb.updateSettings({ lastSyncTime: new Date() });
      onSettingsChange({ lastSyncTime: new Date() });
      
      toast({
        title: 'Thành công',
        description: 'Đồng bộ dữ liệu lên Supabase thành công!'
      });
    } catch (error) {
      console.error('Data sync failed:', error);
      toast({
        title: 'Lỗi đồng bộ',
        description: 'Có lỗi xảy ra khi đồng bộ dữ liệu.',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromSupabase = async () => {
    setIsLoading(true);
    try {
      await settingsDb.updateSettings({
        supabaseProjectUrl: settings.supabaseProjectUrl,
        supabaseAnonKey: settings.supabaseAnonKey
      });
      
      await supabaseApiService.initialize();
      await supabaseApiService.loadFromSupabase();
      
      toast({
        title: 'Thành công',
        description: 'Tải dữ liệu từ Supabase thành công!'
      });
    } catch (error) {
      console.error('Data load failed:', error);
      toast({
        title: 'Lỗi tải dữ liệu',
        description: 'Có lỗi xảy ra khi tải dữ liệu từ Supabase.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu hình Supabase API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Kết nối với Supabase sử dụng JavaScript API để đồng bộ dữ liệu cloud. Phương pháp này ổn định hơn và tránh được vấn đề network.
          </p>

          <Alert>
            <AlertTitle>Hướng dẫn lấy thông tin Supabase</AlertTitle>
            <AlertDescription>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Vào <strong>Supabase Dashboard</strong> → Your Project</li>
                <li>Chọn <strong>Settings</strong> → <strong>API</strong></li>
                <li>Copy <strong>Project URL</strong> và <strong>anon public key</strong></li>
                <li>Paste vào các ô bên dưới</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="supabaseProjectUrl">Supabase Project URL</Label>
            <Input 
              id="supabaseProjectUrl" 
              name="supabaseProjectUrl"
              value={settings.supabaseProjectUrl || ''}
              onChange={handleInputChange}
              placeholder="https://your-project-id.supabase.co"
            />
            <p className="text-xs text-gray-500">
              URL dự án từ Supabase Dashboard → Settings → API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
            <Input 
              id="supabaseAnonKey" 
              name="supabaseAnonKey"
              type="password"
              value={settings.supabaseAnonKey || ''}
              onChange={handleInputChange}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
            />
            <p className="text-xs text-gray-500">
              Public anon key từ Supabase Dashboard → Settings → API
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="supabaseEnabled" 
              name="supabaseEnabled"
              className="h-4 w-4 rounded border-gray-300"
              checked={settings.supabaseEnabled || false}
              onChange={(e) => onSettingsChange({ supabaseEnabled: e.target.checked })}
            />
            <Label htmlFor="supabaseEnabled" className="cursor-pointer">
              Bật đồng bộ dữ liệu tự động
            </Label>
          </div>
          
          {settings.lastSyncTime && (
            <Alert>
              <AlertTitle>Đồng bộ gần nhất</AlertTitle>
              <AlertDescription>
                {new Date(settings.lastSyncTime).toLocaleString('vi-VN')}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleTestConnection}
              variant="outline"
              disabled={!settings.supabaseProjectUrl || !settings.supabaseAnonKey || isTestingConnection}
              className="w-full"
            >
              {isTestingConnection ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Đang kiểm tra...
                </>
              ) : (
                'Kiểm tra kết nối'
              )}
            </Button>
            
            <Button 
              onClick={handleInitializeDatabase}
              variant="secondary"
              disabled={!settings.supabaseProjectUrl || !settings.supabaseAnonKey || isInitializing}
              className="w-full"
            >
              {isInitializing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Đang khởi tạo...
                </>
              ) : (
                'Khởi tạo Database'
              )}
            </Button>
            
            <Button 
              onClick={handleSyncData}
              disabled={!settings.supabaseEnabled || !settings.supabaseProjectUrl || !settings.supabaseAnonKey || isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Đang đồng bộ...
                </>
              ) : (
                'Đồng bộ lên Supabase'
              )}
            </Button>
            
            <Button 
              onClick={handleLoadFromSupabase}
              variant="destructive"
              disabled={!settings.supabaseEnabled || !settings.supabaseProjectUrl || !settings.supabaseAnonKey || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Đang tải...
                </>
              ) : (
                'Tải từ Supabase'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}