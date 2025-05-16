import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { RepairOrderWithDetails, Customer, Vehicle, RepairOrderItem } from '@/lib/types';
import { 
  formatCurrency, 
  formatDate, 
  getRepairOrderStatusText, 
  getRepairOrderStatusClass,
  exportToPdf,
  printDocument
} from '@/lib/utils';

export default function RepairDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [repair, setRepair] = useState<RepairOrderWithDetails | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<RepairOrderItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const repairId = parseInt(id);
    if (isNaN(repairId)) {
      toast({
        title: 'Lỗi',
        description: 'ID lệnh sửa chữa không hợp lệ',
        variant: 'destructive',
      });
      navigate('/repairs');
      return;
    }

    const fetchRepairData = async () => {
      setIsLoading(true);
      try {
        // Fetch repair
        const repairData = await db.repairOrders.get(repairId);
        if (!repairData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy lệnh sửa chữa',
            variant: 'destructive',
          });
          navigate('/repairs');
          return;
        }
        setRepair(repairData);
        
        // Fetch customer
        const customerData = await db.customers.get(repairData.customerId);
        setCustomer(customerData ?? null);
        
        // Fetch vehicle
        const vehicleData = await db.vehicles.get(repairData.vehicleId);
        setVehicle(vehicleData ?? null);
        
        // Fetch repair items
        const repairItems = await db.repairOrderItems
          .where('repairOrderId')
          .equals(repairId)
          .toArray();
        setItems(repairItems);
      } catch (error) {
        console.error('Error fetching repair details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu lệnh sửa chữa',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepairData();
  }, [id, navigate, toast]);

  const handleStatusChange = async (status: string) => {
    try {
      if (repair?.id) {
        // If changing to "completed", check if we have stock for all items
        if (status === 'completed' && repair.status !== 'completed') {
          const partsItems = items.filter(item => item.type === 'part');
          
          // Check stock availability
          let insufficientItems: {name: string, available: number, required: number}[] = [];
          
          for (const item of partsItems) {
            const inventoryItem = await db.inventoryItems.get(item.itemId);
            if (inventoryItem && inventoryItem.quantity < item.quantity) {
              insufficientItems.push({
                name: item.name,
                available: inventoryItem.quantity,
                required: item.quantity
              });
            }
          }
          
          if (insufficientItems.length > 0) {
            const message = insufficientItems.map(item => 
              `${item.name}: Cần ${item.required}, Tồn kho ${item.available}`
            ).join('\n');
            
            if (!window.confirm(`Kho không đủ vật tư sau:\n\n${message}\n\nVẫn tiếp tục hoàn thành?`)) {
              return;
            }
          }
          
          // Update inventory quantities
          await db.updateInventoryQuantities(repair.id);
        }
        
        await db.repairOrders.update(repair.id, { status: status as any });
        setRepair({ ...repair, status: status as any });
        
        toast({
          title: 'Thành công',
          description: `Đã cập nhật trạng thái lệnh sửa chữa thành "${getRepairOrderStatusText(status)}".`,
        });
      }
    } catch (error) {
      console.error('Error updating repair status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái lệnh sửa chữa. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!repair?.id) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa lệnh sửa chữa này không?')) {
      try {
        // Check if the repair order has an invoice
        const invoice = await db.invoices
          .where('repairOrderId')
          .equals(repair.id)
          .first();
        
        if (invoice) {
          toast({
            title: 'Không thể xóa',
            description: 'Lệnh sửa chữa này đã có hóa đơn.',
            variant: 'destructive'
          });
          return;
        }
        
        // First delete all repair order items
        await db.repairOrderItems
          .where('repairOrderId')
          .equals(repair.id)
          .delete();
        
        // Then delete the repair order
        await db.repairOrders.delete(repair.id);
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa lệnh sửa chữa.',
        });
        
        navigate('/repairs');
      } catch (error) {
        console.error('Error deleting repair:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa lệnh sửa chữa. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  const handlePrint = () => {
    navigate(`/print/repair/${repair?.id}`);
  };

  const handleExportPdf = () => {
    exportToPdf('repairPrintable', `Lenh_Sua_Chua_${repair?.code ?? 'LSC'}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!repair || !customer || !vehicle) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          Chi Tiết Lệnh Sửa Chữa: {repair.code}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Select
            value={repair.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className={`w-[160px] ${getRepairOrderStatusClass(repair.status)}`}>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Mới Tạo</SelectItem>
              <SelectItem value="in_progress">Đang Sửa Chữa</SelectItem>
              <SelectItem value="waiting_parts">Chờ Phụ Tùng</SelectItem>
              <SelectItem value="completed">Hoàn Thành</SelectItem>
              <SelectItem value="delivered">Đã Giao Xe</SelectItem>
              <SelectItem value="cancelled">Đã Hủy</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handlePrint}>
            <i className="fas fa-print mr-2"></i>
            In
          </Button>
          
          
          
          {repair.status === 'completed' && (
            <Link href={`/invoices/from-repair/${repair.id}`}>
              <Button>
                <i className="fas fa-receipt mr-2"></i>
                Tạo Hóa Đơn
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông Tin Lệnh Sửa Chữa</h3>
              <div className="space-y-2">
                <div className="flex">
                  <span className="font-medium w-32">Mã LSC:</span>
                  <span>{repair.code}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Ngày tạo:</span>
                  <span>{formatDate(repair.dateCreated)}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Trạng thái:</span>
                  <span className={`status-badge ${getRepairOrderStatusClass(repair.status)}`}>
                    {getRepairOrderStatusText(repair.status)}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Ngày hẹn:</span>
                  <span>{formatDate(repair.dateExpected) || 'Chưa xác định'}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Số Km:</span>
                  <span>{repair.odometer.toLocaleString()} km</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông Tin Khách Hàng & Xe</h3>
              <div className="space-y-2">
                <div className="flex">
                  <span className="font-medium w-32">Khách hàng:</span>
                  <Link href={`/customers/${customer.id}`} className="text-primary hover:underline">
                    {customer.name}
                  </Link>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Số điện thoại:</span>
                  <span>{customer.phone}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Xe:</span>
                  <span>{vehicle.brand} {vehicle.model} - {vehicle.licensePlate}</span>
                </div>
              </div>
            </div>
          </div>
          
          {repair.customerRequest && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Yêu Cầu Khách Hàng</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{repair.customerRequest}</p>
            </div>
          )}
          
          {repair.technicianNotes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Ghi Chú Kỹ Thuật</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{repair.technicianNotes}</p>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Chi Tiết Sửa Chữa</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead className="text-right">Đơn Giá</TableHead>
                    <TableHead className="text-right">Số Lượng</TableHead>
                    <TableHead className="text-right">Thành Tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        Không có vật tư hoặc dịch vụ nào trong lệnh sửa chữa
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.type === 'part' ? 'Vật tư' : 'Dịch vụ'}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span>{formatCurrency(repair.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Thuế VAT:</span>
                <span>{formatCurrency(repair.tax || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(repair.total)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Link href="/repairs">
              <Button variant="outline">
                <i className="fas fa-arrow-left mr-2"></i>
                Quay Lại
              </Button>
            </Link>
            <Link href={`/repairs/${repair.id}/edit`}>
              <Button variant="outline">
                <i className="fas fa-edit mr-2"></i>
                Sửa
              </Button>
            </Link>
            <Button 
              variant="destructive"
              onClick={handleDelete}
            >
              <i className="fas fa-trash mr-2"></i>
              Xóa
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Printable version */}
      <div className="hidden">
        <div id="repairPrintable" ref={printRef} className="p-8 max-w-4xl mx-auto bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">LỆNH SỬA CHỮA</h1>
            <p className="text-gray-500">Mã: {repair.code}</p>
          </div>
          
          <div className="flex justify-between mb-6">
            <div>
              <h3 className="font-bold mb-2">THÔNG TIN GARA</h3>
              <p>GaraManager</p>
              <p>Địa chỉ: 123 Đường ABC, Quận XYZ, TP. HCM</p>
              <p>Điện thoại: 0123 456 789</p>
              <p>Email: contact@garamanager.vn</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">THÔNG TIN KHÁCH HÀNG</h3>
              <p>Khách hàng: {customer.name}</p>
              <p>Điện thoại: {customer.phone}</p>
              {customer.address && <p>Địa chỉ: {customer.address}</p>}
              {customer.email && <p>Email: {customer.email}</p>}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold mb-2">THÔNG TIN XE</h3>
            <p>Hãng xe: {vehicle.brand}</p>
            <p>Model: {vehicle.model}</p>
            <p>Biển số: {vehicle.licensePlate}</p>
            <p>Số Km: {vehicle.lastOdometer.toLocaleString()} km</p>
          </div>
          
          {repair.customerRequest && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">YÊU CẦU KHÁCH HÀNG</h3>
              <p className="whitespace-pre-wrap">{repair.customerRequest}</p>
            </div>
          )}
          
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">STT</th>
                <th className="border p-2 text-left">Nội dung</th>
                <th className="border p-2 text-right">Đơn giá</th>
                <th className="border p-2 text-right">Số lượng</th>
                <th className="border p-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="border p-2 text-right">{item.quantity}</td>
                  <td className="border p-2 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Tạm tính:</td>
                <td className="border p-2 text-right">{formatCurrency(repair.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Thuế VAT:</td>
                <td className="border p-2 text-right">{formatCurrency(repair.tax || 0)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Tổng cộng:</td>
                <td className="border p-2 text-right font-bold">{formatCurrency(repair.total)}</td>
              </tr>
            </tfoot>
          </table>
          
          {repair.technicianNotes && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">GHI CHÚ KỸ THUẬT</h3>
              <p className="whitespace-pre-wrap">{repair.technicianNotes}</p>
            </div>
          )}
          
          <div className="flex justify-between mt-12">
            <div className="text-center">
              <p className="font-bold">Khách hàng</p>
              <p className="text-sm text-gray-500 mt-12">(Ký và ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-bold">Kỹ thuật viên</p>
              <p className="text-sm text-gray-500 mt-12">(Ký và ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-bold">Quản lý</p>
              <p className="text-sm text-gray-500 mt-12">(Ký và ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}