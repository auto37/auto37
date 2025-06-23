import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { settingsDb, Settings } from '@/lib/settings';
import { firebaseService } from '@/lib/firebase';

interface FirebaseConfigProps {
  settings: Settings;
  onSettingsChange: (settings: Partial<Settings>) => void;
}

export function FirebaseConfig({ settings, onSettingsChange }: FirebaseConfigProps) {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onSettingsChange({ [name]: value });
  };

  const handleTestConnection = async () => {
    if (!settings.firebaseApiKey || !settings.firebaseProjectId) {
      toast({
        title: 'Thiếu thông tin',
        description: 'Vui lòng điền đầy đủ API Key và Project ID',
        variant: 'destructive'
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      console.log('Starting connection test with:', {
        apiKey: settings.firebaseApiKey?.substring(0, 10) + '...',
        projectId: settings.firebaseProjectId,
        enabled: settings.firebaseEnabled
      });

      await settingsDb.updateSettings({
        firebaseApiKey: settings.firebaseApiKey,
        firebaseProjectId: settings.firebaseProjectId,
        firebaseEnabled: true
      });
      
      await firebaseService.initialize();
      const isConnected = await firebaseService.testConnection();
      
      if (isConnected) {
        toast({
          title: 'Thành công',
          description: 'Kết nối Firebase thành công! Database sẵn sàng đồng bộ.'
        });
      } else {
        toast({
          title: 'Lỗi kết nối',
          description: 'Không thể kết nối tới Firebase.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      
      toast({
        title: 'Lỗi kết nối',
        description: error.message || 'Không thể kết nối tới Firebase',
        variant: 'destructive'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await settingsDb.updateSettings({
        firebaseApiKey: settings.firebaseApiKey,
        firebaseProjectId: settings.firebaseProjectId
      });
      
      await firebaseService.initialize();  
      await firebaseService.syncAllData();
      
      await settingsDb.updateSettings({ lastSyncTime: new Date() });
      onSettingsChange({ lastSyncTime: new Date() });
      
      toast({
        title: 'Thành công',
        description: 'Đồng bộ dữ liệu lên Firebase thành công!'
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

  const handleLoadFromFirebase = async () => {
    setIsLoading(true);
    try {
      await settingsDb.updateSettings({
        firebaseApiKey: settings.firebaseApiKey,
        firebaseProjectId: settings.firebaseProjectId
      });
      
      await firebaseService.initialize();
      await firebaseService.loadFromFirebase();
      
      toast({
        title: 'Thành công',
        description: 'Tải dữ liệu từ Firebase thành công!'
      });
    } catch (error) {
      console.error('Data load failed:', error);
      toast({
        title: 'Lỗi tải dữ liệu',
        description: 'Có lỗi xảy ra khi tải dữ liệu từ Firebase.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cấu hình Firebase Firestore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Kết nối với Firebase Firestore để đồng bộ dữ liệu cloud. Firestore cung cấp realtime sync và offline support.
          </p>

          <Alert className="border-red-200 bg-red-50">
            <AlertTitle className="text-red-800">🔧 Sửa lỗi syntax trong Firestore Rules</AlertTitle>
            <AlertDescription className="text-red-700">
              <div className="mb-2 font-medium">Sử dụng template mặc định từ Firebase:</div>
              <ol className="list-decimal list-inside space-y-1 text-sm mb-3">
                <li>Vào <a href="https://console.firebase.google.com/project/garage-management-database/firestore/rules" target="_blank" className="text-blue-600 hover:underline font-medium">Firestore Rules</a></li>
                <li>Tìm nút <strong>"Use template"</strong> hoặc <strong>"Test rules"</strong></li>
                <li>Chọn template: <strong>"Allow read/write access on all documents"</strong></li>
                <li>Hoặc thay thế toàn bộ bằng:</li>
              </ol>
              <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono mb-3">
                <div>rules_version = '2';</div>
                <div>service cloud.firestore &#123;</div>
                <div>&nbsp;&nbsp;match /databases/&#123;database&#125;/documents &#123;</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;match /&#123;document=**&#125; &#123;</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if true;</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&#125;</div>
                <div>&nbsp;&nbsp;&#125;</div>
                <div>&#125;</div>
              </div>
              <div className="p-2 bg-red-100 rounded text-sm">
                <strong>Lỗi thường gặp:</strong> Thiếu dấu ngoặc kép hoặc có dấu ngoặc nhọn thừa.
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="firebaseApiKey">Firebase API Key</Label>
            <Input 
              id="firebaseApiKey" 
              name="firebaseApiKey"
              type="text"
              value={settings.firebaseApiKey || ''}
              onChange={handleInputChange}
              placeholder="AIzaSyAX-62emVGaERGjY_zomxJSz3JTwwSapQ4"
            />
            <p className="text-xs text-gray-500">
              API Key từ Firebase Console → Project Settings → General
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firebaseProjectId">Firebase Project ID</Label>
            <Input 
              id="firebaseProjectId" 
              name="firebaseProjectId"
              value={settings.firebaseProjectId || ''}
              onChange={handleInputChange}
              placeholder="my-garage-project"
            />
            <p className="text-xs text-gray-500">
              Project ID từ Firebase Console → Project Settings → General
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="firebaseEnabled" 
              name="firebaseEnabled"
              className="h-4 w-4 rounded border-gray-300"
              checked={settings.firebaseEnabled || false}
              onChange={(e) => onSettingsChange({ firebaseEnabled: e.target.checked })}
            />
            <Label htmlFor="firebaseEnabled" className="cursor-pointer">
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={handleTestConnection}
              variant="outline"
              disabled={!settings.firebaseApiKey || !settings.firebaseProjectId || isTestingConnection}
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
              onClick={handleSyncData}
              disabled={!settings.firebaseEnabled || !settings.firebaseApiKey || !settings.firebaseProjectId || isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Đang đồng bộ...
                </>
              ) : (
                'Đồng bộ lên Firebase'
              )}
            </Button>
            
            <Button 
              onClick={handleLoadFromFirebase}
              variant="destructive"
              disabled={!settings.firebaseEnabled || !settings.firebaseApiKey || !settings.firebaseProjectId || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Đang tải...
                </>
              ) : (
                'Tải từ Firebase'
              )}
            </Button>
          </div>

          <Alert>
            <AlertTitle>Lưu ý quan trọng</AlertTitle>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Test mode</strong>: Database rules cho phép read/write tự do</li>
                <li><strong>Production</strong>: Cần setup authentication và security rules</li>
                <li><strong>Free tier</strong>: 1GB storage, 50K read/day, 20K write/day</li>
                <li><strong>Realtime</strong>: Thay đổi sẽ sync realtime giữa các thiết bị</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}