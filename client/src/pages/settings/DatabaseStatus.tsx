import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { testSupabaseConnection, checkSupabaseTables, createInitialSettings } from '@/lib/test-supabase';
import { settingsDb } from '@/lib/settings';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle,
  Check,
  X,
  Database,
  Loader2,
  HardDrive,
  Cloud
} from 'lucide-react';
import { supabase, isSupabaseInitialized } from '@/lib/supabase';

export default function DatabaseStatus() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [tableStatus, setTableStatus] = useState<{ [key: string]: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTables, setIsCreatingTables] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isInitialSettingsCreated, setIsInitialSettingsCreated] = useState<boolean | null>(null);
  const [useSupabase, setUseSupabase] = useState<boolean>(false);
  const [isSwitchingDatabase, setIsSwitchingDatabase] = useState(false);
  
  // Kiểm tra kết nối và tùy chọn DB khi trang được tải
  useEffect(() => {
    checkConnection();
    loadDatabasePreference();
  }, []);
  
  // Lấy tùy chọn cơ sở dữ liệu từ cài đặt
  const loadDatabasePreference = async () => {
    try {
      const settings = await settingsDb.getSettings();
      setUseSupabase(settings.useSupabase || false);
    } catch (error) {
      console.error('Lỗi khi tải tùy chọn cơ sở dữ liệu:', error);
      setUseSupabase(false);
    }
  };
  
  // Kiểm tra kết nối Supabase
  const checkConnection = async () => {
    setIsTestingConnection(true);
    try {
      const connected = await testSupabaseConnection();
      setIsConnected(connected);
      
      if (connected) {
        const tables = await checkSupabaseTables();
        setTableStatus(tables);
      }
    } catch (error) {
      console.error('Lỗi kiểm tra kết nối:', error);
      setIsConnected(false);
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Thiết lập cấu trúc cơ sở dữ liệu ban đầu
  const setupDatabase = async () => {
    setIsCreatingTables(true);
    
    try {
      // Thông báo cho người dùng cách thực hiện việc này
      toast({
        title: 'Hướng dẫn thiết lập',
        description: 'Vui lòng truy cập vào Supabase Dashboard, mở SQL Editor và chạy mã SQL trong tệp supabase/migrations.sql để tạo cấu trúc cơ sở dữ liệu.',
      });
      
      // Tạo cài đặt ban đầu
      const initialSettingsCreated = await createInitialSettings();
      setIsInitialSettingsCreated(initialSettingsCreated);
      
      if (initialSettingsCreated) {
        toast({
          title: 'Thành công',
          description: 'Đã tạo dữ liệu cài đặt ban đầu.',
        });
      }
      
      // Kiểm tra lại trạng thái bảng
      await checkConnection();
    } catch (error) {
      console.error('Lỗi thiết lập cơ sở dữ liệu:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thiết lập cơ sở dữ liệu. Vui lòng kiểm tra lại kết nối.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingTables(false);
    }
  };
  
  // Hiển thị hướng dẫn thiết lập
  const showSetupInstructions = () => {
    toast({
      title: 'Hướng dẫn thiết lập',
      description: 'Vui lòng truy cập vào Supabase Dashboard, mở SQL Editor và chạy mã SQL trong tệp supabase/migrations.sql để tạo cấu trúc cơ sở dữ liệu.',
    });
  };
  
  // Xử lý khi người dùng thay đổi tùy chọn cơ sở dữ liệu
  const handleDatabaseChange = async (newUseSupabase: boolean) => {
    // Nếu chọn Supabase nhưng không có kết nối, hiện thông báo
    if (newUseSupabase && !isConnected) {
      toast({
        title: 'Lỗi',
        description: 'Không thể kết nối đến Supabase. Vui lòng kiểm tra kết nối trước.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSwitchingDatabase(true);
    
    try {
      // Cập nhật cài đặt trong localStorage ngay lập tức để ảnh hưởng đến lần tải trang tiếp theo
      localStorage.setItem('useSupabase', newUseSupabase.toString());
      
      // Cập nhật cài đặt trong cơ sở dữ liệu
      const settings = await settingsDb.getSettings();
      await settingsDb.updateSettings({
        ...settings,
        useSupabase: newUseSupabase
      });
      
      // Cập nhật state
      setUseSupabase(newUseSupabase);
      
      toast({
        title: 'Thành công',
        description: `Đã chuyển sang sử dụng ${newUseSupabase ? 'Supabase (đám mây)' : 'IndexedDB (cục bộ)'}. Thay đổi sẽ có hiệu lực sau khi tải lại trang.`,
      });
      
    } catch (error) {
      console.error('Lỗi khi thay đổi cơ sở dữ liệu:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể thay đổi cơ sở dữ liệu. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsSwitchingDatabase(false);
    }
  };
  
  // Hiển thị thông tin kết nối
  const renderConnectionStatus = () => {
    if (isTestingConnection) {
      return (
        <Alert className="mb-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <AlertTitle>Đang kiểm tra kết nối...</AlertTitle>
        </Alert>
      );
    }
    
    if (isConnected === null) {
      return null;
    }
    
    if (isConnected) {
      return (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500 mr-2" />
          <AlertTitle className="text-green-700">Kết nối thành công</AlertTitle>
          <AlertDescription className="text-green-600">
            Đã kết nối thành công đến Supabase. Kiểm tra trạng thái các bảng dưới đây.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Kiểm tra xem biến môi trường đã được cấu hình chưa
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY) {
      return (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
          <AlertTitle className="text-amber-700">Thiếu thông tin kết nối</AlertTitle>
          <AlertDescription className="text-amber-600">
            Biến môi trường Supabase chưa được cấu hình. Vui lòng thiết lập VITE_SUPABASE_URL và VITE_SUPABASE_KEY trong môi trường.
            <div className="mt-2">
              <p className="font-medium">Hướng dẫn thiết lập:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>Truy cập Replit {'->'} Tools {'->'} Secrets</li>
                <li>Thêm VITE_SUPABASE_URL và VITE_SUPABASE_KEY từ tài khoản Supabase</li>
                <li>Khởi động lại ứng dụng sau khi thêm secrets</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert className="mb-4 bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
        <AlertTitle className="text-red-700">Lỗi kết nối</AlertTitle>
        <AlertDescription className="text-red-600">
          Không thể kết nối đến Supabase. Vui lòng kiểm tra lại URL và API Key.
        </AlertDescription>
      </Alert>
    );
  };
  
  // Hiển thị trạng thái bảng
  const renderTableStatus = () => {
    if (!tableStatus) {
      return null;
    }
    
    return (
      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">Trạng thái bảng</h3>
        <div className="space-y-2">
          {Object.entries(tableStatus).map(([table, exists]) => (
            <div key={table} className="flex items-center">
              <div className="w-8 flex-shrink-0">
                {exists ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <X className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <span className={exists ? 'text-green-700' : 'text-red-700'}>
                  {table}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-6 w-6" /> 
          Trạng thái Cơ Sở Dữ Liệu
        </CardTitle>
        <CardDescription>
          Kiểm tra và quản lý kết nối đến cơ sở dữ liệu Supabase
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {renderConnectionStatus()}
        
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            <strong>URL Supabase:</strong> {import.meta.env.VITE_SUPABASE_URL ? 
              `${import.meta.env.VITE_SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]}••••••••` : 
              'Chưa được cấu hình'
            }
          </p>
          <p className="text-sm text-gray-500">
            <strong>API Key:</strong> {import.meta.env.VITE_SUPABASE_KEY ? '••••••••••••••••••••••••••' : 'Chưa được cấu hình'}
          </p>
        </div>
        
        {renderTableStatus()}
        
        {isConnected && !Object.values(tableStatus || {}).every(Boolean) && (
          <Alert className="mt-4 mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertTitle>Cấu trúc dữ liệu chưa hoàn chỉnh</AlertTitle>
            <AlertDescription>
              Một số bảng cần thiết chưa được tạo. Vui lòng thực hiện thiết lập cơ sở dữ liệu.
            </AlertDescription>
          </Alert>
        )}
        
        {isConnected && Object.values(tableStatus || {}).every(Boolean) && (
          <Alert className="mt-4 mb-2 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            <AlertTitle className="text-green-700">Cấu trúc dữ liệu hoàn chỉnh</AlertTitle>
            <AlertDescription className="text-green-600">
              Tất cả các bảng đã được tạo thành công và sẵn sàng sử dụng.
            </AlertDescription>
          </Alert>
        )}
        {/* Phần chuyển đổi loại cơ sở dữ liệu */}
        <div className="mt-6 border rounded-md p-4">
          <h3 className="text-lg font-medium flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Tùy chọn lưu trữ dữ liệu
          </h3>
          
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Chọn nơi lưu trữ dữ liệu ứng dụng. Thay đổi này sẽ áp dụng cho phiên làm việc tiếp theo.
          </p>
          
          <div className="flex flex-col space-y-4">
            <div className={`flex items-center justify-between p-3 rounded-md ${!useSupabase ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
              <div className="flex items-center">
                <HardDrive className="h-6 w-6 mr-3 text-blue-600" />
                <div>
                  <h4 className="font-medium">IndexedDB (Cục bộ)</h4>
                  <p className="text-sm text-gray-500">Dữ liệu được lưu trên trình duyệt, không cần kết nối mạng</p>
                </div>
              </div>
              <div>
                <Switch
                  checked={!useSupabase}
                  onCheckedChange={() => handleDatabaseChange(false)}
                  disabled={isSwitchingDatabase || !isSupabaseInitialized}
                />
              </div>
            </div>
            
            <div className={`flex items-center justify-between p-3 rounded-md ${useSupabase ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
              <div className="flex items-center">
                <Cloud className="h-6 w-6 mr-3 text-blue-600" />
                <div>
                  <h4 className="font-medium">Supabase (Đám mây)</h4>
                  <p className="text-sm text-gray-500">Dữ liệu được lưu trữ trên đám mây, truy cập từ nhiều thiết bị</p>
                </div>
              </div>
              <div>
                <Switch
                  checked={useSupabase}
                  onCheckedChange={() => handleDatabaseChange(true)}
                  disabled={isSwitchingDatabase || !isConnected || !isSupabaseInitialized}
                />
              </div>
            </div>
            
            {!isSupabaseInitialized && (
              <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <AlertTitle className="text-yellow-700">Chưa cấu hình Supabase</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  Cần cấu hình thông tin kết nối Supabase để sử dụng chế độ đám mây.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={checkConnection}
          disabled={isTestingConnection}
        >
          {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kiểm tra kết nối
        </Button>
        
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={showSetupInstructions}
          >
            Hướng dẫn
          </Button>
          
          <Button 
            variant="default" 
            onClick={setupDatabase}
            disabled={isCreatingTables || !isConnected}
          >
            {isCreatingTables && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Thiết lập cơ sở dữ liệu
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}