import { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { 
  Customer, 
  Vehicle, 
  RepairOrder,
  RepairOrderItem,
  Invoice,
  InvoiceWithDetails
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

const invoiceSchema = z.object({
  repairOrderId: z.number().int().positive('Vui lòng chọn lệnh sửa chữa'),
  customerId: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  total: z.number().positive(),
  amountPaid: z.number().nonnegative(),
  paymentMethod: z.enum(['cash', 'transfer', 'card']),
  status: z.enum(['unpaid', 'partial', 'paid']),
});

type FormData = z.infer<typeof invoiceSchema>;

export default function InvoiceForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [invoiceMatch] = useRoute('/invoices/:id/edit');
  const [repairMatch] = useRoute('/invoices/from-repair/:repairId');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFromRepair, setIsFromRepair] = useState(false);
  
  // Data for display
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [repairOrder, setRepairOrder] = useState<RepairOrder | null>(null);
  const [repairItems, setRepairItems] = useState<RepairOrderItem[]>([]);
  
  // Calculations
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [total, setTotal] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [balance, setBalance] = useState(0);
  const [autoStatus, setAutoStatus] = useState<'unpaid' | 'partial' | 'paid'>('unpaid');
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      repairOrderId: 0,
      customerId: 0,
      vehicleId: 0,
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      amountPaid: 0,
      paymentMethod: 'cash',
      status: 'unpaid',
    }
  });
  
  // Watch for changes to update dependent fields
  const watchAmountPaid = watch('amountPaid');
  const watchDiscountPercent = watch('discount');
  const watchTaxPercent = watch('tax');
  
  // Initialize form and load data
  useEffect(() => {
    const loadFormData = async () => {
      setIsLoading(true);
      try {
        // Check if editing an existing invoice
        if (invoiceMatch && params.id) {
          setIsEditing(true);
          await fetchInvoiceData(parseInt(params.id));
        } 
        // Check if creating from a repair
        else if (repairMatch && params.repairId) {
          setIsFromRepair(true);
          await loadDataFromRepair(parseInt(params.repairId));
        }
        // New invoice - nothing to load
        else {
          await generateInvoiceCode();
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFormData();
  }, [invoiceMatch, repairMatch, params.id, params.repairId, setValue, toast]);
  
  // Update totals when inputs change
  useEffect(() => {
    if (subtotal > 0) {
      // Calculate discount
      const discount = (discountPercent * subtotal) / 100;
      setDiscountAmount(discount);
      
      // Calculate tax on subtotal after discount
      const afterDiscount = subtotal - discount;
      const tax = (taxPercent * afterDiscount) / 100;
      setTaxAmount(tax);
      
      // Calculate final total
      const calculatedTotal = afterDiscount + tax;
      setTotal(calculatedTotal);
      
      // Set balance
      const calculatedBalance = calculatedTotal - amountPaid;
      setBalance(calculatedBalance);
      
      // Update form values
      setValue('subtotal', subtotal);
      setValue('total', calculatedTotal);
      
      // Determine status based on payment
      let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
      if (amountPaid >= calculatedTotal) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partial';
      }
      setAutoStatus(status);
      setValue('status', status);
    }
  }, [subtotal, discountPercent, taxPercent, amountPaid, setValue]);
  
  // Update amountPaid from form input
  useEffect(() => {
    const paid = parseFloat(watchAmountPaid?.toString() || '0');
    if (!isNaN(paid)) {
      setAmountPaid(paid);
    }
  }, [watchAmountPaid]);
  
  // Update discount percent from form input
  useEffect(() => {
    const discount = parseFloat(watchDiscountPercent?.toString() || '0');
    if (!isNaN(discount)) {
      setDiscountPercent(discount);
    }
  }, [watchDiscountPercent]);
  
  // Update tax percent from form input
  useEffect(() => {
    const tax = parseFloat(watchTaxPercent?.toString() || '0');
    if (!isNaN(tax)) {
      setTaxPercent(tax);
    }
  }, [watchTaxPercent]);
  
  const fetchInvoiceData = async (id: number) => {
    try {
      const invoice = await db.invoices.get(id);
      if (!invoice) {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy hóa đơn.',
          variant: 'destructive'
        });
        setLocation('/invoices');
        return;
      }
      
      // Set form values
      setValue('repairOrderId', invoice.repairOrderId);
      setValue('customerId', invoice.customerId);
      setValue('vehicleId', invoice.vehicleId);
      setValue('subtotal', invoice.subtotal);
      setValue('discount', invoice.discount ? (invoice.discount / invoice.subtotal) * 100 : 0);
      setValue('tax', invoice.tax ? (invoice.tax / (invoice.subtotal - (invoice.discount || 0))) * 100 : 0);
      setValue('total', invoice.total);
      setValue('amountPaid', invoice.amountPaid);
      setValue('paymentMethod', invoice.paymentMethod || 'cash');
      setValue('status', invoice.status);
      
      // Update calculated values
      setSubtotal(invoice.subtotal);
      setDiscountPercent(invoice.discount ? (invoice.discount / invoice.subtotal) * 100 : 0);
      setDiscountAmount(invoice.discount || 0);
      setTaxPercent(invoice.tax ? (invoice.tax / (invoice.subtotal - (invoice.discount || 0))) * 100 : 0);
      setTaxAmount(invoice.tax || 0);
      setTotal(invoice.total);
      setAmountPaid(invoice.amountPaid);
      setBalance(invoice.total - invoice.amountPaid);
      
      // Fetch related data
      await loadRepairOrderData(invoice.repairOrderId);
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin hóa đơn. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };
  
  const loadDataFromRepair = async (repairId: number) => {
    try {
      // Check if repair order already has an invoice
      const existingInvoice = await db.invoices
        .where('repairOrderId')
        .equals(repairId)
        .first();
      
      if (existingInvoice) {
        toast({
          title: 'Thông báo',
          description: 'Lệnh sửa chữa này đã có hóa đơn. Đang chuyển sang chỉnh sửa hóa đơn hiện có.',
        });
        setLocation(`/invoices/${existingInvoice.id}/edit`);
        return;
      }
      
      // Load repair order data
      await loadRepairOrderData(repairId);
      
      // Generate invoice code
      await generateInvoiceCode();
    } catch (error) {
      console.error('Error loading data from repair:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin từ lệnh sửa chữa. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };
  
  const loadRepairOrderData = async (repairId: number) => {
    try {
      const repair = await db.repairOrders.get(repairId);
      if (!repair) {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy lệnh sửa chữa.',
          variant: 'destructive'
        });
        return;
      }
      
      setRepairOrder(repair);
      setValue('repairOrderId', repairId);
      setValue('customerId', repair.customerId);
      setValue('vehicleId', repair.vehicleId);
      
      // Load customer
      const customerData = await db.customers.get(repair.customerId);
      setCustomer(customerData);
      
      // Load vehicle
      const vehicleData = await db.vehicles.get(repair.vehicleId);
      setVehicle(vehicleData);
      
      // Load repair items
      const items = await db.repairOrderItems
        .where('repairOrderId')
        .equals(repairId)
        .toArray();
      setRepairItems(items);
      
      // Calculate subtotal
      const calculatedSubtotal = items.reduce((sum, item) => sum + item.total, 0);
      setSubtotal(calculatedSubtotal);
      
      // If tax is provided in repair order, use it
      if (repair.tax && repair.tax > 0) {
        const taxPercentage = (repair.tax / repair.subtotal) * 100;
        setTaxPercent(taxPercentage);
        setValue('tax', taxPercentage);
      }
      
      // For a new invoice, set amountPaid to the full amount by default
      if (!isEditing) {
        const calculatedTotal = repair.total;
        setAmountPaid(calculatedTotal);
        setValue('amountPaid', calculatedTotal);
        setValue('status', 'paid');
      }
    } catch (error) {
      console.error('Error loading repair order data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin lệnh sửa chữa. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };
  
  const generateInvoiceCode = async () => {
    try {
      const code = await db.generateInvoiceCode();
      // We don't set this in the form as it's not part of the form data
      // It will be generated when saving
    } catch (error) {
      console.error('Error generating invoice code:', error);
    }
  };
  
  const onSubmit = async (data: FormData) => {
    if (!repairOrder) {
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin lệnh sửa chữa.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const invoiceData = {
        ...data,
        code: '',
        dateCreated: new Date(),
        discount: discountAmount,
        tax: taxAmount,
      };
      
      if (isEditing && params.id) {
        // Update existing invoice
        const id = parseInt(params.id);
        await db.invoices.update(id, invoiceData);
        
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật hóa đơn.',
        });
        
        setLocation(`/invoices/${id}`);
      } else {
        // Create new invoice
        const code = await db.generateInvoiceCode();
        const newInvoice: any = {
          ...invoiceData,
          code,
          dateCreated: new Date(),
        };
        
        const id = await db.invoices.add(newInvoice);
        
        // Update repair order status to delivered if not already
        if (repairOrder.status !== 'delivered') {
          await db.repairOrders.update(repairOrder.id!, { status: 'delivered' });
        }
        
        toast({
          title: 'Thành công',
          description: 'Đã tạo hóa đơn mới.',
        });
        
        setLocation(`/invoices/${id}`);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu hóa đơn. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          {isEditing ? 'Chỉnh Sửa Hóa Đơn' : 'Tạo Hóa Đơn Mới'}
        </h1>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Lệnh Sửa Chữa</CardTitle>
            </CardHeader>
            <CardContent>
              {!repairOrder ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Vui lòng chọn một lệnh sửa chữa để tạo hóa đơn</p>
                  <Link href="/repairs">
                    <Button variant="outline" className="mt-4">
                      <i className="fas fa-search mr-2"></i>
                      Chọn Lệnh Sửa Chữa
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3">Chi Tiết Lệnh Sửa Chữa</h3>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-medium w-32">Mã LSC:</span>
                        <Link href={`/repairs/${repairOrder.id}`} className="text-primary hover:underline">
                          {repairOrder.code}
                        </Link>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">Ngày tạo:</span>
                        <span>{formatDate(repairOrder.dateCreated)}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">Số Km:</span>
                        <span>{repairOrder.odometer.toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3">Thông Tin Khách Hàng & Xe</h3>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-medium w-32">Khách hàng:</span>
                        <span>{customer?.name}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">Số điện thoại:</span>
                        <span>{customer?.phone}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">Xe:</span>
                        <span>{vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.licensePlate}` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {repairOrder && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Chi Tiết Dịch Vụ</CardTitle>
                </CardHeader>
                <CardContent>
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
                              Không có vật tư hoặc dịch vụ nào trong lệnh sửa chữa
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Thông Tin Thanh Toán</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="paymentMethod">Phương Thức Thanh Toán</Label>
                          <Select
                            {...register('paymentMethod')}
                            onValueChange={(value) => setValue('paymentMethod', value as any)}
                            value={watch('paymentMethod')}
                          >
                            <SelectTrigger id="paymentMethod">
                              <SelectValue placeholder="Chọn phương thức thanh toán" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Tiền Mặt</SelectItem>
                              <SelectItem value="card">Thẻ</SelectItem>
                              <SelectItem value="transfer">Chuyển Khoản</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.paymentMethod && (
                            <p className="text-sm text-red-500 mt-1">{errors.paymentMethod.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="status">Trạng Thái Thanh Toán</Label>
                          <Select
                            {...register('status')}
                            onValueChange={(value) => setValue('status', value as any)}
                            value={watch('status')}
                          >
                            <SelectTrigger id="status">
                              <SelectValue placeholder="Chọn trạng thái thanh toán" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid">Chưa Thanh Toán</SelectItem>
                              <SelectItem value="partial">Thanh Toán Một Phần</SelectItem>
                              <SelectItem value="paid">Đã Thanh Toán</SelectItem>
                            </SelectContent>
                          </Select>
                          {errors.status && (
                            <p className="text-sm text-red-500 mt-1">{errors.status.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="discount">Giảm Giá (%)</Label>
                          <Input
                            id="discount"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...register('discount', {
                              setValueAs: v => parseFloat(v) || 0
                            })}
                          />
                          {errors.discount && (
                            <p className="text-sm text-red-500 mt-1">{errors.discount.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="tax">Thuế VAT (%)</Label>
                          <Input
                            id="tax"
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('tax', {
                              setValueAs: v => parseFloat(v) || 0
                            })}
                          />
                          {errors.tax && (
                            <p className="text-sm text-red-500 mt-1">{errors.tax.message}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="amountPaid">Số Tiền Thanh Toán</Label>
                          <Input
                            id="amountPaid"
                            type="number"
                            step="0.01"
                            min="0"
                            className="text-right font-medium"
                            {...register('amountPaid', {
                              setValueAs: v => parseFloat(v) || 0
                            })}
                          />
                          {errors.amountPaid && (
                            <p className="text-sm text-red-500 mt-1">{errors.amountPaid.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-end">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Tạm tính:</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Giảm giá ({discountPercent.toFixed(2)}%):</span>
                            <span className="font-medium">{formatCurrency(discountAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thuế VAT ({taxPercent.toFixed(2)}%):</span>
                            <span className="font-medium">{formatCurrency(taxAmount)}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t pt-2 mt-2">
                            <span>Tổng cộng:</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Đã thanh toán:</span>
                            <span>{formatCurrency(amountPaid)}</span>
                          </div>
                          {balance > 0 && (
                            <div className="flex justify-between text-red-600 font-medium">
                              <span>Còn lại:</span>
                              <span>{formatCurrency(balance)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 text-sm text-gray-500">
                          <p>
                            Trạng thái được tự động tính: 
                            <span className="font-medium ml-1">
                              {autoStatus === 'paid' ? 'Đã Thanh Toán' : 
                                autoStatus === 'partial' ? 'Thanh Toán Một Phần' : 
                                'Chưa Thanh Toán'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          <div className="flex justify-end gap-2">
            <Link href={isEditing ? `/invoices/${params.id}` : "/invoices"}>
              <Button type="button" variant="outline">
                <i className="fas fa-times mr-2"></i>
                Hủy
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isLoading || !repairOrder}
              className="bg-primary hover:bg-primary-dark text-white"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang Xử Lý...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  {isEditing ? 'Cập Nhật Hóa Đơn' : 'Tạo Hóa Đơn'}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}