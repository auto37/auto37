import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { QuotationWithDetails, Customer, Vehicle, QuotationItem } from '@/lib/types';
import { 
  formatCurrency, 
  formatDate, 
  getQuotationStatusText, 
  getQuotationStatusClass,
  exportToPdf,
  printDocument
} from '@/lib/utils';

export default function QuoteDetails() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [quote, setQuote] = useState<QuotationWithDetails | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quoteId = parseInt(id || '0');
    if (isNaN(quoteId) || quoteId === 0) {
      toast({
        title: 'Lỗi',
        description: 'ID báo giá không hợp lệ',
        variant: 'destructive',
      });
      navigate('/quotes');
      return;
    }

    const fetchQuoteData = async () => {
      setIsLoading(true);
      try {
        // Fetch quote
        const quoteData = await db.quotations.get(quoteId);
        if (!quoteData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy báo giá',
            variant: 'destructive',
          });
          navigate('/quotes');
          return;
        }
        setQuote(quoteData);
        
        // Fetch customer
        const customerData = await db.customers.get(quoteData.customerId);
        setCustomer(customerData ?? null);
        
        // Fetch vehicle
        const vehicleData = await db.vehicles.get(quoteData.vehicleId);
        setVehicle(vehicleData ?? null);
        
        // Fetch quote items
        const quoteItems = await db.quotationItems
          .where('quotationId')
          .equals(quoteId)
          .toArray();
        setItems(quoteItems);
      } catch (error) {
        console.error('Error fetching quote details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu báo giá',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteData();
  }, [id, navigate, toast]);

  const handleStatusChange = async (status: string) => {
    try {
      if (quote?.id) {
        await db.quotations.update(quote.id, { status: status as any });
        setQuote({ ...quote, status: status as any });
        
        toast({
          title: 'Thành công',
          description: `Đã cập nhật trạng thái báo giá thành "${getQuotationStatusText(status)}".`,
        });
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái báo giá. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!quote?.id) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa báo giá này không?')) {
      try {
        // Check if the quotation has already been converted to a repair order
        const repairOrder = await db.repairOrders
          .where('quotationId')
          .equals(quote.id)
          .first();
        
        if (repairOrder) {
          toast({
            title: 'Không thể xóa',
            description: 'Báo giá này đã được chuyển thành lệnh sửa chữa.',
            variant: 'destructive'
          });
          return;
        }
        
        // First delete all quotation items
        await db.quotationItems
          .where('quotationId')
          .equals(quote.id)
          .delete();
        
        // Then delete the quotation
        await db.quotations.delete(quote.id);
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa báo giá.',
        });
        
        navigate('/quotes');
      } catch (error) {
        console.error('Error deleting quote:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa báo giá. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  const handlePrint = () => {
    navigate(`/print/quote/${quote?.id}`);
  };

  const handleExportPdf = () => {
    exportToPdf('quotePrintable', `Bao_Gia_${quote?.code || 'BG'}`);
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

  if (!quote || !customer || !vehicle) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          Chi Tiết Báo Giá: {quote.code}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Select
            value={quote.status}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className={`w-[160px] ${getQuotationStatusClass(quote.status)}`}>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Mới Tạo</SelectItem>
              <SelectItem value="sent">Đã Gửi KH</SelectItem>
              <SelectItem value="accepted">KH Đồng Ý</SelectItem>
              <SelectItem value="rejected">KH Từ Chối</SelectItem>
            </SelectContent>
          </Select>
          

          
          <Link href={`/print/quote/${quote.id}`}>
            <Button variant="outline">
              <i className="fas fa-file-contract mr-2"></i>
              In Báo Giá
            </Button>
          </Link>
          
          {quote.status === 'accepted' && (
            <Link href={`/repairs/from-quote/${quote.id}`}>
              <Button>
                <i className="fas fa-tools mr-2"></i>
                Tạo Lệnh Sửa Chữa
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Thông Tin Báo Giá</h3>
              <div className="space-y-2">
                <div className="flex">
                  <span className="font-medium w-32">Mã báo giá:</span>
                  <span>{quote.code}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Ngày tạo:</span>
                  <span>{formatDate(quote.dateCreated)}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Trạng thái:</span>
                  <span className={`status-badge ${getQuotationStatusClass(quote.status)}`}>
                    {getQuotationStatusText(quote.status)}
                  </span>
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
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Chi Tiết Báo Giá</h3>
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
                        Không có vật tư hoặc dịch vụ nào trong báo giá
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
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Thuế VAT:</span>
                <span>{formatCurrency(quote.tax || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Tổng cộng:</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
          
          {quote.notes && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-md font-semibold text-gray-800 mb-2">Ghi Chú & Điều Khoản</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Link href="/quotes">
              <Button variant="outline">
                <i className="fas fa-arrow-left mr-2"></i>
                Quay Lại
              </Button>
            </Link>
            <Link href={`/quotes/${quote.id}/edit`}>
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
        <div id="quotePrintable" ref={printRef} className="p-8 max-w-4xl mx-auto bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">BÁO GIÁ DỊCH VỤ</h1>
            <p className="text-gray-500">Mã: {quote.code}</p>
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
                <td className="border p-2 text-right">{formatCurrency(quote.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Thuế VAT:</td>
                <td className="border p-2 text-right">{formatCurrency(quote.tax || 0)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border p-2"></td>
                <td className="border p-2 font-bold text-right">Tổng cộng:</td>
                <td className="border p-2 text-right font-bold">{formatCurrency(quote.total)}</td>
              </tr>
            </tfoot>
          </table>
          
          {quote.notes && (
            <div className="mb-6">
              <h3 className="font-bold mb-2">GHI CHÚ & ĐIỀU KHOẢN</h3>
              <p className="whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
          
          <div className="flex justify-between mt-12">
            <div className="text-center">
              <p className="font-bold">Người lập báo giá</p>
              <p className="mt-16">(Ký, ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-bold">Khách hàng</p>
              <p className="mt-16">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p>Báo giá có giá trị trong vòng 7 ngày kể từ ngày {formatDate(quote.dateCreated)}</p>
            <p>Cảm ơn quý khách đã sử dụng dịch vụ của chúng tôi!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
