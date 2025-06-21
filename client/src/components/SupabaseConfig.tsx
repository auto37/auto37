import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { settingsDb, Settings } from '@/lib/settings';
import { supabaseService } from '@/lib/supabase';

interface SupabaseConfigProps {
  settings: Settings;
  onSettingsChange: (settings: Partial<Settings>) => void;
}

export function SupabaseConfig({ settings, onSettingsChange }: SupabaseConfigProps) {
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
        supabaseDatabaseUrl: settings.supabaseDatabaseUrl
      });
      
      await supabaseService.initialize();
      const isConnected = await supabaseService.testConnection();
      
      if (isConnected) {
        toast({
          title: 'Thành công',
          description: 'Kết nối Supabase thành công!'
        });
      } else {
        toast({
          title: 'Lỗi kết nối',
          description: 'Không thể kết nối tới Supabase. Vui lòng kiểm tra Database URL.',
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
        supabaseDatabaseUrl: settings.supabaseDatabaseUrl
      });
      
      await supabaseService.initialize();
      const success = await supabaseService.initializeDatabase();
      
      if (success) {
        toast({
          title: 'Thành công',
          description: 'Khởi tạo database Supabase thành công!'
        });
      } else {
        toast({
          title: 'Lỗi khởi tạo',
          description: 'Không thể khởi tạo database.',
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
        supabaseDatabaseUrl: settings.supabaseDatabaseUrl
      });
      
      await supabaseService.initialize();  
      await supabaseService.syncAllData();
      
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
        supabaseDatabaseUrl: settings.supabaseDatabaseUrl
      });
      
      await supabaseService.initialize();
      await supabaseService.loadFromSupabase();
      
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
        <CardTitle>Cấu hình Supabase Database</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Kết nối với Supabase PostgreSQL database để đồng bộ dữ liệu cloud. Điều này giúp bạn truy cập và quản lý dữ liệu từ nhiều thiết bị khác nhau.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="supabaseDatabaseUrl">Supabase Database URL</Label>
            <Input 
              id="supabaseDatabaseUrl" 
              name="supabaseDatabaseUrl"
              type="password"
              value={settings.supabaseDatabaseUrl || ''}
              onChange={handleInputChange}
              placeholder="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"
            />
            <p className="text-xs text-gray-500">
              Lấy connection string từ Supabase Dashboard → Settings → Database. Xem hướng dẫn trong SUPABASE_SETUP.md
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
              disabled={!settings.supabaseDatabaseUrl || isTestingConnection}
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
              disabled={!settings.supabaseDatabaseUrl || isInitializing}
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
              disabled={!settings.supabaseEnabled || !settings.supabaseDatabaseUrl || isSyncing}
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
              disabled={!settings.supabaseEnabled || !settings.supabaseDatabaseUrl || isLoading}
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