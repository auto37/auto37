import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Mở rộng jsPDF để hỗ trợ autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => any;
    lastAutoTable: any;
  }
}

interface RepairOrderItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  discount?: number;
  total: number;
}

interface RepairOrderTemplateProps {
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
  items: RepairOrderItem[];
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

export default function RepairOrderTemplate({
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
}: RepairOrderTemplateProps) {
  const { toast } = useToast();
  const [logo, setLogo] = useState<string>('');
  const [garageName, setGarageName] = useState<string>('AUTO37 GARAGE');
  const [garageAddress, setGarageAddress] = useState<string>('Số 74 Trần Phú, P.Mộ Lao, TP.Hà Đông, HN');
  const [garagePhone, setGaragePhone] = useState<string>('0987654321');
  const [garageEmail, setGarageEmail] = useState<string>('auto37@gmail.com');
  const [garageTaxCode, setGarageTaxCode] = useState<string>('0123456789');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccount, setBankAccount] = useState<string>('');
  const [bankOwner, setBankOwner] = useState<string>('');
  const [bankBranch, setBankBranch] = useState<string>('');
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
        if (settings.bankName) setBankName(settings.bankName);
        if (settings.bankAccount) setBankAccount(settings.bankAccount);
        if (settings.bankOwner) setBankOwner(settings.bankOwner);
        if (settings.bankBranch) setBankBranch(settings.bankBranch);
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
      const margin = 25;
      const topMargin = 35; // Larger top margin for better balance
      const bottomMargin = 25;
      let yPosition = topMargin;

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - bottomMargin) {
          pdf.addPage();
          yPosition = topMargin; // Use consistent top margin on new pages
        }
      };

      // Fonts and styling
      pdf.setFont('helvetica');
      pdf.setFontSize(12);

      // Header với logo lớn hơn và bố cục đẹp hơn
      if (logo) {
        try {
          const img = new Image();
          img.src = logo;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          // Logo lớn hơn: 50x25 thay vì 30x15
          pdf.addImage(img, 'PNG', margin, yPosition, 50, 25);
        } catch (error) {
          console.warn('Error loading logo:', error);
        }
        yPosition += 30; // Tăng khoảng cách để phù hợp với logo lớn hơn
      }

      // Tiêu đề garage với font lớn hơn
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(garageName.toUpperCase(), margin, yPosition);
      
      // Thông tin garage với khoảng cách hợp lý
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      yPosition += 8;
      pdf.text(`Địa chỉ: ${garageAddress}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Điện thoại: ${garagePhone} | MST: ${garageTaxCode}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Email: ${garageEmail}`, margin, yPosition);

      // Right-aligned header với font lớn hơn
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LỆNH SỬA CHỮA', pageWidth - margin - 65, margin + 10);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Số: ${invoiceNumber}`, pageWidth - margin - 65, margin + 20);
      pdf.text(`Ngày: ${formatLocalDate(invoiceDate)}`, pageWidth - margin - 65, margin + 28);
      yPosition += 15;

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
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 35 } },
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
      if (notes) {
        pdf.text(`Ghi chú: ${notes}`, margin, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // Bank Information
      if (bankName && bankAccount) {
        checkPageBreak(20);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('THÔNG TIN THANH TOÁN:', margin, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text(`Ngân hàng: ${bankName}`, margin, yPosition);
        yPosition += 4;
        pdf.text(`Số tài khoản: ${bankAccount}`, margin, yPosition);
        yPosition += 4;
        if (bankOwner) {
          pdf.text(`Chủ tài khoản: ${bankOwner}`, margin, yPosition);
          yPosition += 4;
        }
        if (bankBranch) {
          pdf.text(`Chi nhánh: ${bankBranch}`, margin, yPosition);
          yPosition += 4;
        }
        yPosition += 6;
      }

      // Footer
      checkPageBreak(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Cảm ơn quý khách đã sử dụng dịch vụ của ${garageName}!`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      pdf.text(`Liên hệ: ${garagePhone} | ${garageEmail}`, pageWidth / 2, yPosition, { align: 'center' });

      // Save PDF
      pdf.save(`LenhSuaChua_${invoiceNumber}.pdf`);
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
    <div className="bg-white max-w-4xl mx-auto p-8 shadow-md" style={{ marginTop: '3rem', marginBottom: '3rem' }}>
      <div className="flex justify-between mb-6 border-b-2 pb-4">
        <div className="flex-1">
          {logo && <img src={logo} alt="Logo" className="h-20 mb-4" />}
          <h2 className="text-2xl font-bold mb-2">{garageName}</h2>
          <p className="text-base mb-1">{garageAddress}</p>
          <p className="text-base mb-1">Điện thoại: {garagePhone} | MST: {garageTaxCode}</p>
          <p className="text-base">Email: {garageEmail}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-8">
          <h2 className="text-2xl font-bold mb-4 text-green-600">LỆNH SỬA CHỮA</h2>
          <p className="text-base mb-1">Số: <span className="font-semibold">{invoiceNumber}</span></p>
          <p className="text-base">Ngày: <span className="font-semibold">{formatLocalDate(invoiceDate)}</span></p>
        </div>
      </div>

      <div className="mb-6">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border p-2 bg-gray-100 font-semibold w-32">Khách hàng:</td>
              <td className="border p-2">{customerName}</td>
              <td className="border p-2 bg-gray-100 font-semibold w-32">Mã phiếu:</td>
              <td className="border p-2">{invoiceNumber}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100 font-semibold">Địa chỉ:</td>
              <td className="border p-2">{customerAddress || '-'}</td>
              <td className="border p-2 bg-gray-100 font-semibold">Ngày:</td>
              <td className="border p-2">{formatLocalDate(invoiceDate)}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100 font-semibold">Biển số:</td>
              <td className="border p-2">{vehicleLicensePlate}</td>
              <td className="border p-2 bg-gray-100 font-semibold">Hãng xe:</td>
              <td className="border p-2">{vehicleBrand || '-'}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100 font-semibold">Loại xe:</td>
              <td className="border p-2">{vehicleModel || '-'}</td>
              <td className="border p-2 bg-gray-100 font-semibold">Số KM:</td>
              <td className="border p-2">{odometerReading?.toLocaleString() || '-'}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100 font-semibold">Thợ sửa chữa:</td>
              <td className="border p-2">{repairTechnician || '-'}</td>
              <td className="border p-2 bg-gray-100 font-semibold">Số điện thoại:</td>
              <td className="border p-2">{customerPhone || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dịch vụ */}
      {items.filter(item => item.unit === 'Dịch vụ').length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2">Chi tiết dịch vụ</h3>
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">STT</th>
                <th className="border p-2 text-left">Tên dịch vụ</th>
                <th className="border p-2 text-left">ĐVT</th>
                <th className="border p-2 text-left">SL</th>
                <th className="border p-2 text-right">Đơn giá</th>
                <th className="border p-2 text-right">Thành tiền</th>
                <th className="border p-2 text-right">Chiết khấu</th>
                <th className="border p-2 text-right">Thành toán</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(item => item.unit === 'Dịch vụ')
                .map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{item.description}</td>
                    <td className="border p-2">{item.unit}</td>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="border p-2 text-right">{item.amount.toLocaleString()}</td>
                    <td className="border p-2 text-right">{(item.discount || 0).toLocaleString()}</td>
                    <td className="border p-2 text-right">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              <tr className="font-semibold">
                <td colSpan={5} className="border p-2 text-right bg-gray-100">Cộng dịch vụ:</td>
                <td className="border p-2 text-right">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + item.amount, 0)
                    .toLocaleString()}
                </td>
                <td className="border p-2 text-right">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + (item.discount || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="border p-2 text-right">
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
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-2">Chi tiết vật tư</h3>
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">STT</th>
                <th className="border p-2 text-left">Tên vật tư</th>
                <th className="border p-2 text-left">ĐVT</th>
                <th className="border p-2 text-left">SL</th>
                <th className="border p-2 text-right">Đơn giá</th>
                <th className="border p-2 text-right">Thành tiền</th>
                <th className="border p-2 text-right">Chiết khấu</th>
                <th className="border p-2 text-right">Thành toán</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(item => item.unit !== 'Dịch vụ')
                .map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{item.description}</td>
                    <td className="border p-2">{item.unit}</td>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="border p-2 text-right">{item.amount.toLocaleString()}</td>
                    <td className="border p-2 text-right">{(item.discount || 0).toLocaleString()}</td>
                    <td className="border p-2 text-right">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              <tr className="font-semibold">
                <td colSpan={5} className="border p-2 text-right bg-gray-100">Cộng vật tư:</td>
                <td className="border p-2 text-right">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + item.amount, 0)
                    .toLocaleString()}
                </td>
                <td className="border p-2 text-right">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + (item.discount || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="border p-2 text-right">
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

      <div className="mb-6">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {items.filter(item => item.unit === 'Dịch vụ').length > 0 && (
              <tr>
                <td className="border p-2 bg-gray-100 font-semibold w-40">Tổng tiền dịch vụ:</td>
                <td className="border p-2 text-right">
                  {items
                    .filter(item => item.unit === 'Dịch vụ')
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()}
                </td>
              </tr>
            )}
            {items.filter(item => item.unit !== 'Dịch vụ').length > 0 && (
              <tr>
                <td className="border p-2 bg-gray-100 font-semibold">Tổng tiền vật tư:</td>
                <td className="border p-2 text-right">
                  {items
                    .filter(item => item.unit !== 'Dịch vụ')
                    .reduce((sum, item) => sum + item.total, 0)
                    .toLocaleString()}
                </td>
              </tr>
            )}
            {tax !== undefined && tax > 0 && (
              <tr>
                <td className="border p-2 bg-gray-100 font-semibold">Thuế VAT:</td>
                <td className="border p-2 text-right">{tax.toLocaleString()}</td>
              </tr>
            )}
            {discount !== undefined && discount > 0 && (
              <tr>
                <td className="border p-2 bg-gray-100 font-semibold">Chiết khấu:</td>
                <td className="border p-2 text-right">{discount.toLocaleString()}</td>
              </tr>
            )}
            <tr className="text-base font-bold">
              <td className="border p-2 bg-gray-100">Phải thanh toán:</td>
              <td className="border p-2 text-right">{total.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={2} className="border p-2 bg-gray-50 italic">
                Bằng chữ: {numberToVietnameseText(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {notes && (
        <div className="mb-6 text-sm italic">
          <p className="mb-1">Ghi chú: {notes}</p>
        </div>
      )}

      {bankName && bankAccount && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-bold text-base mb-2 text-green-800">THÔNG TIN THANH TOÁN:</h4>
          <div className="text-sm space-y-1">
            <p><span className="font-semibold">Ngân hàng:</span> {bankName}</p>
            <p><span className="font-semibold">Số tài khoản:</span> {bankAccount}</p>
            {bankOwner && <p><span className="font-semibold">Chủ tài khoản:</span> {bankOwner}</p>}
            {bankBranch && <p><span className="font-semibold">Chi nhánh:</span> {bankBranch}</p>}
          </div>
        </div>
      )}

      <div className="text-center text-sm">
        <p className="mb-1">Cảm ơn quý khách đã sử dụng dịch vụ của {garageName}!</p>
        <p>Liên hệ: {garagePhone} | {garageEmail}</p>
      </div>

      {!isPrintMode && (
        <div className="mt-6 text-center">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            onClick={printToPdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? 'Đang xuất PDF...' : ''}
          </button>
        </div>
      )}
    </div>
  );
}