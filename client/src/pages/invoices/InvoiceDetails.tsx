import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { 
  InvoiceWithDetails, 
  Customer, 
  Vehicle, 
  RepairOrder, 
  RepairOrderItem 
} from '@/lib/types';
import { 
  formatCurrency, 
  formatDate, 
  getInvoiceStatusText, 
  getInvoiceStatusClass,
  getPaymentMethodText,
  exportToPdf,
  printDocument
} from '@/lib/utils';

export default function InvoiceDetails() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [repairOrder, setRepairOrder] = useState<RepairOrder | null>(null);
  const [repairItems, setRepairItems] = useState<RepairOrderItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const invoiceId = parseInt(id || '0');
    if (isNaN(invoiceId) || invoiceId === 0) {
      toast({
        title: 'Lỗi',
        description: 'ID hóa đơn không hợp lệ',
        variant: 'destructive',
      });
      navigate('/invoices');
      return;
    }

    const fetchInvoiceData = async () => {
      setIsLoading(true);
      try {
        // Fetch invoice
        const invoiceData = await db.invoices.get(invoiceId);
        if (!invoiceData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy hóa đơn',
            variant: 'destructive',
          });
          navigate('/invoices');
          return;
        }
        setInvoice(invoiceData);
        
        // Fetch customer
        const customerData = await db.customers.get(invoiceData.customerId);
        setCustomer(customerData ?? null);
        
        // Fetch vehicle
        const vehicleData = await db.vehicles.get(invoiceData.vehicleId);
        setVehicle(vehicleData ?? null);
        
        // Fetch repair order
        const repairData = await db.repairOrders.get(invoiceData.repairOrderId);
        setRepairOrder(repairData ?? null);
        
        // Fetch repair items
        if (repairData) {
          const items = await db.repairOrderItems
            .where('repairOrderId')
            .equals(repairData.id!)
            .toArray();
          setRepairItems(items);
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu hóa đơn',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [id, navigate, toast]);

  const handleStatusChange = async (status: string) => {
    try {
      if (invoice?.id) {
        await db.invoices.update(invoice.id, { status: status as any });
        setInvoice({ ...invoice, status: status as any });
        
        toast({
          title: 'Thành công',
          description: `Đã cập nhật trạng thái hóa đơn thành "${getInvoiceStatusText(status)}".`,
        });
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái hóa đơn. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!invoice?.id) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa hóa đơn này không?')) {
      try {
        // Delete the invoice
        await db.invoices.delete(invoice.id);
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa hóa đơn.',
        });
        
        navigate('/invoices');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa hóa đơn. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  const handlePrint = () => {
    printDocument('invoicePrintable');
  };

  const handleExportPdf = () => {
    exportToPdf('invoicePrintable', `Hoa_Don_${invoice?.code ?? 'HD'}`);
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

  if (!invoice || !customer || !vehicle || !repairOrder) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          Chi Tiết Hóa Đơn: {invoice.code}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Select
            value={invoice.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className={`w-[160px] ${getInvoiceStatusClass(invoice.status)}`}>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Chưa Thanh Toán</SelectItem>
              <SelectItem value="partial">Thanh Toán Một Phần</SelectItem>
              <SelectItem value="paid">Đã Thanh Toán</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handlePrint}>
            <i className="fas fa-print mr-2"></i>
            In
          </Button>
          
          <Button variant="outline" onClick={handleExportPdf}>
            <i className="fas fa-file-pdf mr-2"></i>
            Xuất PDF
          </Button>
          
          <Link href={`/print/invoice/${invoice.id}`}>
            <Button variant="outline">
              <i className="fas fa-file-invoice mr-2"></i>
              Mẫu in nâng cao
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông Tin Hóa Đơn</h3>
              <div className="space-y-2">
                <div className="flex">
                  <span className="font-medium w-32">Mã hóa đơn:</span>
                  <span>{invoice.code}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Ngày tạo:</span>
                  <span>{formatDate(invoice.dateCreated)}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Mã LSC:</span>
                  <Link href={`/repairs/${repairOrder.id}`} className="text-primary hover:underline">
                    {repairOrder.code}
                  </Link>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Trạng thái:</span>
                  <span className={`status-badge ${getInvoiceStatusClass(invoice.status)}`}>
                    {getInvoiceStatusText(invoice.status)}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Thanh toán:</span>
                  <span>{getPaymentMethodText(invoice.paymentMethod)}</span>
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
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Chi Tiết Hóa Đơn</h3>
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
                  {repairItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        Không có vật tư hoặc dịch vụ nào trong hóa đơn
                      </TableCell>
                    </TableRow>
                  ) : (
                    repairItems.map((item, index) => (
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
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount && invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span>Giảm giá:</span>
                  <span>{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Thuế VAT:</span>
                <span>{formatCurrency(invoice.tax || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2">
                <span>Đã thanh toán:</span>
                <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              {invoice.total > invoice.amountPaid && (
                <div className="flex justify-between font-medium text-red-600">
                  <span>Còn lại:</span>
                  <span>{formatCurrency(invoice.total - invoice.amountPaid)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Link href="/invoices">
              <Button variant="outline">
                <i className="fas fa-arrow-left mr-2"></i>
                Quay Lại
              </Button>
            </Link>
            <Link href={`/invoices/${invoice.id}/edit`}>
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
        <div id="invoicePrintable" ref={printRef} className="p-8 max-w-4xl mx-auto bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">HÓA ĐƠN</h1>
            <p className="text-gray-500">Mã: {invoice.code}</p>
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
          </div>
          
          <div className="mb-4">
            <h3 className="font-bold mb-2">THÔNG TIN THANH TOÁN</h3>
            <p>Số phiếu sửa chữa: {repairOrder.code}</p>
            <p>Ngày lập hóa đơn: {formatDate(invoice.dateCreated)}</p>
            <p>Phương thức thanh toán: {getPaymentMethodText(invoice.paymentMethod)}</p>
          </div>
          
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
              {repairItems.map((item, index) => (
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
                <td className="border p-2 text-right">{formatCurrency(invoice.subtotal)}</td>
              </tr>
              {invoice.discount && invoice.discount > 0 && (
                <tr>
                  <td colSpan={3} className="border p-2"></td>
                  <td className="border p-2 font-bold text-right">Giảm giá:</td>
                  <td className="border p-2 text-right">{formatCurrency(invoice.discount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Thuế VAT:</td>
                <td className="border p-2 text-right">{formatCurrency(invoice.tax || 0)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Tổng cộng:</td>
                <td className="border p-2 text-right font-bold">{formatCurrency(invoice.total)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Đã thanh toán:</td>
                <td className="border p-2 text-right">{formatCurrency(invoice.amountPaid)}</td>
              </tr>
              {invoice.total > invoice.amountPaid && (
                <tr>
                  <td colSpan={3} className="border p-2"></td>
                  <td className="border p-2 font-bold text-right">Còn lại:</td>
                  <td className="border p-2 text-right font-bold">{formatCurrency(invoice.total - invoice.amountPaid)}</td>
                </tr>
              )}
            </tfoot>
          </table>
          
          <div className="flex justify-between mt-12">
            <div className="text-center">
              <p className="font-bold">Người lập hóa đơn</p>
              <p className="text-sm text-gray-500 mt-12">(Ký và ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-bold">Khách hàng</p>
              <p className="text-sm text-gray-500 mt-12">(Ký và ghi rõ họ tên)</p>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
          </div>
        </div>
      </div>
    </div>
  );
}