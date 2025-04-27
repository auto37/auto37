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
import { RepairOrderWithDetails, Customer } from '@/lib/types';
import { formatCurrency, formatDate, getRepairOrderStatusText, getRepairOrderStatusClass } from '@/lib/utils';

export default function Repairs() {
  const [repairs, setRepairs] = useState<RepairOrderWithDetails[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<RepairOrderWithDetails[]>([]);
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
        
        // Fetch all repair orders
        const allRepairs = await db.repairOrders.toArray();
        
        // Enhance repair orders with customer and vehicle data
        const repairsWithDetails = await Promise.all(
          allRepairs.map(async (repair) => {
            const customer = await db.customers.get(repair.customerId);
            const vehicle = await db.vehicles.get(repair.vehicleId);
            return { ...repair, customer, vehicle };
          })
        );
        
        // Sort by date descending (newest first)
        repairsWithDetails.sort((a, b) => {
          return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
        });
        
        setRepairs(repairsWithDetails);
        setFilteredRepairs(repairsWithDetails);
      } catch (error) {
        console.error('Error fetching repairs:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu lệnh sửa chữa. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    let result = [...repairs];
    
    // Apply customer filter
    if (customerFilter !== 'all') {
      const customerId = parseInt(customerFilter);
      result = result.filter(repair => repair.customerId === customerId);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(repair => repair.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(repair => 
        repair.code.toLowerCase().includes(searchLower) ||
        repair.customer?.name.toLowerCase().includes(searchLower) ||
        repair.vehicle?.licensePlate.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredRepairs(result);
  }, [repairs, searchTerm, customerFilter, statusFilter]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lệnh sửa chữa này?')) {
      try {
        // Check if the repair order has an invoice
        const invoice = await db.invoices
          .where('repairOrderId')
          .equals(id)
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
          .equals(id)
          .delete();
        
        // Then delete the repair order
        await db.repairOrders.delete(id);
        
        // Update state
        setRepairs(prev => prev.filter(repair => repair.id !== id));
        
        toast({
          title: 'Thành công',
          description: 'Đã xóa lệnh sửa chữa.',
        });
      } catch (error) {
        console.error('Error deleting repair order:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa lệnh sửa chữa. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const repairOrder = await db.repairOrders.get(id);
      if (!repairOrder) return;
      
      // If changing to "completed", ensure we have stock for all items
      if (status === 'completed' && repairOrder.status !== 'completed') {
        const repairItems = await db.repairOrderItems
          .where('repairOrderId')
          .equals(id)
          .and(item => item.type === 'part')
          .toArray();
        
        // Check stock availability
        let insufficientItems: {name: string, available: number, required: number}[] = [];
        
        for (const item of repairItems) {
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
        await db.updateInventoryQuantities(id);
      }
      
      // Update repair order status
      await db.repairOrders.update(id, { status: status as any });
      
      // Update state
      setRepairs(prev => prev.map(repair => 
        repair.id === id ? { ...repair, status: status as any } : repair
      ));
      
      toast({
        title: 'Thành công',
        description: `Đã cập nhật trạng thái lệnh sửa chữa thành "${getRepairOrderStatusText(status)}".`,
      });
    } catch (error) {
      console.error('Error updating repair status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái lệnh sửa chữa. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Quản Lý Lệnh Sửa Chữa</h1>
            <Link href="/repairs/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                <i className="fas fa-plus mr-2"></i>
                Tạo Lệnh Sửa Chữa
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
                  <SelectItem value="in_progress">Đang Sửa Chữa</SelectItem>
                  <SelectItem value="waiting_parts">Chờ Phụ Tùng</SelectItem>
                  <SelectItem value="completed">Hoàn Thành</SelectItem>
                  <SelectItem value="delivered">Đã Giao Xe</SelectItem>
                  <SelectItem value="cancelled">Đã Hủy</SelectItem>
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
                  {filteredRepairs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                        {searchTerm || customerFilter !== 'all' || statusFilter !== 'all'
                          ? 'Không tìm thấy lệnh sửa chữa nào phù hợp'
                          : 'Chưa có dữ liệu lệnh sửa chữa'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRepairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell className="font-medium">{repair.code}</TableCell>
                        <TableCell>{formatDate(repair.dateCreated)}</TableCell>
                        <TableCell>{repair.customer?.name || '-'}</TableCell>
                        <TableCell>
                          {repair.vehicle 
                            ? `${repair.vehicle.brand} ${repair.vehicle.model} - ${repair.vehicle.licensePlate}`
                            : '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(repair.total)}</TableCell>
                        <TableCell>
                          <Select
                            value={repair.status}
                            onValueChange={(value) => repair.id && handleStatusChange(repair.id, value)}
                          >
                            <SelectTrigger className={`w-40 ${getRepairOrderStatusClass(repair.status)}`}>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/repairs/${repair.id}`}>
                              <Button variant="ghost" size="sm">
                                <i className="fas fa-eye mr-1"></i> Xem
                              </Button>
                            </Link>
                            {repair.status === 'completed' && (
                              <Link href={`/invoices/from-repair/${repair.id}`}>
                                <Button variant="outline" size="sm">
                                  <i className="fas fa-receipt mr-1"></i> Tạo HĐ
                                </Button>
                              </Link>
                            )}
                            <Link href={`/repairs/${repair.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <i className="fas fa-edit mr-1"></i> Sửa
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => repair.id && handleDelete(repair.id)}
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
