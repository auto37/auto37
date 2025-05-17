import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { testSupabaseConnection, checkSupabaseTables, createInitialSettings } from '@/lib/test-supabase';
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
import { 
  AlertCircle,
  Check,
  X,
  Database,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DatabaseStatus() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [tableStatus, setTableStatus] = useState<{ [key: string]: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTables, setIsCreatingTables] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isInitialSettingsCreated, setIsInitialSettingsCreated] = useState<boolean | null>(null);
  
  // Kiểm tra kết nối khi trang được tải
  useEffect(() => {
    checkConnection();
  }, []);
  
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
            <strong>URL Supabase:</strong> {import.meta.env.VITE_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0]}••••••••
          </p>
          <p className="text-sm text-gray-500">
            <strong>API Key:</strong> ••••••••••••••••••••••••••
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