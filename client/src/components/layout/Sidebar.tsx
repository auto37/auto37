import { useSidebar } from '@/context/SidebarContext';

import { Link, useLocation } from 'wouter';



export default function Sidebar() {

const { isExpanded, toggleSidebar } = useSidebar();

const [location] = useLocation();



const isActive = (path: string) => {

return location === path || location.startsWith(`${path}/`);

};



return (

<aside 

className={`bg-sidebar transition-width overflow-hidden flex flex-col ${isExpanded ? 'w-64' : 'w-20'}`}

>

<div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">

<div className="flex items-center space-x-2 overflow-hidden">

<i className="fas fa-car-mechanic text-2xl text-sidebar-primary"></i>

<h1 

className={`text-xl font-bold text-white truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}

>

GaraManager

</h1>

</div>

<button 

className="text-gray-400 hover:text-white"

onClick={toggleSidebar}

aria-label={isExpanded ? 'Thu gọn thanh bên' : 'Mở rộng thanh bên'}

>

<i className="fas fa-bars"></i>

</button>

</div>



<nav className="pt-4 flex-1 overflow-y-auto">

<div className="mb-1">

<Link href="/">

<a className={isActive('/') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-tachometer-alt w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Tổng Quan

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/customers">

<a className={isActive('/customers') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-users w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Khách Hàng

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/inventory">

<a className={isActive('/inventory') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-boxes-stacked w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Kho Phụ Tùng

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/services">

<a className={isActive('/services') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-screwdriver-wrench w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Dịch Vụ

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/quotes">

<a className={isActive('/quotes') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-file-invoice-dollar w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Báo Giá

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/repairs">

<a className={isActive('/repairs') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-clipboard-list w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Lệnh Sửa Chữa

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/invoices">

<a className={isActive('/invoices') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-receipt w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Hóa Đơn

</span>

</a>

</Link>

</div>



<div className="mb-1">

<Link href="/reports">

<a className={isActive('/reports') ? 'sidebar-link-active' : 'sidebar-link'}>

<i className="fas fa-chart-line w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Báo Cáo

</span>

</a>

</Link>

</div>

</nav>



<div className="border-t border-sidebar-border p-4">

<Link href="/settings">

<a className="flex items-center text-gray-400 hover:text-white">

<i className="fas fa-cog w-6 text-orange-500"></i>

<span className={`ml-2 truncate whitespace-nowrap ${!isExpanded && 'opacity-0'}`}>

Cài Đặt

</span>

</a>

</Link>

</div>

</aside>

);

}