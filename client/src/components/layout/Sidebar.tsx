import { useSidebar } from "@/context/SidebarContext";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { settingsDb, Settings } from "@/lib/settings";

export default function Sidebar() {
  const { isExpanded, toggleSidebar } = useSidebar();
  const [iconColor, setIconColor] = useState<string>('#f97316'); // Mặc định màu cam (orange-500)
  const [location] = useLocation();
  
  // Lấy màu icon từ cài đặt khi component được khởi tạo hoặc khi có thay đổi
  useEffect(() => {
    const fetchIconColor = async () => {
      try {
        const settings = await settingsDb.getSettings();
        if (settings.iconColor) {
          setIconColor(settings.iconColor);
        }
      } catch (error) {
        console.error("Error fetching icon color:", error);
      }
    };
    
    fetchIconColor();
    
    // Thiết lập interval để kiểm tra thay đổi trong cài đặt màu sắc
    const checkSettingsInterval = setInterval(fetchIconColor, 1000);
    
    // Cleanup interval khi component unmount
    return () => {
      clearInterval(checkSettingsInterval);
    };
  }, []);

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <aside
      className={`bg-sidebar transition-width overflow-hidden flex flex-col ${isExpanded ? "w-64" : "w-20"}`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2 overflow-hidden">
          <i className="fas fa-car-mechanic text-2xl" style={{ color: iconColor }}></i>

          <h1
            className={`text-xl font-bold text-white truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
          >
            Auto37 Manager
          </h1>
        </div>

        <button
          className="text-gray-400 hover:text-white"
          onClick={toggleSidebar}
          aria-label={isExpanded ? "Thu gọn thanh bên" : "Mở rộng thanh bên"}
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>

      <nav className="pt-4 flex-1 overflow-y-auto">
        <div className="mb-1">
          <Link href="/" className={isActive("/") ? "sidebar-link-active" : "sidebar-link"}>
            <i className="fas fa-tachometer-alt w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Tổng Quan
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/customers" className={
                isActive("/customers") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-users w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Khách Hàng
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/inventory" className={
                isActive("/inventory") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-boxes-stacked w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Kho Phụ Tùng
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/services" className={
                isActive("/services") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-screwdriver-wrench w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Dịch Vụ
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/quotes" className={
                isActive("/quotes") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-file-invoice-dollar w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Báo Giá
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/repairs" className={
                isActive("/repairs") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-clipboard-list w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Lệnh Sửa Chữa
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/invoices" className={
                isActive("/invoices") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-receipt w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Hóa Đơn
            </span>
          </Link>
        </div>

        <div className="mb-1">
          <Link href="/reports" className={
                isActive("/reports") ? "sidebar-link-active" : "sidebar-link"
              }>
            <i className="fas fa-chart-line w-6" style={{ color: iconColor }}></i>

            <span
              className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
            >
              Báo Cáo
            </span>
          </Link>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <Link href="/settings" className="flex items-center text-gray-400 hover:text-white">
          <i className="fas fa-cog w-6" style={{ color: iconColor }}></i>

          <span
            className={`ml-2 truncate whitespace-nowrap ${!isExpanded && "opacity-0"}`}
          >
            Cài Đặt
          </span>
        </Link>
      </div>
    </aside>
  );
}
