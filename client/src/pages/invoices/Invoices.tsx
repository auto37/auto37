import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { InvoiceWithDetails, Customer } from '@/lib/types';
import { formatCurrency, formatDate, getInvoiceStatusText, getInvoiceStatusClass, getPaymentMethodText } from '@/lib/utils';

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch customers for filter
        const allCustomers = await db.customers.toArray();
        setCustomers(allCustomers);
        
        // Fetch all invoices
        const allInvoices = await db.invoices.toArray();
        
        // Enhance invoices with customer and vehicle data
        const invoicesWithDetails = await Promise.all(
          allInvoices.map(async (invoice) => {
            const customer = await db.customers.get(invoice.customerId);
            const vehicle = await db.vehicles.get(invoice.vehicleId);
            const repairOrder = await db.repairOrders.get(invoice.repairOrderId);
            return { ...invoice, customer, vehicle, repairOrder };
          })
        );
        
        // Sort by date descending (newest first)
        invoicesWithDetails.sort((a, b) => {
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
        });
        
        setInvoices(invoicesWithDetails);
        setFilteredInvoices(invoicesWithDetails);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu hóa đơn. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    let result = [...invoices];
    
    // Apply customer filter
    if (customerFilter !== 'all') {
      const customerId = parseInt(customerFilter);
      result = result.filter(invoice => invoice.customerId === customerId);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(invoice => invoice.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(invoice => 
        invoice.code.toLowerCase().includes(searchLower) ||
        invoice.customer?.name.toLowerCase().includes(searchLower) ||
        invoice.vehicle?.licensePlate.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredInvoices(result);
  }, [invoices, searchTerm, customerFilter, statusFilter]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) {
      try {
        // Delete the invoice
        await db.invoices.delete(id);
        
        // Update state
        setInvoices(prev => prev.filter(invoice => invoice.id !== id));
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa hóa đơn.',
        });
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

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await db.invoices.update(id, { status: status as any });
      
      // Update state
      setInvoices(prev => prev.map(invoice => 
        invoice.id === id ? { ...invoice, status: status as any } : invoice
      ));
      
      toast({
        title: 'Thành công',
        description: `Đã cập nhật trạng thái hóa đơn thành "${getInvoiceStatusText(status)}".`,
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái hóa đơn. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Quản Lý Hóa Đơn</h1>
            <Link href="/invoices/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                <i className="fas fa-plus mr-2"></i>
                Tạo Hóa Đơn
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Tìm kiếm theo mã, tên khách hàng, biển số xe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                value={customerFilter}
                onValueChange={setCustomerFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả khách hàng</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id?.toString() || ''}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-64">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="unpaid">Chưa Thanh Toán</SelectItem>
                  <SelectItem value="partial">Thanh Toán Một Phần</SelectItem>
                  <SelectItem value="paid">Đã Thanh Toán</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã HĐ</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Xe</TableHead>
                    <TableHead>Tổng Tiền</TableHead>
                    <TableHead>Đã Thanh Toán</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                        {searchTerm || customerFilter !== 'all' || statusFilter !== 'all'
                          ? 'Không tìm thấy hóa đơn nào phù hợp'
                          : 'Chưa có dữ liệu hóa đơn'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.code}</TableCell>
                        <TableCell>{formatDate(invoice.dateCreated)}</TableCell>
                        <TableCell>{invoice.customer?.name || '-'}</TableCell>
                        <TableCell>
                          {invoice.vehicle 
                            ? `${invoice.vehicle.brand} ${invoice.vehicle.model} - ${invoice.vehicle.licensePlate}`
                            : '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.total)}</TableCell>
                        <TableCell>{formatCurrency(invoice.amountPaid)}</TableCell>
                        <TableCell>
                          <Select
                            value={invoice.status}
                            onValueChange={(value) => invoice.id && handleStatusChange(invoice.id, value)}
                          >
                            <SelectTrigger className={`w-40 ${getInvoiceStatusClass(invoice.status)}`}>
                              <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid">Chưa Thanh Toán</SelectItem>
                              <SelectItem value="partial">Thanh Toán Một Phần</SelectItem>
                              <SelectItem value="paid">Đã Thanh Toán</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm">
                                <i className="fas fa-eye mr-1"></i> Xem
                              </Button>
                            </Link>
                            <Link href={`/invoices/${invoice.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <i className="fas fa-edit mr-1"></i> Sửa
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => invoice.id && handleDelete(invoice.id)}
                            >
                              <i className="fas fa-trash mr-1"></i> Xóa
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}