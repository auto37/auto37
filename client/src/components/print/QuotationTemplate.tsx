import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import jsPDF from 'jspdf';
// Thêm plugin jspdf-autotable
import 'jspdf-autotable';

// Mở rộng jsPDF để hỗ trợ autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
    lastAutoTable: any;
  }
}

interface QuotationItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  discount?: number;
  total: number;
}

interface QuotationTemplateProps {
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleLicensePlate: string;
  invoiceNumber: string;
  invoiceDate: Date;
  repairTechnician?: string;
  odometerReading?: number;
  items: QuotationItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  notes?: string;
  isPrintMode?: boolean;
}

const numberToVietnameseText = (number: number): string => {
  if (number < 0) return 'Số âm không hợp lệ';
  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const numbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const readThreeDigits = (num: number): string => {
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;
    let str = '';
    if (hundreds > 0) str += `${numbers[hundreds]} trăm `;
    if (tens > 1) {
      str += `${numbers[tens]} mươi `;
      if (ones > 0) str += numbers[ones];
    } else if (tens === 1) {
      str += 'mười ';
      if (ones > 0) str += numbers[ones];
    } else if (ones > 0) {
      str += numbers[ones];
    } else if (str === '' && num === 0) {
      str = numbers[0];
    }
    return str.trim();
  };

  if (number === 0) return 'Không đồng';
  let str = '';
  let unitIndex = 0;
  while (number > 0) {
    const threeDigits = number % 1000;
    if (threeDigits > 0) {
      const threeDigitsStr = readThreeDigits(threeDigits);
      if (threeDigitsStr) {
        str = `${threeDigitsStr} ${units[unitIndex]} ${str}`.trim();
      }
    }
    number = Math.floor(number / 1000);
    unitIndex++;
  }
  str = `${str} đồng`.replace(/\s+/g, ' ');
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function QuotationTemplate({
  customerName,
  customerAddress,
  customerPhone,
  vehicleBrand,
  vehicleModel,
  vehicleLicensePlate,
  invoiceNumber,
  invoiceDate,
  repairTechnician,
  odometerReading,
  items,
  subtotal,
  tax,
  discount,
  total,
  notes,
  isPrintMode = false,
}: QuotationTemplateProps) {
  const { toast } = useToast();
  const [logo, setLogo] = useState<string>('');
  const [garageName, setGarageName] = useState<string>('AUTO37 GARAGE');
  const [garageAddress, setGarageAddress] = useState<string>('Số 74 Trần Phú, P.Mộ Lao, TP.Hà Đông, HN');
  const [garagePhone, setGaragePhone] = useState<string>('0987654321');
  const [garageEmail, setGarageEmail] = useState<string>('auto37@gmail.com');
  const [garageTaxCode, setGarageTaxCode] = useState<string>('0123456789');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await settingsDb.getSettings();
        if (settings.logoUrl) setLogo(settings.logoUrl);
        if (settings.garageName) setGarageName(settings.garageName);
        if (settings.garageAddress) setGarageAddress(settings.garageAddress);
        if (settings.garagePhone) setGaragePhone(settings.garagePhone);
        if (settings.garageEmail) setGarageEmail(settings.garageEmail);
        if (settings.garageTaxCode) setGarageTaxCode(settings.garageTaxCode);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const formatLocalDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const printToPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = margin;

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Fonts and styling
      pdf.setFont('helvetica');
      pdf.setFontSize(12);

      // Header
      if (logo) {
        try {
          const img = new Image();
          img.src = logo;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          pdf.addImage(img, 'PNG', margin, yPosition, 30, 15);
        } catch (error) {
          console.warn('Error loading logo:', error);
        }
        yPosition += 20;
      }

      pdf.setFontSize(16);
      pdf.text(garageName.toUpperCase(), margin, yPosition);
      pdf.setFontSize(10);
      yPosition += 5;
      pdf.text(`Địa chỉ: ${garageAddress}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Điện thoại: ${garagePhone} | MST: ${garageTaxCode}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Email: ${garageEmail}`, margin, yPosition);

      // Right-aligned header
      pdf.setFontSize(16);
      pdf.text('BÁO GIÁ DỊCH VỤ', pageWidth - margin - 50, margin);
      pdf.setFontSize(10);
      pdf.text(`Số: ${invoiceNumber}`, pageWidth - margin - 50, margin + 5);
      pdf.text(`Ngày: ${formatLocalDate(invoiceDate)}`, pageWidth - margin - 50, margin + 10);
      yPosition += 10;

      checkPageBreak(40);

      // Customer and Vehicle Info Table
      pdf.autoTable({
        startY: yPosition,
        body: [
          ['Khách hàng:', customerName, 'Mã phiếu:', invoiceNumber],
          ['Địa chỉ:', customerAddress || '-', 'Ngày:', formatLocalDate(invoiceDate)],
          ['Biển số:', vehicleLicensePlate, 'Hãng xe:', vehicleBrand || '-'],
          ['Loại xe:', vehicleModel || '-', 'Số KM:', odometerReading?.toLocaleString() || '-'],
          ['Thợ sửa chữa:', repairTechnician || '-', 'Số điện thoại:', customerPhone || '-'],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 30 } },
      });
      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Services Table
      const services = items.filter((item) => item.unit === 'Dịch vụ');
      if (services.length > 0) {
        checkPageBreak(20);
        pdf.setFontSize(12);
        pdf.text('Chi tiết dịch vụ', margin, yPosition);
        yPosition += 5;

        pdf.autoTable({
          startY: yPosition,
          head: [['STT', 'Tên dịch vụ', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'Chiết khấu', 'Thành toán']],
          body: [
            ...services.map((item, index) => [
              index + 1,
              item.description,
              item.unit,
              item.quantity,
              item.unitPrice.toLocaleString(),
              item.amount.toLocaleString(),
              (item.discount || 0).toLocaleString(),
              item.total.toLocaleString(),
            ]),
            [
              { content: 'Cộng dịch vụ:', colSpan: 5, styles: { halign: 'right', fillColor: [240, 240, 240] } },
              services.reduce((sum, item) => sum + item.total, 0).toLocaleString(),
              services.reduce((sum, item) => sum + (item.discount || 0), 0).toLocaleString(),
              services.reduce((sum, item) => sum + item.total, 0).toLocaleString(),
            ],
          ],
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [200, 200, 200] },
          columnStyles: {
            0: { cellWidth: 10 },
            3: { cellWidth: 10 },
            4: { halign: 'right', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 20 },
            6: { halign: 'right', cellWidth: 15 },
            7: { halign: 'right', cellWidth: 20 },
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Materials Table
      const materials = items.filter((item) => item.unit !== 'Dịch vụ');
      if (materials.length > 0) {
        checkPageBreak(20);
        pdf.setFontSize(12);
        pdf.text('Chi tiết vật tư', margin, yPosition);
        yPosition += 5;

        pdf.autoTable({
          startY: yPosition,
          head: [['STT', 'Tên vật tư', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'Chiết khấu', 'Thành toán']],
          body: [
            ...materials.map((item, index) => [
              index + 1,
              item.description,
              item.unit,
              item.quantity,
              item.unitPrice.toLocaleString(),
              item.amount.toLocaleString(),
              (item.discount || 0).toLocaleString(),
              item.total.toLocaleString(),
            ]),
            [
              { content: 'Cộng vật tư:', colSpan: 5, styles: { halign: 'right', fillColor: [240, 240, 240] } },
              materials.reduce((sum, item) => sum + item.total, 0).toLocaleString(),
              materials.reduce((sum, item) => sum + (item.discount || 0), 0).toLocaleString(),
              materials.reduce((sum, item) => sum + item.total, 0).toLocaleString(),
            ],
          ],
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [200, 200, 200] },
          columnStyles: {
            0: { cellWidth: 10 },
            3: { cellWidth: 10 },
            4: { halign: 'right', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 20 },
            6: { halign: 'right', cellWidth: 15 },
            7: { halign: 'right', cellWidth: 20 },
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Summary Table
      checkPageBreak(40);
      const summaryData = [];
      if (services.length > 0) {
        summaryData.push(['Tổng tiền dịch vụ:', services.reduce((sum, item) => sum + item.total, 0).toLocaleString()]);
      }
      if (materials.length > 0) {
        summaryData.push(['Tổng tiền vật tư:', materials.reduce((sum, item) => sum + item.total, 0).toLocaleString()]);
      }
      if (tax !== undefined && tax > 0) {
        summaryData.push(['Thuế VAT:', tax.toLocaleString()]);
      }
      if (discount !== undefined && discount > 0) {
        summaryData.push(['Chiết khấu:', discount.toLocaleString()]);
      }
      summaryData.push(['Phải thanh toán:', total.toLocaleString()]);

      pdf.autoTable({
        startY: yPosition,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 50 },
          1: { halign: 'right' },
        },
      });
      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Amount in Words
      checkPageBreak(10);
      pdf.setFontSize(10);
      pdf.text(`Bằng chữ (VNĐ): ${numberToVietnameseText(total)}`, margin, yPosition);
      yPosition += 10;

      // Notes
      checkPageBreak(20);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`- Giá trên chưa bao gồm VAT. Nếu cần hóa đơn GTGT, xin vui lòng thông báo trước.`, margin, yPosition);
      yPosition += 5;
      pdf.text(`- Báo giá có giá trị trong vòng 7 ngày kể từ ngày ${formatLocalDate(invoiceDate)}.`, margin, yPosition);
      if (notes) {
        yPosition += 5;
        pdf.text(`- ${notes}`, margin, yPosition);
      }
      yPosition += 10;

      // Footer
      checkPageBreak(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Cảm ơn quý khách đã sử dụng dịch vụ của ${garageName}!`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.text(`Liên hệ: ${garagePhone} | ${garageEmail}`, pageWidth / 2, yPosition, { align: 'center' });

      // Save PDF
      pdf.save(`Bao_gia_${invoiceNumber}.pdf`);
      toast({
        title: 'Thành công',
        description: 'Đã xuất file PDF thành công.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo file PDF. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="quotation-template">
      <div className="print-header">
        <div className="garage-info">
          {logo && <img src={logo} alt="Logo" className="garage-logo" />}
          <h2>{garageName}</h2>
          <p>{garageAddress}</p>
          <p>Điện thoại: {garagePhone} | MST: {garageTaxCode}</p>
          <p>Email: {garageEmail}</p>
        </div>
        <div className="invoice-info">
          <h2>BÁO GIÁ DỊCH VỤ</h2>
          <p>Số: {invoiceNumber}</p>
          <p>Ngày: {formatLocalDate(invoiceDate)}</p>
        </div>
      </div>

      <div className="customer-vehicle-info">
        <table>
          <tbody>
            <tr>
              <td className="label">Khách hàng:</td>
              <td>{customerName}</td>
              <td className="label">Mã phiếu:</td>
              <td>{invoiceNumber}</td>
            </tr>
            <tr>
              <td className="label">Địa chỉ:</td>
              <td>{customerAddress || '-'}</td>
              <td className="label">Ngày:</td>
              <td>{formatLocalDate(invoiceDate)}</td>
            </tr>
            <tr>
              <td className="label">Biển số:</td>
              <td>{vehicleLicensePlate}</td>
              <td className="label">Hãng xe:</td>
              <td>{vehicleBrand || '-'}</td>
            </tr>
            <tr>
              <td className="label">Loại xe:</td>
              <td>{vehicleModel || '-'}</td>
              <td className="label">Số KM:</td>
              <td>{odometerReading?.toLocaleString() || '-'}</td>
            </tr>
            <tr>
              <td className="label">Thợ sửa chữa:</td>
              <td>{repairTechnician || '-'}</td>
              <td className="label">Số điện thoại:</td>
              <td>{customerPhone || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dịch vụ */}
      {items.filter(item => item.unit === 'Dịch vụ').length > 0 && (
        <div className="services-section">
          <h3>Chi tiết dịch vụ</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên dịch vụ</th>
                <th>ĐVT</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>Chiết khấu</th>
                <th>Thành toán</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(item => item.unit === 'Dịch vụ')
                .map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.description}</td>
                    <td>{item.unit}</td>
                    <td>{item.quantity}</td>
                    <td className="number">{item.unitPrice.toLocaleString()}</td>
                    <td className="number">{item.amount.toLocaleString()}</td>
                    <td className="number">{(item.discount || 0).toLocaleString()}</td>
                    <td className="number">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              <tr className="total-row">
                <td colSpan={5} className="right">Cộng dịch vụ:</td>
                <td className="number">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + item.amount, 0)
                    .toLocaleString()}
                </td>
                <td className="number">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + (item.discount || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="number">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Vật tư */}
      {items.filter(item => item.unit !== 'Dịch vụ').length > 0 && (
        <div className="materials-section">
          <h3>Chi tiết vật tư</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên vật tư</th>
                <th>ĐVT</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>Chiết khấu</th>
                <th>Thành toán</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(item => item.unit !== 'Dịch vụ')
                .map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.description}</td>
                    <td>{item.unit}</td>
                    <td>{item.quantity}</td>
                    <td className="number">{item.unitPrice.toLocaleString()}</td>
                    <td className="number">{item.amount.toLocaleString()}</td>
                    <td className="number">{(item.discount || 0).toLocaleString()}</td>
                    <td className="number">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              <tr className="total-row">
                <td colSpan={5} className="right">Cộng vật tư:</td>
                <td className="number">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + item.amount, 0)
                    .toLocaleString()}
                </td>
                <td className="number">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + (item.discount || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="number">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="summary-section">
        <table className="summary-table">
          <tbody>
            {items.filter(item => item.unit === 'Dịch vụ').length > 0 && (
              <tr>
                <td className="label">Tổng tiền dịch vụ:</td>
                <td className="number">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()}
                </td>
              </tr>
            )}
            {items.filter(item => item.unit !== 'Dịch vụ').length > 0 && (
              <tr>
                <td className="label">Tổng tiền vật tư:</td>
                <td className="number">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()}
                </td>
              </tr>
            )}
            {tax !== undefined && tax > 0 && (
              <tr>
                <td className="label">Thuế VAT:</td>
                <td className="number">{tax.toLocaleString()}</td>
              </tr>
            )}
            {discount !== undefined && discount > 0 && (
              <tr>
                <td className="label">Chiết khấu:</td>
                <td className="number">{discount.toLocaleString()}</td>
              </tr>
            )}
            <tr className="total">
              <td className="label">Phải thanh toán:</td>
              <td className="number">{total.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={2} className="words">
                Bằng chữ: {numberToVietnameseText(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="notes-section">
        <p className="note">- Giá trên chưa bao gồm VAT. Nếu cần hóa đơn GTGT, xin vui lòng thông báo trước.</p>
        <p className="note">- Báo giá có giá trị trong vòng 7 ngày kể từ ngày {formatLocalDate(invoiceDate)}.</p>
        {notes && <p className="note">- {notes}</p>}
      </div>

      <div className="footer">
        <p>Cảm ơn quý khách đã sử dụng dịch vụ của {garageName}!</p>
        <p>Liên hệ: {garagePhone} | {garageEmail}</p>
      </div>

      {!isPrintMode && (
        <div className="print-buttons">
          <button className="print-button" onClick={printToPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html:`
        .quotation-template {
          font-family: 'Helvetica', Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          border: ${isPrintMode ? 'none' : '1px solid #ddd'};
          box-shadow: ${isPrintMode ? 'none' : '0 0 10px rgba(0,0,0,0.1)'};
          background-color: white;
          color: #333;
        }`}} />

        .print-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }

        .garage-logo {
          max-width: 100px;
          max-height: 50px;
          margin-bottom: 10px;
        }

        .garage-info h2, .invoice-info h2 {
          margin: 0 0 5px 0;
          font-size: 16px;
          font-weight: bold;
        }

        .garage-info p, .invoice-info p {
          margin: 2px 0;
          font-size: 12px;
        }

        .customer-vehicle-info {
          margin-bottom: 20px;
        }

        .customer-vehicle-info table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .customer-vehicle-info td {
          padding: 4px;
          border: 1px solid #ddd;
        }

        .customer-vehicle-info .label {
          font-weight: bold;
          background-color: #f0f0f0;
          width: 120px;
        }

        .services-section, .materials-section {
          margin-bottom: 20px;
        }

        h3 {
          font-size: 14px;
          margin: 10px 0;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 20px;
        }

        .items-table th, .items-table td {
          padding: 4px;
          border: 1px solid #ddd;
          text-align: left;
        }

        .items-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }

        .items-table .number {
          text-align: right;
        }

        .items-table .right {
          text-align: right;
          font-weight: bold;
          background-color: #f0f0f0;
        }

        .total-row {
          font-weight: bold;
        }

        .summary-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 20px;
        }

        .summary-table td {
          padding: 4px;
          border: 1px solid #ddd;
        }

        .summary-table .label {
          font-weight: bold;
          background-color: #f0f0f0;
          width: 150px;
        }

        .summary-table .number {
          text-align: right;
        }

        .summary-table .total {
          font-weight: bold;
          font-size: 14px;
        }

        .summary-table .words {
          font-style: italic;
          padding: 10px;
          background-color: #f9f9f9;
        }

        .notes-section {
          font-size: 11px;
          margin-bottom: 20px;
          font-style: italic;
        }

        .note {
          margin: 5px 0;
        }

        .footer {
          text-align: center;
          font-size: 12px;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #eee;
        }

        .footer p {
          margin: 3px 0;
        }

        .print-buttons {
          margin-top: 20px;
          text-align: center;
        }

        .print-button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 14px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 4px;
        }

        .print-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        @media print {
          .quotation-template {
            border: none;
            box-shadow: none;
            padding: 0;
          }

          .print-buttons {
            display: none;
          }
        }
      `}} />
    </div>
  );
}