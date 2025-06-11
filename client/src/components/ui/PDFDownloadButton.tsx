import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from '@/lib/settings';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PDFDownloadButtonProps {
  title: string;
  code: string;
  date: Date;
  customer: any;
  vehicle: any;
  items: any[];
  subtotal: number;
  tax?: number;
  total: number;
  settings: Settings;
  notes?: string;
  type: 'quotation' | 'repair' | 'invoice';
  fileName: string;
  children: React.ReactNode;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  title,
  code,
  date,
  customer,
  vehicle,
  items,
  subtotal,
  tax = 0,
  total,
  settings,
  notes,
  type,
  fileName,
  children,
}) => {
  const generatePDF = () => {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; padding: 20px; max-width: 210mm; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .logo { width: 50px; height: 50px; object-fit: contain; }
            .company-info { flex: 1; margin-left: 15px; }
            .company-name { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
            .title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
            .info-section { margin-bottom: 15px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-column h4 { font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
            .info-row { margin-bottom: 5px; font-size: 11px; }
            .info-label { font-weight: bold; display: inline-block; width: 70px; }
            .table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px; }
            .table th, .table td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; }
            .table th { background-color: #f0f0f0; font-weight: bold; text-align: center; font-size: 9px; }
            .table .number { text-align: right; }
            .table .center { text-align: center; }
            .totals { margin-top: 15px; max-width: 300px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
            .total-final { font-weight: bold; font-size: 12px; border-top: 2px solid #000; padding-top: 5px; }
            .notes { margin: 15px 0; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; font-size: 10px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature { text-align: center; width: 30%; font-size: 10px; }
            .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 3px; }
            .bank-info { margin: 15px 0; padding: 10px; background-color: #f9f9f9; border: 1px solid #ddd; font-size: 10px; }
            .thank-you { text-align: center; margin-top: 20px; color: #666; font-size: 10px; }
            @media print { 
              body { margin: 0; padding: 10mm; } 
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" class="logo">` : ''}
            <div class="company-info">
              <div class="company-name">${settings.garageName}</div>
              ${settings.garageAddress ? `<div>Địa chỉ: ${settings.garageAddress}</div>` : ''}
              <div>
                ${settings.garagePhone ? `ĐT: ${settings.garagePhone}` : ''}
                ${settings.garageEmail ? ` - Email: ${settings.garageEmail}` : ''}
              </div>
              ${settings.garageTaxCode ? `<div>Mã số thuế: ${settings.garageTaxCode}</div>` : ''}
            </div>
          </div>

          <div class="title">${title}</div>

          <div class="info-grid">
            <div class="info-column">
              <h4>THÔNG TIN KHÁCH HÀNG:</h4>
              <div class="info-row"><span class="info-label">Họ tên:</span> ${customer.name}</div>
              <div class="info-row"><span class="info-label">Điện thoại:</span> ${customer.phone}</div>
              ${customer.address ? `<div class="info-row"><span class="info-label">Địa chỉ:</span> ${customer.address}</div>` : ''}
            </div>
            <div class="info-column">
              <h4>THÔNG TIN XE:</h4>
              <div class="info-row"><span class="info-label">Biển số:</span> ${vehicle.licensePlate}</div>
              <div class="info-row"><span class="info-label">Hãng xe:</span> ${vehicle.brand}</div>
              <div class="info-row"><span class="info-label">Dòng xe:</span> ${vehicle.model}</div>
              ${vehicle.lastOdometer ? `<div class="info-row"><span class="info-label">Số KM:</span> ${vehicle.lastOdometer.toLocaleString()}</div>` : ''}
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-row"><span class="info-label">Số:</span> ${code}</div>
            <div class="info-row"><span class="info-label">Ngày:</span> ${formatDate(date)}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px;">STT</th>
                <th>Mô tả</th>
                <th style="width: 60px;">ĐVT</th>
                <th style="width: 60px;">SL</th>
                <th style="width: 80px;">Đơn giá</th>
                <th style="width: 100px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td>${item.description}</td>
                  <td class="center">${item.unit}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="number">${formatCurrency(item.unitPrice)}</td>
                  <td class="number">${formatCurrency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Tạm tính:</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            ${tax ? `
              <div class="total-row">
                <span>Thuế VAT (${tax}%):</span>
                <span>${formatCurrency(subtotal * tax / 100)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span>Tổng cộng:</span>
              <span>${formatCurrency(total)}</span>
            </div>
          </div>

          ${notes ? `
            <div class="notes">
              <strong>Ghi chú:</strong><br>
              ${notes}
            </div>
          ` : ''}

          ${settings.bankName && settings.bankAccount ? `
            <div class="bank-info">
              <strong>THÔNG TIN THANH TOÁN:</strong><br>
              Ngân hàng: ${settings.bankName}<br>
              Số TK: ${settings.bankAccount}<br>
              ${settings.bankOwner ? `Chủ TK: ${settings.bankOwner}<br>` : ''}
              ${settings.bankBranch ? `Chi nhánh: ${settings.bankBranch}` : ''}
            </div>
          ` : ''}

          <div class="signatures">
            <div class="signature">
              <strong>KHÁCH HÀNG</strong>
              <div class="signature-line">(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="signature">
              <strong>NGƯỜI LẬP</strong>
              <div class="signature-line">(Ký và ghi rõ họ tên)</div>
            </div>
          </div>

          <div class="thank-you">Cảm ơn quý khách hàng!</div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <Button onClick={generatePDF} className="bg-primary hover:bg-primary-dark text-white">
      {children}
    </Button>
  );
};

export default PDFDownloadButton;