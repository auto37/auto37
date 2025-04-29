import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return '0 ₫';
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  }).format(date);
}

export function formatDatetime(date: Date | undefined): string {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getRepairOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'Mới Tạo',
    'in_progress': 'Đang Sửa Chữa',
    'waiting_parts': 'Chờ Phụ Tùng',
    'completed': 'Hoàn Thành',
    'delivered': 'Đã Giao Xe',
    'cancelled': 'Đã Hủy'
  };
  
  return statusMap[status] || status;
}

export function getRepairOrderStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'status-badge-primary',
    'in_progress': 'status-badge-warning',
    'waiting_parts': 'status-badge-primary',
    'completed': 'status-badge-success',
    'delivered': 'status-badge-gray',
    'cancelled': 'status-badge-error'
  };
  
  return statusMap[status] || 'status-badge-gray';
}

export function getQuotationStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'Mới Tạo',
    'sent': 'Đã Gửi KH',
    'accepted': 'KH Đồng Ý',
    'rejected': 'KH Từ Chối'
  };
  
  return statusMap[status] || status;
}

export function getQuotationStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'status-badge-primary',
    'sent': 'status-badge-warning',
    'accepted': 'status-badge-success',
    'rejected': 'status-badge-error'
  };
  
  return statusMap[status] || 'status-badge-gray';
}

export function getInvoiceStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'unpaid': 'Chưa Thanh Toán',
    'partial': 'Thanh Toán Một Phần',
    'paid': 'Đã Thanh Toán'
  };
  
  return statusMap[status] || status;
}

export function getInvoiceStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    'unpaid': 'status-badge-error',
    'partial': 'status-badge-warning',
    'paid': 'status-badge-success'
  };
  
  return statusMap[status] || 'status-badge-gray';
}

export function getPaymentMethodText(method: string | undefined): string {
  if (!method) return '';
  
  const methodMap: Record<string, string> = {
    'cash': 'Tiền Mặt',
    'transfer': 'Chuyển Khoản',
    'card': 'Thẻ'
  };
  
  return methodMap[method] || method;
}

export function printDocument(id: string): void {
  const content = document.getElementById(id);
  if (!content) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép mở cửa sổ mới để in');
    return;
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>In Tài Liệu</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 20px; }
          .company-info { margin-bottom: 20px; }
          .customer-info { margin-bottom: 20px; }
          .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { width: 45%; text-align: center; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print(); window.close();">In Tài Liệu</button>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
}

export function exportToPdf(id: string, fileName: string): void {
  // In document will suffice as PDF export for now
  printDocument(id);
}

export function calculateTotals(items: { quantity: number, unitPrice: number, total?: number }[]) {
  // Sử dụng total nếu có, nếu không thì tính từ quantity và unitPrice
  const subtotal = items.reduce((sum, item) => {
    // Kiểm tra xem total đã được tính trước chưa
    if (item.total !== undefined) {
      console.log('Sử dụng total đã tính sẵn:', item.total, ' cho mục', item);
      return sum + item.total;
    }
    // Nếu chưa, thì tính dựa vào quantity và unitPrice
    const itemTotal = item.quantity * item.unitPrice;
    console.log('Tính total:', itemTotal, ' cho mục', item);
    return sum + itemTotal;
  }, 0);
  
  // Tạm thời không tính thuế, sẽ được tính trong component dựa vào tax rate
  return { 
    subtotal, 
    tax: 0, 
    total: subtotal 
  };
}
