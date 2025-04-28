import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState('sales');
  
  const handleGenerateReport = () => {
    toast({
      title: 'Tính năng đang phát triển',
      description: 'Chức năng báo cáo sẽ được triển khai trong phiên bản tiếp theo.',
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Báo Cáo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="text-gray-500 mb-4">
              Chọn loại báo cáo bạn muốn tạo từ danh sách bên dưới.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="w-full sm:w-64">
                <Select
                  value={reportType}
                  onValueChange={setReportType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại báo cáo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Báo Cáo Doanh Thu</SelectItem>
                    <SelectItem value="inventory">Báo Cáo Tồn Kho</SelectItem>
                    <SelectItem value="services">Báo Cáo Dịch Vụ</SelectItem>
                    <SelectItem value="customers">Báo Cáo Khách Hàng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleGenerateReport}>
                <i className="fas fa-chart-bar mr-2"></i>
                Tạo Báo Cáo
              </Button>
            </div>
            
            {reportType === 'sales' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Báo Cáo Doanh Thu</h3>
                <p className="text-gray-500">
                  Báo cáo này hiển thị tổng doanh thu, số lượng hóa đơn, và các thông tin doanh thu khác theo thời gian.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Khoảng Thời Gian</TableHead>
                        <TableHead className="text-right">Số Lượng Hóa Đơn</TableHead>
                        <TableHead className="text-right">Doanh Thu</TableHead>
                        <TableHead className="text-right">Trung Bình/Hóa Đơn</TableHead>
                        <TableHead className="text-right">Tỷ Lệ Tăng Trưởng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          <span className="text-gray-400 italic">Đang phát triển...</span>
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {reportType === 'inventory' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Báo Cáo Tồn Kho</h3>
                <p className="text-gray-500">
                  Báo cáo này hiển thị thông tin về hàng tồn kho, sản phẩm sắp hết hàng, và giá trị tồn kho.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã Sản Phẩm</TableHead>
                        <TableHead>Tên Sản Phẩm</TableHead>
                        <TableHead>Danh Mục</TableHead>
                        <TableHead className="text-right">Tồn Kho</TableHead>
                        <TableHead className="text-right">Đơn Vị</TableHead>
                        <TableHead className="text-right">Giá Trị</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          <span className="text-gray-400 italic">Đang phát triển...</span>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {reportType === 'services' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Báo Cáo Dịch Vụ</h3>
                <p className="text-gray-500">
                  Báo cáo này hiển thị thông tin về các dịch vụ được sử dụng nhiều nhất và doanh thu từ dịch vụ.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã Dịch Vụ</TableHead>
                        <TableHead>Tên Dịch Vụ</TableHead>
                        <TableHead className="text-right">Số Lần Sử Dụng</TableHead>
                        <TableHead className="text-right">Doanh Thu</TableHead>
                        <TableHead className="text-right">Phần Trăm Tổng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          <span className="text-gray-400 italic">Đang phát triển...</span>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {reportType === 'customers' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Báo Cáo Khách Hàng</h3>
                <p className="text-gray-500">
                  Báo cáo này hiển thị thông tin về khách hàng thường xuyên và giá trị chi tiêu của họ.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã KH</TableHead>
                        <TableHead>Tên Khách Hàng</TableHead>
                        <TableHead className="text-right">Số Lần Sử Dụng</TableHead>
                        <TableHead className="text-right">Tổng Chi Tiêu</TableHead>
                        <TableHead className="text-right">Lần Cuối Sử Dụng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">
                          <span className="text-gray-400 italic">Đang phát triển...</span>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Xuất Dữ Liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 mb-4">
            Xuất dữ liệu hệ thống để sao lưu hoặc chuyển sang ứng dụng khác.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleGenerateReport}>
              <i className="fas fa-file-excel mr-2"></i>
              Xuất Excel
            </Button>
            
            <Button variant="outline" onClick={handleGenerateReport}>
              <i className="fas fa-file-csv mr-2"></i>
              Xuất CSV
            </Button>
            
            <Button variant="outline" onClick={handleGenerateReport}>
              <i className="fas fa-database mr-2"></i>
              Sao Lưu Dữ Liệu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}