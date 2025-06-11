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
            body { font-family: Arial, sans-serif; font-size: 13px; line-height: 1.5; padding: 15mm 20mm; margin: 0; width: 210mm; min-height: 297mm; box-sizing: border-box; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 3px solid #000; padding-bottom: 15px; background-color: #f8f9fa; padding: 15px; }
            .logo { width: 60px; height: 60px; object-fit: contain; }
            .company-info { flex: 1; margin-left: 20px; }
            .company-name { font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a; text-transform: uppercase; }
            .company-details { font-size: 12px; line-height: 1.6; }
            .company-details div { margin-bottom: 3px; }
            .title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; text-transform: uppercase; }
            .info-section { margin-bottom: 15px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-column h4 { font-weight: bold; margin-bottom: 8px; text-decoration: underline; }
            .info-row { margin-bottom: 6px; font-size: 13px; }
            .info-label { font-weight: bold; display: inline-block; width: 80px; }
            .table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
            .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
            .table th { background-color: #f0f0f0; font-weight: bold; text-align: center; font-size: 12px; }
            .table .number { text-align: right; }
            .table .center { text-align: center; }
            .totals { margin-top: 15px; max-width: 350px; margin-left: auto; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
            .total-final { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 8px; }
            .notes { margin: 15px 0; padding: 12px; background-color: #f9f9f9; border: 1px solid #ddd; font-size: 12px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature { text-align: center; width: 30%; font-size: 10px; }
            .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 3px; }
            .bank-info { margin: 20px 0; padding: 15px; background-color: #e8f4fd; border: 2px solid #2563eb; border-radius: 5px; font-size: 11px; }
            .bank-info strong { color: #1d4ed8; font-size: 12px; margin-bottom: 8px; display: block; }
            .bank-info .bank-row { margin-bottom: 5px; }
            .bank-info .bank-label { font-weight: bold; display: inline-block; width: 90px; }
            .thank-you { text-align: center; margin-top: 20px; color: #666; font-size: 10px; }
            @media print { 
              @page { margin: 15mm; size: A4; }
              body { margin: 0; padding: 10mm 15mm; width: 100%; max-width: none; } 
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" class="logo">` : ''}
            <div class="company-info">
              <div class="company-name">${settings.garageName}</div>
              <div class="company-details">
                ${settings.garageAddress ? `<div><strong>Địa chỉ:</strong> ${settings.garageAddress}</div>` : ''}
                ${settings.garagePhone ? `<div><strong>Điện thoại:</strong> ${settings.garagePhone}</div>` : ''}
                ${settings.garageEmail ? `<div><strong>Email:</strong> ${settings.garageEmail}</div>` : ''}
                ${settings.garageTaxCode ? `<div><strong>Mã số thuế:</strong> ${settings.garageTaxCode}</div>` : ''}
              </div>
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
              <strong>THÔNG TIN THANH TOÁN</strong>
              <div class="bank-row"><span class="bank-label">Ngân hàng:</span> ${settings.bankName}</div>
              <div class="bank-row"><span class="bank-label">Số tài khoản:</span> ${settings.bankAccount}</div>
              ${settings.bankOwner ? `<div class="bank-row"><span class="bank-label">Chủ tài khoản:</span> ${settings.bankOwner}</div>` : ''}
              ${settings.bankBranch ? `<div class="bank-row"><span class="bank-label">Chi nhánh:</span> ${settings.bankBranch}</div>` : ''}
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