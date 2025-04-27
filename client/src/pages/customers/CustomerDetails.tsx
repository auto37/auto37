import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { Customer, Vehicle, QuotationWithDetails, RepairOrderWithDetails, InvoiceWithDetails } from '@/lib/types';
import { formatDate, formatCurrency, getQuotationStatusText, getQuotationStatusClass, getRepairOrderStatusText, getRepairOrderStatusClass, getInvoiceStatusText, getInvoiceStatusClass } from '@/lib/utils';

export default function CustomerDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quotes, setQuotes] = useState<QuotationWithDetails[]>([]);
  const [repairs, setRepairs] = useState<RepairOrderWithDetails[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      toast({
        title: 'Lỗi',
        description: 'ID khách hàng không hợp lệ',
        variant: 'destructive',
      });
      navigate('/customers');
      return;
    }

    const loadCustomerData = async () => {
      setIsLoading(true);
      try {
        // Load customer
        const customerData = await db.customers.get(customerId);
        if (!customerData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy khách hàng',
            variant: 'destructive',
          });
          navigate('/customers');
          return;
        }
        setCustomer(customerData);

        // Load vehicles
        const vehicleData = await db.vehicles
          .where('customerId')
          .equals(customerId)
          .toArray();
        setVehicles(vehicleData);

        // Load quotations
        const quotationData = await db.quotations
          .where('customerId')
          .equals(customerId)
          .toArray();
        
        const quotationsWithDetails = await Promise.all(
          quotationData.map(async (quote) => {
            const vehicle = await db.vehicles.get(quote.vehicleId);
            const items = await db.quotationItems
              .where('quotationId')
              .equals(quote.id as number)
              .toArray();
            return { ...quote, vehicle, items };
          })
        );
        setQuotes(quotationsWithDetails);

        // Load repair orders
        const repairData = await db.repairOrders
          .where('customerId')
          .equals(customerId)
          .toArray();
        
        const repairsWithDetails = await Promise.all(
          repairData.map(async (repair) => {
            const vehicle = await db.vehicles.get(repair.vehicleId);
            const items = await db.repairOrderItems
              .where('repairOrderId')
              .equals(repair.id as number)
              .toArray();
            return { ...repair, vehicle, items };
          })
        );
        setRepairs(repairsWithDetails);

        // Load invoices
        const invoiceData = await db.invoices
          .where('customerId')
          .equals(customerId)
          .toArray();
        
        const invoicesWithDetails = await Promise.all(
          invoiceData.map(async (invoice) => {
            const vehicle = await db.vehicles.get(invoice.vehicleId);
            const repairOrder = await db.repairOrders.get(invoice.repairOrderId);
            return { ...invoice, vehicle, repairOrder };
          })
        );
        setInvoices(invoicesWithDetails);

      } catch (error) {
        console.error('Error loading customer details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu khách hàng',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, [id, navigate, toast]);

  const handleDeleteCustomer = async () => {
    if (!customer?.id) return;
    
    if (repairs.length > 0 || quotes.length > 0 || invoices.length > 0) {
      toast({
        title: 'Không thể xóa',
        description: 'Khách hàng này đã có giao dịch trong hệ thống',
        variant: 'destructive',
      });
      return;
    }
    
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này không?')) {
      try {
        // Delete all vehicles first
        for (const vehicle of vehicles) {
          if (vehicle.id) {
            await db.vehicles.delete(vehicle.id);
          }
        }
        
        // Then delete the customer
        await db.customers.delete(customer.id);
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa khách hàng',
        });
        
        navigate('/customers');
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi xóa khách hàng',
          variant: 'destructive',
        });
      }
    }
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

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          Chi Tiết Khách Hàng: {customer.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/customers/${id}/edit`}>
            <Button variant="outline">
              <i className="fas fa-edit mr-2"></i>
              Chỉnh Sửa
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDeleteCustomer}>
            <i className="fas fa-trash mr-2"></i>
            Xóa
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-gray-100 rounded-t-lg p-0">
              <TabsTrigger value="info" className="flex-1">Thông Tin</TabsTrigger>
              <TabsTrigger value="vehicles" className="flex-1">
                Xe ({vehicles.length})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="flex-1">
                Báo Giá ({quotes.length})
              </TabsTrigger>
              <TabsTrigger value="repairs" className="flex-1">
                Sửa Chữa ({repairs.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex-1">
                Hóa Đơn ({invoices.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Mã Khách Hàng</h3>
                  <p className="text-lg">{customer.code}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Tên Khách Hàng</h3>
                  <p className="text-lg">{customer.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Số Điện Thoại</h3>
                  <p className="text-lg">{customer.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Email</h3>
                  <p className="text-lg">{customer.email || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Địa Chỉ</h3>
                  <p className="text-lg">{customer.address || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-1">Mã Số Thuế</h3>
                  <p className="text-lg">{customer.taxCode || "-"}</p>
                </div>
                {customer.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">Ghi Chú</h3>
                    <p className="text-lg">{customer.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-8 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Tổng Giao Dịch</h3>
                  <div className="flex gap-4 mt-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Báo Giá</p>
                      <p className="text-lg font-semibold">{quotes.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Sửa Chữa</p>
                      <p className="text-lg font-semibold">{repairs.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Hóa Đơn</p>
                      <p className="text-lg font-semibold">{invoices.length}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/quotes/new?customerId=${customer.id}`}>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-file-invoice-dollar mr-2"></i>
                      Tạo Báo Giá
                    </Button>
                  </Link>
                  <Link href={`/repairs/new?customerId=${customer.id}`}>
                    <Button variant="outline" size="sm">
                      <i className="fas fa-tools mr-2"></i>
                      Tạo LSC
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vehicles" className="p-6">
              {vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-car text-gray-300 text-5xl mb-4"></i>
                  <p className="text-gray-500">Khách hàng chưa có xe nào</p>
                  <Link href={`/customers/${id}/edit`}>
                    <Button variant="outline" className="mt-4">
                      <i className="fas fa-plus mr-2"></i>
                      Thêm Xe
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <div className="flex items-center">
                          <i className="fas fa-car text-primary text-lg mr-2"></i>
                          <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                        </div>
                        <p className="font-bold text-primary">{vehicle.licensePlate}</p>
                      </div>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500">Mã Xe</h4>
                            <p>{vehicle.code}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500">Năm Sản Xuất</h4>
                            <p>{vehicle.year || "-"}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500">Màu Sắc</h4>
                            <p>{vehicle.color || "-"}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500">Số VIN/Số Khung</h4>
                            <p>{vehicle.vin || "-"}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500">Số Km</h4>
                            <p>{vehicle.lastOdometer.toLocaleString('vi-VN')} km</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Link href={`/quotes/new?customerId=${customer.id}&vehicleId=${vehicle.id}`}>
                            <Button variant="outline" size="sm">
                              <i className="fas fa-file-invoice-dollar mr-1"></i>
                              Tạo Báo Giá
                            </Button>
                          </Link>
                          <Link href={`/repairs/new?customerId=${customer.id}&vehicleId=${vehicle.id}`}>
                            <Button variant="outline" size="sm">
                              <i className="fas fa-tools mr-1"></i>
                              Tạo LSC
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="flex justify-center">
                    <Link href={`/customers/${id}/edit`}>
                      <Button variant="outline">
                        <i className="fas fa-plus mr-2"></i>
                        Thêm Xe
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quotes" className="p-0">
              {quotes.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-file-invoice-dollar text-gray-300 text-5xl mb-4"></i>
                  <p className="text-gray-500">Khách hàng chưa có báo giá nào</p>
                  <Link href={`/quotes/new?customerId=${customer.id}`}>
                    <Button variant="outline" className="mt-4">
                      <i className="fas fa-plus mr-2"></i>
                      Tạo Báo Giá
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã Báo Giá</TableHead>
                        <TableHead>Ngày Tạo</TableHead>
                        <TableHead>Xe</TableHead>
                        <TableHead>Tổng Tiền</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead className="text-right">Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium">{quote.code}</TableCell>
                          <TableCell>{formatDate(quote.dateCreated)}</TableCell>
                          <TableCell>
                            {quote.vehicle ? `${quote.vehicle.brand} ${quote.vehicle.model} - ${quote.vehicle.licensePlate}` : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(quote.total)}</TableCell>
                          <TableCell>
                            <span className={`status-badge ${getQuotationStatusClass(quote.status)}`}>
                              {getQuotationStatusText(quote.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/quotes/${quote.id}`}>
                                <Button variant="ghost" size="sm">
                                  <i className="fas fa-eye mr-1"></i>
                                  Xem
                                </Button>
                              </Link>
                              {quote.status === 'accepted' && (
                                <Link href={`/repairs/from-quote/${quote.id}`}>
                                  <Button variant="outline" size="sm">
                                    <i className="fas fa-tools mr-1"></i>
                                    Tạo LSC
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="repairs" className="p-0">
              {repairs.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-tools text-gray-300 text-5xl mb-4"></i>
                  <p className="text-gray-500">Khách hàng chưa có lệnh sửa chữa nào</p>
                  <Link href={`/repairs/new?customerId=${customer.id}`}>
                    <Button variant="outline" className="mt-4">
                      <i className="fas fa-plus mr-2"></i>
                      Tạo Lệnh Sửa Chữa
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã LSC</TableHead>
                        <TableHead>Ngày Tạo</TableHead>
                        <TableHead>Xe</TableHead>
                        <TableHead>Tổng Tiền</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead className="text-right">Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairs.map((repair) => (
                        <TableRow key={repair.id}>
                          <TableCell className="font-medium">{repair.code}</TableCell>
                          <TableCell>{formatDate(repair.dateCreated)}</TableCell>
                          <TableCell>
                            {repair.vehicle ? `${repair.vehicle.brand} ${repair.vehicle.model} - ${repair.vehicle.licensePlate}` : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(repair.total)}</TableCell>
                          <TableCell>
                            <span className={`status-badge ${getRepairOrderStatusClass(repair.status)}`}>
                              {getRepairOrderStatusText(repair.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/repairs/${repair.id}`}>
                                <Button variant="ghost" size="sm">
                                  <i className="fas fa-eye mr-1"></i>
                                  Xem
                                </Button>
                              </Link>
                              {repair.status === 'completed' && (
                                <Link href={`/invoices/from-repair/${repair.id}`}>
                                  <Button variant="outline" size="sm">
                                    <i className="fas fa-receipt mr-1"></i>
                                    Tạo HĐ
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="p-0">
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-receipt text-gray-300 text-5xl mb-4"></i>
                  <p className="text-gray-500">Khách hàng chưa có hóa đơn nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã HĐ</TableHead>
                        <TableHead>Ngày Tạo</TableHead>
                        <TableHead>Xe</TableHead>
                        <TableHead>Tổng Tiền</TableHead>
                        <TableHead>Đã Thanh Toán</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead className="text-right">Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.code}</TableCell>
                          <TableCell>{formatDate(invoice.dateCreated)}</TableCell>
                          <TableCell>
                            {invoice.vehicle ? `${invoice.vehicle.brand} ${invoice.vehicle.model} - ${invoice.vehicle.licensePlate}` : '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.total)}</TableCell>
                          <TableCell>{formatCurrency(invoice.amountPaid)}</TableCell>
                          <TableCell>
                            <span className={`status-badge ${getInvoiceStatusClass(invoice.status)}`}>
                              {getInvoiceStatusText(invoice.status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm">
                                <i className="fas fa-eye mr-1"></i>
                                Xem
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
