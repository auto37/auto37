import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Service } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        const allServices = await db.services.toArray();
        setServices(allServices);
        setFilteredServices(allServices);
      } catch (error) {
        console.error('Error fetching services:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu dịch vụ. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [toast]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredServices(services);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = services.filter(service => 
        service.name.toLowerCase().includes(searchLower) ||
        service.code.toLowerCase().includes(searchLower) ||
        (service.description && service.description.toLowerCase().includes(searchLower))
      );
      setFilteredServices(filtered);
    }
  }, [searchTerm, services]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) {
      try {
        // Check if the service is referenced in any repair orders or quotations
        const quotationItems = await db.quotationItems
          .where('type')
          .equals('service')
          .and(item => item.itemId === id)
          .count();
        
        const repairItems = await db.repairOrderItems
          .where('type')
          .equals('service')
          .and(item => item.itemId === id)
          .count();
        
        if (quotationItems > 0 || repairItems > 0) {
          toast({
            title: 'Không thể xóa',
            description: 'Dịch vụ đã được sử dụng trong báo giá hoặc lệnh sửa chữa.',
            variant: 'destructive'
          });
          return;
        }
        
        // If no references, delete the service
        await db.services.delete(id);
        
        // Update state
        setServices(prev => prev.filter(service => service.id !== id));
        toast({
          title: 'Thành công',
          description: 'Đã xóa dịch vụ.',
        });
      } catch (error) {
        console.error('Error deleting service:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa dịch vụ. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Quản Lý Dịch Vụ</h1>
            <Link href="/services/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                <i className="fas fa-plus mr-2"></i>
                Thêm Dịch Vụ
              </Button>
            </Link>
          </div>
          
          <div className="mb-6">
            <Input
              placeholder="Tìm kiếm theo mã, tên dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã Dịch Vụ</TableHead>
                    <TableHead>Tên Dịch Vụ</TableHead>
                    <TableHead>Mô Tả</TableHead>
                    <TableHead>Giá Tiền</TableHead>
                    <TableHead>Thời Gian Dự Kiến</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        {searchTerm ? 'Không tìm thấy dịch vụ nào phù hợp' : 'Chưa có dữ liệu dịch vụ'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.code}</TableCell>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {service.description || '-'}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(service.price)}</TableCell>
                        <TableCell>
                          {service.estimatedTime 
                            ? `${service.estimatedTime} phút` 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/services/${service.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <i className="fas fa-edit mr-1"></i> Sửa
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => service.id && handleDelete(service.id)}
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
