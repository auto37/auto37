import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { db } from '@/lib/db';
import { addDays, startOfDay, endOfDay, subDays, subMonths, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Định nghĩa các interface cho báo cáo
interface SalesReportItem {
  period: string;
  invoiceCount: number;
  revenue: number;
  averagePerInvoice: number;
  growthRate?: number;
}

interface InventoryReportItem {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  value: number;
  minQuantity?: number;
}

interface ServiceReportItem {
  code: string;
  name: string;
  usageCount: number;
  revenue: number;
  percentageOfTotal: number;
}

interface CustomerReportItem {
  code: string;
  name: string;
  usageCount: number;
  totalSpent: number;
  lastUsage: Date | null;
}

interface ChartData {
  name: string;
  value: number;
}

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [isLoading, setIsLoading] = useState(false);
  
  // State để lưu trữ dữ liệu báo cáo
  const [salesReport, setSalesReport] = useState<SalesReportItem[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventoryReportItem[]>([]);
  const [servicesReport, setServicesReport] = useState<ServiceReportItem[]>([]);
  const [customersReport, setCustomersReport] = useState<CustomerReportItem[]>([]);
  
  // Dữ liệu cho biểu đồ
  const [chartData, setChartData] = useState<ChartData[]>([]);
  
  // Các hàm lấy dữ liệu cho báo cáo
  const generateSalesReport = async () => {
    setIsLoading(true);
    try {
      // Lấy dữ liệu từ database
      const invoices = await db.invoices.toArray();
      
      if (!dateRange?.from) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn khoảng thời gian',
          variant: 'destructive'
        });
        return;
      }
      
      // Ensure dateRange is valid and has a from date
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      // Lọc hóa đơn trong khoảng thời gian được chọn
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.dateCreated);
        return (invoiceDate >= fromDate && invoiceDate <= toDate);
      });
      
      // Nhóm dữ liệu theo khoảng thời gian
      const reportData: SalesReportItem[] = [];
      
      // Tạo dữ liệu biểu đồ
      const newChartData: ChartData[] = [];
      
      if (timeFrame === 'daily') {
        // Phân tích theo ngày
        const dailyData = new Map<string, { count: number, total: number }>();
        
        filteredInvoices.forEach(invoice => {
          const date = format(new Date(invoice.dateCreated), 'dd/MM/yyyy');
          const current = dailyData.get(date) || { count: 0, total: 0 };
          dailyData.set(date, {
            count: current.count + 1,
            total: current.total + invoice.total
          });
        });
        
        // Chuyển dữ liệu sang mảng báo cáo
        dailyData.forEach((value, key) => {
          reportData.push({
            period: key,
            invoiceCount: value.count,
            revenue: value.total,
            averagePerInvoice: value.count > 0 ? value.total / value.count : 0
          });
          
          newChartData.push({
            name: key,
            value: value.total
          });
        });
      } else {
        // Phân tích theo tháng
        const monthlyData = new Map<string, { count: number, total: number }>();
        
        filteredInvoices.forEach(invoice => {
          const month = format(new Date(invoice.dateCreated), 'MM/yyyy');
          const current = monthlyData.get(month) || { count: 0, total: 0 };
          monthlyData.set(month, {
            count: current.count + 1,
            total: current.total + invoice.total
          });
        });
        
        // Chuyển dữ liệu sang mảng báo cáo
        monthlyData.forEach((value, key) => {
          reportData.push({
            period: key,
            invoiceCount: value.count,
            revenue: value.total,
            averagePerInvoice: value.count > 0 ? value.total / value.count : 0
          });
          
          newChartData.push({
            name: key,
            value: value.total
          });
        });
      }
      
      // Sắp xếp lại dữ liệu theo thời gian
      reportData.sort((a, b) => {
        const dateA = a.period.split('/').reverse().join('/');
        const dateB = b.period.split('/').reverse().join('/');
        return dateA.localeCompare(dateB);
      });
      
      // Tính tỷ lệ tăng trưởng
      for (let i = 1; i < reportData.length; i++) {
        const prevRevenue = reportData[i-1].revenue;
        const currentRevenue = reportData[i].revenue;
        if (prevRevenue > 0) {
          reportData[i].growthRate = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
        }
      }
      
      setSalesReport(reportData);
      setChartData(newChartData);
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo doanh thu:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo báo cáo doanh thu',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateInventoryReport = async () => {
    setIsLoading(true);
    try {
      // Lấy dữ liệu từ database
      const items = await db.inventoryItems.toArray();
      const categories = await db.inventoryCategories.toArray();
      
      const reportData: InventoryReportItem[] = [];
      const chartData: ChartData[] = [];
      
      for (const item of items) {
        const category = categories.find(c => c.id === item.categoryId);
        const value = item.quantity * item.costPrice;
        
        reportData.push({
          sku: item.sku,
          name: item.name,
          category: category ? category.name : 'Không xác định',
          quantity: item.quantity,
          unit: item.unit,
          value: value,
          minQuantity: item.minQuantity
        });
        
        // Chỉ thêm vào biểu đồ các mặt hàng có giá trị lớn
        if (value > 0) {
          chartData.push({
            name: item.name,
            value: value
          });
        }
      }
      
      // Sắp xếp theo giá trị giảm dần
      reportData.sort((a, b) => b.value - a.value);
      
      // Giới hạn số lượng dữ liệu cho biểu đồ
      const topItems = chartData
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      setInventoryReport(reportData);
      setChartData(topItems);
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo tồn kho:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo báo cáo tồn kho',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateServicesReport = async () => {
    setIsLoading(true);
    try {
      // Lấy dữ liệu từ database
      const services = await db.services.toArray();
      const repairOrders = await db.repairOrders.toArray();
      const repairItems = await db.repairOrderItems.toArray();
      
      if (!dateRange?.from || !dateRange?.to) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn khoảng thời gian',
          variant: 'destructive'
        });
        return;
      }
      
      // Ensure dateRange is valid and has a from date
      const fromDate = dateRange.from ? startOfDay(dateRange.from) : startOfDay(new Date());
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      
      // Lọc sửa chữa trong khoảng thời gian được chọn
      const filteredOrders = repairOrders.filter(order => {
        const orderDate = new Date(order.dateCreated);
        return (orderDate >= fromDate && orderDate <= toDate);
      }).map(order => order.id);
      
      // Lọc các mục dịch vụ trong các lệnh sửa chữa đã lọc
      const filteredItems = repairItems.filter(item => 
        filteredOrders.includes(item.repairOrderId) && item.type === 'service'
      );
      
      // Tổng hợp dữ liệu
      const serviceUsage = new Map<number, { count: number, revenue: number }>();
      let totalRevenue = 0;
      
      filteredItems.forEach(item => {
        const current = serviceUsage.get(item.itemId) || { count: 0, revenue: 0 };
        const itemRevenue = item.total;
        
        serviceUsage.set(item.itemId, {
          count: current.count + 1,
          revenue: current.revenue + itemRevenue
        });
        
        totalRevenue += itemRevenue;
      });
      
      // Tạo báo cáo
      const reportData: ServiceReportItem[] = [];
      const chartData: ChartData[] = [];
      
      services.forEach(service => {
        const usage = serviceUsage.get(service.id || 0) || { count: 0, revenue: 0 };
        const percentage = totalRevenue > 0 ? (usage.revenue / totalRevenue) * 100 : 0;
        
        if (usage.count > 0) {
          reportData.push({
            code: service.code,
            name: service.name,
            usageCount: usage.count,
            revenue: usage.revenue,
            percentageOfTotal: percentage
          });
          
          chartData.push({
            name: service.name,
            value: usage.revenue
          });
        }
      });
      
      // Sắp xếp theo doanh thu giảm dần
      reportData.sort((a, b) => b.revenue - a.revenue);
      
      setServicesReport(reportData);
      setChartData(chartData);
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo dịch vụ:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo báo cáo dịch vụ',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateCustomersReport = async () => {
    setIsLoading(true);
    try {
      // Lấy dữ liệu từ database
      const customers = await db.customers.toArray();
      const invoices = await db.invoices.toArray();
      
      if (!dateRange?.from) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn khoảng thời gian',
          variant: 'destructive'
        });
        return;
      }
      
      // Ensure dateRange is valid and has a from date
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      // Lọc hóa đơn trong khoảng thời gian được chọn
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.dateCreated);
        return (invoiceDate >= fromDate && invoiceDate <= toDate);
      });
      
      // Tổng hợp dữ liệu khách hàng
      const customerUsage = new Map<number, { 
        count: number, 
        spent: number,
        lastUsage: Date | null 
      }>();
      
      filteredInvoices.forEach(invoice => {
        const current = customerUsage.get(invoice.customerId) || { 
          count: 0, 
          spent: 0,
          lastUsage: null 
        };
        
        const invoiceDate = new Date(invoice.dateCreated);
        const lastUsage = current.lastUsage;
        
        customerUsage.set(invoice.customerId, {
          count: current.count + 1,
          spent: current.spent + invoice.total,
          lastUsage: lastUsage ? (invoiceDate > lastUsage ? invoiceDate : lastUsage) : invoiceDate
        });
      });
      
      // Tạo báo cáo
      const reportData: CustomerReportItem[] = [];
      const chartData: ChartData[] = [];
      
      customers.forEach(customer => {
        const usage = customerUsage.get(customer.id || 0);
        
        if (usage && usage.count > 0) {
          reportData.push({
            code: customer.code,
            name: customer.name,
            usageCount: usage.count,
            totalSpent: usage.spent,
            lastUsage: usage.lastUsage
          });
          
          chartData.push({
            name: customer.name,
            value: usage.spent
          });
        }
      });
      
      // Sắp xếp theo tổng chi tiêu giảm dần
      reportData.sort((a, b) => b.totalSpent - a.totalSpent);
      
      // Lấy top 10 khách hàng chi tiêu nhiều nhất cho biểu đồ
      const topCustomers = chartData
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      
      setCustomersReport(reportData);
      setChartData(topCustomers);
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo khách hàng:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo báo cáo khách hàng',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateReport = () => {
    switch (reportType) {
      case 'sales':
        generateSalesReport();
        break;
      case 'inventory':
        generateInventoryReport();
        break;
      case 'services':
        generateServicesReport();
        break;
      case 'customers':
        generateCustomersReport();
        break;
      default:
        toast({
          title: 'Lỗi',
          description: 'Loại báo cáo không hợp lệ',
          variant: 'destructive'
        });
    }
  };
  
  // Function xuất báo cáo sang CSV/Excel
  const exportToCSV = () => {
    try {
      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';
      
      switch (reportType) {
        case 'sales':
          headers = ['Khoảng Thời Gian', 'Số Lượng Hóa Đơn', 'Doanh Thu', 'Trung Bình/Hóa Đơn', 'Tỷ Lệ Tăng Trưởng'];
          data = salesReport.map(item => [
            item.period,
            item.invoiceCount,
            item.revenue,
            item.averagePerInvoice,
            item.growthRate || 0
          ]);
          filename = 'bao-cao-doanh-thu.csv';
          break;
        case 'inventory':
          headers = ['Mã Sản Phẩm', 'Tên Sản Phẩm', 'Danh Mục', 'Tồn Kho', 'Đơn Vị', 'Giá Trị'];
          data = inventoryReport.map(item => [
            item.sku,
            item.name,
            item.category,
            item.quantity,
            item.unit,
            item.value
          ]);
          filename = 'bao-cao-ton-kho.csv';
          break;
        case 'services':
          headers = ['Mã Dịch Vụ', 'Tên Dịch Vụ', 'Số Lần Sử Dụng', 'Doanh Thu', 'Phần Trăm Tổng'];
          data = servicesReport.map(item => [
            item.code,
            item.name,
            item.usageCount,
            item.revenue,
            item.percentageOfTotal
          ]);
          filename = 'bao-cao-dich-vu.csv';
          break;
        case 'customers':
          headers = ['Mã KH', 'Tên Khách Hàng', 'Số Lần Sử Dụng', 'Tổng Chi Tiêu', 'Lần Cuối Sử Dụng'];
          data = customersReport.map(item => [
            item.code,
            item.name,
            item.usageCount,
            item.totalSpent,
            item.lastUsage ? formatDate(item.lastUsage) : ''
          ]);
          filename = 'bao-cao-khach-hang.csv';
          break;
      }
      
      // Chuyển đổi dữ liệu sang CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.join(','))
      ].join('\n');
      
      // Tạo file và tải xuống
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Thành công',
        description: `Đã xuất báo cáo ${filename}`,
      });
    } catch (error) {
      console.error('Lỗi khi xuất báo cáo:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xuất báo cáo',
        variant: 'destructive'
      });
    }
  };
  
  // Lấy dữ liệu khi thay đổi loại báo cáo hoặc khoảng thời gian
  useEffect(() => {
    // Reset chart data
    setChartData([]);
  }, [reportType]);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Báo Cáo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <p className="text-gray-500 mb-4">
              Chọn loại báo cáo và khoảng thời gian để tạo báo cáo chi tiết.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="reportType" className="mb-2">Loại báo cáo</Label>
                <Select
                  value={reportType}
                  onValueChange={setReportType}
                >
                  <SelectTrigger id="reportType">
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
              
              <div>
                <Label htmlFor="dateRange" className="mb-2">Khoảng thời gian</Label>
                <DateRangePicker
                  date={dateRange}
                  onDateChange={setDateRange}
                />
              </div>
              
              {reportType === 'sales' && (
                <div>
                  <Label htmlFor="timeFrame" className="mb-2">Thời đoạn</Label>
                  <Select
                    value={timeFrame}
                    onValueChange={setTimeFrame}
                  >
                    <SelectTrigger id="timeFrame">
                      <SelectValue placeholder="Chọn thời đoạn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Theo ngày</SelectItem>
                      <SelectItem value="monthly">Theo tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="md:col-span-3 flex justify-end">
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chart-bar mr-2"></i>
                      Tạo Báo Cáo
                    </>
                  )}
                </Button>
              </div>
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
                      {salesReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                            Không có dữ liệu doanh thu trong khoảng thời gian được chọn.
                          </TableCell>
                        </TableRow>
                      ) : (
                        salesReport.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.period}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.invoiceCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.averagePerInvoice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.growthRate !== undefined 
                                ? `${item.growthRate.toFixed(2)}%` 
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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
                      {inventoryReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                            Không có dữ liệu tồn kho.
                          </TableCell>
                        </TableRow>
                      ) : (
                        inventoryReport.map((item, index) => (
                          <TableRow key={index} className={item.quantity <= (item.minQuantity || 5) ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium">
                              {item.sku}
                            </TableCell>
                            <TableCell>
                              {item.name}
                            </TableCell>
                            <TableCell>
                              {item.category}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.value)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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
                      {servicesReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                            Không có dữ liệu dịch vụ trong khoảng thời gian được chọn.
                          </TableCell>
                        </TableRow>
                      ) : (
                        servicesReport.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.code}
                            </TableCell>
                            <TableCell>
                              {item.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.usageCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.percentageOfTotal.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
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
                      {customersReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                            Không có dữ liệu khách hàng trong khoảng thời gian được chọn.
                          </TableCell>
                        </TableRow>
                      ) : (
                        customersReport.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.code}
                            </TableCell>
                            <TableCell>
                              {item.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.usageCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.totalSpent)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.lastUsage ? formatDate(item.lastUsage) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ phân tích</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {reportType === 'sales' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="value" name="Doanh thu" fill="#4f46e5" />
                  </BarChart>
                ) : reportType === 'inventory' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="value" name="Giá trị" fill="#10b981" />
                  </BarChart>
                ) : reportType === 'services' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="value" name="Doanh thu dịch vụ" fill="#f59e0b" />
                  </BarChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="value" name="Chi tiêu" fill="#ef4444" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
        
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Xuất Dữ Liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 mb-4">
            Xuất dữ liệu hệ thống để sao lưu hoặc chuyển sang ứng dụng khác.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportToCSV}>
              <i className="fas fa-file-excel mr-2"></i>
              Xuất Excel
            </Button>
            
            <Button variant="outline" onClick={exportToCSV}>
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