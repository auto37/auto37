import { useLocation } from 'wouter';

export default function Header() {
  const [location] = useLocation();
  
  // Function to get the title based on current path
  const getTitle = () => {
    if (location === '/') return 'Tổng Quan';
    if (location.startsWith('/customers')) return 'Quản Lý Khách Hàng';
    if (location.startsWith('/inventory')) return 'Quản Lý Kho';
    if (location.startsWith('/services')) return 'Quản Lý Dịch Vụ';
    if (location.startsWith('/quotes')) return 'Quản Lý Báo Giá';
    if (location.startsWith('/repairs')) return 'Quản Lý Lệnh Sửa Chữa';
    if (location.startsWith('/invoices')) return 'Quản Lý Hóa Đơn';
    if (location.startsWith('/reports')) return 'Báo Cáo';
    if (location.startsWith('/settings')) return 'Cài Đặt';
    return '';
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center px-6">
      <div className="flex-1 flex">
        <h2 className="text-xl font-semibold text-gray-800">{getTitle()}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <button className="p-2 rounded-full hover:bg-gray-100">
            <i className="fas fa-bell text-gray-600"></i>
            <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-white text-xs flex items-center justify-center">
              3
            </span>
          </button>
        </div>
        
        <div className="flex items-center">
          <span className="mr-2 text-sm font-medium text-gray-700">Admin</span>
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white">
            <i className="fas fa-user"></i>
          </div>
        </div>
      </div>
    </header>
  );
}
