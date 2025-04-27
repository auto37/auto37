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
  TableRow 
} from '@/components/ui/table';
import { Customer, Vehicle } from '@/lib/types';
import { db } from '@/lib/db';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<{[key: number]: Vehicle[]}>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const allCustomers = await db.customers.toArray();
        setCustomers(allCustomers);
        setFilteredCustomers(allCustomers);
        
        // Fetch vehicles for each customer
        const allVehicles = await db.vehicles.toArray();
        const vehiclesByCustomer: {[key: number]: Vehicle[]} = {};
        
        allVehicles.forEach(vehicle => {
          if (!vehiclesByCustomer[vehicle.customerId]) {
            vehiclesByCustomer[vehicle.customerId] = [];
          }
          vehiclesByCustomer[vehicle.customerId].push(vehicle);
        });
        
        setVehicles(vehiclesByCustomer);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(lowercaseSearch) ||
        customer.phone.includes(searchTerm) ||
        customer.code.toLowerCase().includes(lowercaseSearch) ||
        (vehicles[customer.id as number]?.some(vehicle => 
          vehicle.licensePlate.toLowerCase().includes(lowercaseSearch)
        ))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers, vehicles]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      try {
        // Check if customer has any vehicles
        const customerVehicles = await db.vehicles
          .where('customerId')
          .equals(id)
          .toArray();
        
        if (customerVehicles.length > 0) {
          alert('Không thể xóa khách hàng này vì có xe đã đăng ký. Vui lòng xóa xe trước.');
          return;
        }
        
        // Check if customer has any quotations, repair orders, or invoices
        const quotations = await db.quotations
          .where('customerId')
          .equals(id)
          .count();
        
        const repairs = await db.repairOrders
          .where('customerId')
          .equals(id)
          .count();
        
        const invoices = await db.invoices
          .where('customerId')
          .equals(id)
          .count();
        
        if (quotations > 0 || repairs > 0 || invoices > 0) {
          alert('Không thể xóa khách hàng này vì đã có giao dịch liên quan.');
          return;
        }
        
        // If no related data, proceed with deletion
        await db.customers.delete(id);
        setCustomers(customers.filter(c => c.id !== id));
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Đã xảy ra lỗi khi xóa khách hàng.');
      }
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Danh Sách Khách Hàng</h1>
            <Link href="/customers/new">
              <Button className="bg-primary hover:bg-primary-dark text-white">
                <i className="fas fa-plus mr-2"></i>
                Thêm Khách Hàng
              </Button>
            </Link>
          </div>
          
          <div className="mb-6">
            <Input
              placeholder="Tìm kiếm theo tên, SĐT, biển số xe..."
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
                    <TableHead>Mã KH</TableHead>
                    <TableHead>Tên Khách Hàng</TableHead>
                    <TableHead>Số Điện Thoại</TableHead>
                    <TableHead>Địa Chỉ</TableHead>
                    <TableHead>Xe</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        {searchTerm ? 'Không tìm thấy khách hàng nào phù hợp' : 'Chưa có dữ liệu khách hàng'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.code}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.address || '-'}</TableCell>
                        <TableCell>
                          {vehicles[customer.id as number]?.length ? (
                            <div>
                              {vehicles[customer.id as number].map((vehicle, index) => (
                                <div key={vehicle.id} className={index > 0 ? 'mt-1' : ''}>
                                  {vehicle.licensePlate} - {vehicle.brand} {vehicle.model}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">Chưa có xe</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Link href={`/customers/${customer.id}`}>
                              <Button variant="outline" size="sm">
                                <i className="fas fa-eye mr-1"></i> Xem
                              </Button>
                            </Link>
                            <Link href={`/customers/${customer.id}/edit`}>
                              <Button variant="outline" size="sm">
                                <i className="fas fa-edit mr-1"></i> Sửa
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => customer.id && handleDelete(customer.id)}
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
