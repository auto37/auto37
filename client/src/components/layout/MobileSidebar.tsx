import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { settingsDb } from "@/lib/settings";

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [iconColor, setIconColor] = useState<string>('#f97316');
  const [location] = useLocation();

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
  }, []);

  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  const navigationItems = [
    { href: "/", icon: "fas fa-tachometer-alt", label: "Tổng Quan" },
    { href: "/customers", icon: "fas fa-users", label: "Khách Hàng" },
    { href: "/inventory", icon: "fas fa-boxes-stacked", label: "Kho Phụ Tùng" },
    { href: "/services", icon: "fas fa-screwdriver-wrench", label: "Dịch Vụ" },
    { href: "/quotes", icon: "fas fa-file-invoice-dollar", label: "Báo Giá" },
    { href: "/repairs", icon: "fas fa-clipboard-list", label: "Lệnh Sửa Chữa" },
    { href: "/invoices", icon: "fas fa-receipt", label: "Hóa Đơn" },
    { href: "/reports", icon: "fas fa-chart-line", label: "Báo Cáo" },
    { href: "/settings", icon: "fas fa-cog", label: "Cài Đặt" }
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white shadow-md hover:bg-gray-50"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 p-0 bg-sidebar">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-2">
              <i className="fas fa-car-mechanic text-2xl" style={{ color: iconColor }}></i>
              <h1 className="text-xl font-bold text-white">
                Auto37 Manager
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "bg-orange-500 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <i className={`${item.icon} w-6 mr-3`} style={{ color: isActive(item.href) ? 'white' : iconColor }}></i>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}