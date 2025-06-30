import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { testSupabaseConnection, checkSupabaseTables, createInitialSettings } from '@/lib/test-supabase';
import { settingsDb } from '@/lib/settings';
import { dataSynchronizer } from '@/lib/sync';
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
import { Input } from '@/components/ui/input';
import { 
  AlertCircle,
  Check,
  X,
  Database,
  Loader2,
  HardDrive,
  Cloud,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseInitialized } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

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
  
  // Trạng thái cho phần đồng bộ dữ liệu
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [isSyncingFromSupabase, setIsSyncingFromSupabase] = useState(false);
  
  // Trạng thái cho phần chỉnh sửa thông tin kết nối
  const [showEditCredentials, setShowEditCredentials] = useState<boolean>(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [isSavingCredentials, setIsSavingCredentials] = useState<boolean>(false);
  
  // Đồng bộ dữ liệu từ IndexedDB lên Supabase
  const syncToSupabase = async () => {
    if (!isConnected) {
      toast({
        title: 'Lỗi',
        description: 'Không thể đồng bộ khi không có kết nối Supabase',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSyncingToSupabase(true);
    try {
      toast({
        title: 'Đang đồng bộ',
        description: 'Đang đồng bộ dữ liệu lên Supabase. Vui lòng đợi...',
      });
      
      const success = await dataSynchronizer.syncAllToSupabase();
      
      if (success) {
        toast({
          title: 'Thành công',
          description: 'Đã đồng bộ dữ liệu lên Supabase thành công.',
        });
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể đồng bộ dữ liệu. Vui lòng kiểm tra lại kết nối.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Lỗi đồng bộ dữ liệu:', error);
      toast({
        title: 'Lỗi',
        description: `Không thể đồng bộ dữ liệu: ${error.message || 'Lỗi không xác định'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSyncingToSupabase(false);
    }
  };
  
  // Đồng bộ dữ liệu từ Supabase về IndexedDB
  const syncFromSupabase = async () => {
    if (!isConnected) {
      toast({
        title: 'Lỗi',
        description: 'Không thể đồng bộ khi không có kết nối Supabase',
        variant: 'destructive'
      });
      return;
    }
    
    // Hiển thị xác nhận vì đây là hành động sẽ ghi đè dữ liệu cục bộ
    if (!confirm('Dữ liệu cục bộ sẽ bị ghi đè. Bạn có muốn tiếp tục?')) {
      return;
    }
    
    setIsSyncingFromSupabase(true);
    try {
      toast({
        title: 'Đang đồng bộ',
        description: 'Đang đồng bộ dữ liệu từ Supabase. Vui lòng đợi...',
      });
      
      const success = await dataSynchronizer.syncAllFromSupabase();
      
      if (success) {
        toast({
          title: 'Thành công',
          description: 'Đã đồng bộ dữ liệu từ Supabase thành công.',
        });
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không thể đồng bộ dữ liệu. Vui lòng kiểm tra lại kết nối.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Lỗi đồng bộ dữ liệu:', error);
      toast({
        title: 'Lỗi',
        description: `Không thể đồng bộ dữ liệu: ${error.message || 'Lỗi không xác định'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSyncingFromSupabase(false);
    }
  };
  
  // Kiểm tra kết nối và tùy chọn DB khi trang được tải
  useEffect(() => {
    checkConnection();
    loadDatabasePreference();
    
    // Khởi tạo giá trị mặc định cho form từ biến môi trường
    setSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
    setSupabaseKey(import.meta.env.VITE_SUPABASE_KEY || '');
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
  
  // Xử lý khi người dùng lưu thông tin kết nối Supabase
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra đầu vào
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập đầy đủ thông tin kết nối.',
        variant: 'destructive'
      });
      return;
    }
    
    // Kiểm tra URL hợp lệ
    try {
      new URL(supabaseUrl);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'URL Supabase không hợp lệ. Vui lòng kiểm tra lại.',
        variant: 'destructive'
      });
      return;
    }
    
    // Kiểm tra API Key có đúng định dạng không
    if (!supabaseKey.startsWith('eyJ')) {
      toast({
        title: 'Cảnh báo',
        description: 'API Key có vẻ không đúng định dạng. API Key thường bắt đầu bằng "eyJ".',
        variant: 'default'
      });
      // Không dừng lại, chỉ cảnh báo người dùng
    }
    
    setIsSavingCredentials(true);
    
    try {
      // Lưu vào localStorage để sử dụng ngay
      localStorage.setItem('supabase_url', supabaseUrl);
      localStorage.setItem('supabase_key', supabaseKey);
      
      toast({
        title: 'Thành công',
        description: 'Đã lưu thông tin kết nối. Hệ thống sẽ kiểm tra kết nối ngay bây giờ.',
      });
      
      // Đóng form
      setShowEditCredentials(false);
      
      // Kiểm tra kết nối với thông tin mới
      await checkConnectionWithNewCredentials(supabaseUrl, supabaseKey);
      
    } catch (error) {
      console.error('Lỗi khi lưu thông tin kết nối:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu thông tin kết nối. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingCredentials(false);
    }
  };
  
  // Kiểm tra kết nối với thông tin mới
  const checkConnectionWithNewCredentials = async (url: string, key: string) => {
    setIsTestingConnection(true);
    
    try {
      toast({
        title: 'Đang kiểm tra',
        description: 'Đang thử kết nối với thông tin mới...',
      });
      
      // Tạo client Supabase mới với thông tin vừa nhập
      const tempClient = createClient(url, key);
      
      // Thử truy vấn đơn giản
      const { error } = await tempClient.from('settings').select('id').limit(1);
      
      if (error) {
        toast({
          title: 'Lỗi kết nối',
          description: `Không thể kết nối với thông tin mới: ${error.message}`,
          variant: 'destructive'
        });
        setIsConnected(false);
        return false;
      }
      
      // Kết nối thành công
      toast({
        title: 'Kết nối thành công',
        description: 'Đã kết nối thành công với Supabase. Vui lòng tải lại trang để áp dụng thay đổi.',
      });
      
      setIsConnected(true);
      
      // Kiểm tra các bảng
      const tables = await checkTablesWithClient(tempClient);
      setTableStatus(tables);
      
      return true;
    } catch (error: any) {
      console.error('Lỗi kiểm tra kết nối mới:', error);
      toast({
        title: 'Lỗi kết nối',
        description: `Không thể kết nối: ${error.message || 'Lỗi không xác định'}`,
        variant: 'destructive'
      });
      setIsConnected(false);
      return false;
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // Kiểm tra các bảng với client tạm thời
  const checkTablesWithClient = async (client: any) => {
    try {
      const { data: tables } = await client.rpc('get_tables');
      const tableNames = ['users', 'settings', 'customers', 'vehicles', 'inventory_categories', 
                        'inventory_items', 'services', 'quotations', 'quotation_items', 
                        'repair_orders', 'repair_order_items', 'invoices'];
      
      const tableStatus: { [key: string]: boolean } = {};
      
      for (const tableName of tableNames) {
        tableStatus[tableName] = tables.includes(tableName);
      }
      
      return tableStatus;
    } catch (error) {
      console.error('Lỗi kiểm tra bảng:', error);
      return {};
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
        
        <div className="space-y-4 border p-4 rounded-md">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium">Thông tin kết nối Supabase</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowEditCredentials(true)}
            >
              Chỉnh sửa
            </Button>
          </div>
          
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
        </div>
        
        {showEditCredentials && (
          <div className="my-4 border p-4 rounded-md bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium">Chỉnh sửa thông tin kết nối</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowEditCredentials(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supabaseUrl">URL Supabase</Label>
                <Input
                  id="supabaseUrl"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                />
                <p className="text-xs text-gray-500">
                  Ví dụ: https://abcdefghijklm.supabase.co
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supabaseKey">API Key</Label>
                <Input
                  id="supabaseKey"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGci..."
                  type="password"
                />
                <p className="text-xs text-gray-500">
                  API Key thường bắt đầu bằng "eyJhbGci..."
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  disabled={isSavingCredentials}
                  onClick={() => setShowEditCredentials(false)}
                >
                  Hủy
                </Button>
                <Button 
                  type="submit"
                  disabled={isSavingCredentials}
                >
                  {isSavingCredentials && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Lưu thông tin
                </Button>
              </div>
            </form>
          </div>
        )}
        
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
        
        {/* Phần đồng bộ dữ liệu */}
        {isConnected && Object.values(tableStatus || {}).every(Boolean) && (
          <div className="mt-6 border rounded-md p-4">
            <h3 className="text-lg font-medium flex items-center">
              <RefreshCw className="mr-2 h-5 w-5" />
              Đồng bộ dữ liệu
            </h3>
            
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Đồng bộ dữ liệu giữa thiết bị hiện tại và Supabase để sử dụng trên nhiều thiết bị.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 border rounded-md p-3">
                <div className="flex items-center mb-2">
                  <Upload className="h-5 w-5 mr-2 text-blue-600" />
                  <h4 className="font-medium">Đồng bộ lên Supabase</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Đẩy dữ liệu từ thiết bị này lên Supabase để các thiết bị khác có thể truy cập.
                </p>
                <Button 
                  onClick={syncToSupabase} 
                  disabled={isSyncingToSupabase || !isConnected}
                  className="w-full"
                >
                  {isSyncingToSupabase ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    <>Đồng bộ lên Supabase</>
                  )}
                </Button>
              </div>
              
              <div className="flex-1 border rounded-md p-3">
                <div className="flex items-center mb-2">
                  <Download className="h-5 w-5 mr-2 text-blue-600" />
                  <h4 className="font-medium">Đồng bộ từ Supabase</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Tải dữ liệu từ Supabase về thiết bị này. Dữ liệu cục bộ hiện tại sẽ bị ghi đè.
                </p>
                <Button 
                  onClick={syncFromSupabase} 
                  disabled={isSyncingFromSupabase || !isConnected}
                  className="w-full"
                  variant="outline"
                >
                  {isSyncingFromSupabase ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    <>Đồng bộ từ Supabase</>
                  )}
                </Button>
              </div>
            </div>
          </div>
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