import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/db';
import { 
  RepairOrder, 
  RepairOrderWithDetails, 
  InventoryItem, 
  InventoryItemWithCategory
} from '@/lib/types';
import { formatCurrency, formatDate, getRepairOrderStatusText, getRepairOrderStatusClass } from '@/lib/utils';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    carsInRepair: 0,
    monthlyRevenue: 0,
    lowStockItems: 0,
    todayAppointments: 0
  });
  const [recentRepairs, setRecentRepairs] = useState<RepairOrderWithDetails[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItemWithCategory[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Count cars in repair
        const activeRepairs = await db.repairOrders
          .where('status')
          .anyOf(['new', 'in_progress', 'waiting_parts'])
          .count();

        // Calculate monthly revenue
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        const monthlyInvoices = await db.invoices
          .where('dateCreated')
          .aboveOrEqual(firstDayOfMonth)
          .toArray();
        
        const monthlyRevenue = monthlyInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

        // Count low stock items
        const inventoryItems = await db.inventoryItems.toArray();
        const lowStockCount = inventoryItems.filter(item => 
          item.minQuantity && item.quantity <= item.minQuantity
        ).length;

        // Get low stock items with categories
        const lowStockInventory = await Promise.all(
          inventoryItems
            .filter(item => item.minQuantity && item.quantity <= item.minQuantity)
            .slice(0, 4)
            .map(async (item) => {
              const category = await db.inventoryCategories.get(item.categoryId);
              return { ...item, category };
            })
        );

        setLowStockItems(lowStockInventory);

        // For simplicity, we'll mock today's appointments
        // In a real app, this would come from a appointments/schedule table
        setTodayAppointments([
          {
            time: '9:00',
            customerName: 'Nguyễn Văn A',
            service: 'Bảo dưỡng định kỳ 10.000km',
            vehicle: 'Toyota Camry - 29A-12345',
            status: 'scheduled'
          },
          {
            time: '10:30',
            customerName: 'Trần Thị B',
            service: 'Kiểm tra lỗi đèn cảnh báo động cơ',
            vehicle: 'Honda CR-V - 30F-56789',
            status: 'inProgress'
          },
          {
            time: '14:00',
            customerName: 'Lê Văn C',
            service: 'Thay dầu, lọc dầu',
            vehicle: 'Ford Ranger - 51A-98765',
            status: 'completed'
          },
          {
            time: '16:30',
            customerName: 'Phạm Thị D',
            service: 'Đăng kiểm định kỳ',
            vehicle: 'Hyundai Accent - 60B-54321',
            status: 'scheduled'
          }
        ]);

        // Get recent repair orders with customer and vehicle info
        const repairs = await db.repairOrders
          .orderBy('dateCreated')
          .reverse()
          .limit(5)
          .toArray();

        const repairsWithDetails = await Promise.all(
          repairs.map(async (repair) => {
            const customer = await db.customers.get(repair.customerId);
            const vehicle = await db.vehicles.get(repair.vehicleId);
            return { ...repair, customer, vehicle };
          })
        );

        setRecentRepairs(repairsWithDetails);

        // Set dashboard stats
        setDashboardStats({
          carsInRepair: activeRepairs,
          monthlyRevenue,
          lowStockItems: lowStockCount,
          todayAppointments: 4 // Fixed for now
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getAppointmentBorderClass = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-500';
      case 'inProgress': return 'border-yellow-500';
      case 'missed': return 'border-red-500';
      default: return 'border-blue-500';
    }
  };

  return (
    <div>
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="dashboard-card">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="rounded-full p-3 bg-blue-100">
                  <i className="fas fa-car text-primary text-xl"></i>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Xe Đang Sửa</h3>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.carsInRepair}</p>
                </div>
              </div>
              <div className="px-6 pb-4">
                <div className="flex items-center text-sm">
                  <span className="text-success font-medium flex items-center">
                    <i className="fas fa-arrow-up mr-1"></i> 12%
                  </span>
                  <span className="text-gray-500 ml-2">so với tuần trước</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        
        <Card className="dashboard-card">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="rounded-full p-3 bg-green-100">
                  <i className="fas fa-file-invoice-dollar text-success text-xl"></i>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Doanh Thu Tháng</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardStats.monthlyRevenue)}</p>
                </div>
              </div>
              <div className="px-6 pb-4">
                <div className="flex items-center text-sm">
                  <span className="text-success font-medium flex items-center">
                    <i className="fas fa-arrow-up mr-1"></i> 8%
                  </span>
                  <span className="text-gray-500 ml-2">so với tháng trước</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        
        <Card className="dashboard-card">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="rounded-full p-3 bg-yellow-100">
                  <i className="fas fa-boxes-stacked text-warning text-xl"></i>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Phụ Tùng Sắp Hết</h3>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.lowStockItems}</p>
                </div>
              </div>
              <div className="px-6 pb-4">
                <div className="flex items-center text-sm">
                  <span className="text-error font-medium flex items-center">
                    <i className="fas fa-arrow-up mr-1"></i> 5%
                  </span>
                  <span className="text-gray-500 ml-2">so với tuần trước</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
        
        <Card className="dashboard-card">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <CardContent className="p-0">
              <div className="flex items-center p-6">
                <div className="rounded-full p-3 bg-red-100">
                  <i className="fas fa-calendar-check text-error text-xl"></i>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-700">Lịch Hẹn Hôm Nay</h3>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.todayAppointments}</p>
                </div>
              </div>
              <div className="px-6 pb-4">
                <div className="flex items-center text-sm">
                  <span className="text-error font-medium flex items-center">
                    <i className="fas fa-arrow-down mr-1"></i> 2
                  </span>
                  <span className="text-gray-500 ml-2">so với hôm qua</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Recent Repair Orders */}
      <Card className="mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Lệnh Sửa Chữa Gần Đây</h3>
            <Link href="/repairs">
              <Button variant="link" className="text-primary hover:text-primary-dark">
                Xem tất cả
              </Button>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách Hàng</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xe</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Nhận</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Tiền</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRepairs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Không có dữ liệu lệnh sửa chữa
                    </td>
                  </tr>
                ) : (
                  recentRepairs.map((repair) => (
                    <tr key={repair.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {repair.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {repair.customer?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {repair.vehicle ? `${repair.vehicle.brand} ${repair.vehicle.model} - ${repair.vehicle.licensePlate}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(repair.dateCreated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`status-badge ${getRepairOrderStatusClass(repair.status)}`}>
                          {getRepairOrderStatusText(repair.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(repair.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/repairs/${repair.id}`}>
                          <a className="text-primary hover:text-primary-dark mr-3">Xem</a>
                        </Link>
                        {repair.status === 'completed' || repair.status === 'delivered' ? (
                          <a 
                            href="#" 
                            className="text-gray-600 hover:text-gray-900"
                            onClick={(e) => {
                              e.preventDefault();
                              // Print/export functionality would go here
                            }}
                          >
                            In
                          </a>
                        ) : (
                          <span className="text-gray-400 cursor-not-allowed">In</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Bottom Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Stock Items */}
        <Card className="md:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Phụ Tùng Sắp Hết Hàng</h3>
              <Link href="/inventory">
                <Button variant="link" className="text-primary hover:text-primary-dark">
                  Đặt Hàng
                </Button>
              </Link>
            </div>
          </div>
          <div className="overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <Skeleton className="h-48 w-full" />
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SKU</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Phụ Tùng</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn Kho</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức Tối Thiểu</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Không có phụ tùng nào sắp hết hàng
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.minQuantity || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`status-badge ${item.quantity === 0 ? 'status-badge-error' : 'status-badge-warning'}`}>
                            {item.quantity === 0 ? 'Hết Hàng' : item.quantity <= (item.minQuantity || 0) / 2 ? 'Cần Đặt Ngay' : 'Sắp Hết'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Lịch Hẹn Hôm Nay</h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-4">
                {todayAppointments.length === 0 ? (
                  <p className="text-center text-gray-500">Không có lịch hẹn hôm nay</p>
                ) : (
                  todayAppointments.map((appointment, index) => (
                    <div
                      key={index}
                      className={`border-l-4 ${getAppointmentBorderClass(appointment.status)} pl-4 py-2`}
                    >
                      <p className="text-sm font-medium text-gray-700">
                        {appointment.time} - {appointment.customerName}
                      </p>
                      <p className="text-xs text-gray-500">{appointment.service}</p>
                      <p className="text-xs text-gray-500">{appointment.vehicle}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
            <Link href="/appointments/new">
              <a className="text-primary hover:text-primary-dark text-sm font-medium flex items-center justify-center">
                <i className="fas fa-plus-circle mr-2"></i> Thêm Lịch Hẹn
              </a>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
