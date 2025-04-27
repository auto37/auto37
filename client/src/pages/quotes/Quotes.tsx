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
import { QuotationWithDetails, Customer, Vehicle } from '@/lib/types';
import { formatCurrency, formatDate, getQuotationStatusText, getQuotationStatusClass } from '@/lib/utils';

export default function Quotes() {
  const [quotes, setQuotes] = useState<QuotationWithDetails[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuotationWithDetails[]>([]);
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
        
        // Fetch all quotations
        const allQuotations = await db.quotations.toArray();
        
        // Enhance quotations with customer and vehicle data
        const quotationsWithDetails = await Promise.all(
          allQuotations.map(async (quote) => {
            const customer = await db.customers.get(quote.customerId);
            const vehicle = await db.vehicles.get(quote.vehicleId);
            return { ...quote, customer, vehicle };
          })
        );
        
        // Sort by date descending (newest first)
        quotationsWithDetails.sort((a, b) => {
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
        });
        
        setQuotes(quotationsWithDetails);
        setFilteredQuotes(quotationsWithDetails);
      } catch (error) {
        console.error('Error fetching quotes:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu báo giá. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    let result = [...quotes];
    
    // Apply customer filter
    if (customerFilter !== 'all') {
      const customerId = parseInt(customerFilter);
      result = result.filter(quote => quote.customerId === customerId);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(quote => quote.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(quote => 
        quote.code.toLowerCase().includes(searchLower) ||
        quote.customer?.name.toLowerCase().includes(searchLower) ||
        quote.vehicle?.licensePlate.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredQuotes(result);
  }, [quotes, searchTerm, customerFilter, statusFilter]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa báo giá này?')) {
      try {
        // Check if the quotation has already been converted to a repair order
        const repairOrder = await db.repairOrders
          .where('quotationId')
          .equals(id)
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
          .equals(id)
          .delete();
        
        // Then delete the quotation
        await db.quotations.delete(id);
        
        // Update state
        setQuotes(prev => prev.filter(quote => quote.id !== id));
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa báo giá.',
        });
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

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await db.quotations.update(id, { status: status as any });
      
      // Update state
      setQuotes(prev => prev.map(quote => 
        quote.id === id ? { ...quote, status: status as any } : quote
      ));
      
      toast({
        title: 'Thành công',
        description: `Đã cập nhật trạng thái báo giá thành "${getQuotationStatusText(status)}".`,
      });
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái báo giá. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Quản Lý Báo Giá</h1>
            <Link href="/quotes/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                <i className="fas fa-plus mr-2"></i>
                Tạo Báo Giá
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
                  <SelectItem value="new">Mới Tạo</SelectItem>
                  <SelectItem value="sent">Đã Gửi KH</SelectItem>
                  <SelectItem value="accepted">KH Đồng Ý</SelectItem>
                  <SelectItem value="rejected">KH Từ Chối</SelectItem>
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
                    <TableHead>Mã</TableHead>
                    <TableHead>Ngày Tạo</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Xe</TableHead>
                    <TableHead>Tổng Tiền</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                        {searchTerm || customerFilter !== 'all' || statusFilter !== 'all'
                          ? 'Không tìm thấy báo giá nào phù hợp'
                          : 'Chưa có dữ liệu báo giá'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.code}</TableCell>
                        <TableCell>{formatDate(quote.dateCreated)}</TableCell>
                        <TableCell>{quote.customer?.name || '-'}</TableCell>
                        <TableCell>
                          {quote.vehicle 
                            ? `${quote.vehicle.brand} ${quote.vehicle.model} - ${quote.vehicle.licensePlate}`
                            : '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(quote.total)}</TableCell>
                        <TableCell>
                          <Select
                            value={quote.status}
                            onValueChange={(value) => quote.id && handleStatusChange(quote.id, value)}
                          >
                            <SelectTrigger className={`w-32 ${getQuotationStatusClass(quote.status)}`}>
                              <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Mới Tạo</SelectItem>
                              <SelectItem value="sent">Đã Gửi KH</SelectItem>
                              <SelectItem value="accepted">KH Đồng Ý</SelectItem>
                              <SelectItem value="rejected">KH Từ Chối</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/quotes/${quote.id}`}>
                              <Button variant="ghost" size="sm">
                                <i className="fas fa-eye mr-1"></i> Xem
                              </Button>
                            </Link>
                            {quote.status === 'accepted' && (
                              <Link href={`/repairs/from-quote/${quote.id}`}>
                                <Button variant="outline" size="sm">
                                  <i className="fas fa-tools mr-1"></i> Tạo LSC
                                </Button>
                              </Link>
                            )}
                            <Link href={`/quotes/${quote.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <i className="fas fa-edit mr-1"></i> Sửa
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => quote.id && handleDelete(quote.id)}
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
