import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
    if (num === 0) return '';
    
    let result = '';
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;

    if (hundreds > 0) {
      result += numbers[hundreds] + ' trăm';
      if (tens > 0 || ones > 0) result += ' ';
    }

    if (tens > 1) {
      result += numbers[tens] + ' mười';
      if (ones > 0) result += ' ' + numbers[ones];
    } else if (tens === 1) {
      result += 'mười';
      if (ones > 0) result += ' ' + numbers[ones];
    } else if (ones > 0 && hundreds > 0) {
      result += 'lẻ ' + numbers[ones];
    } else if (ones > 0) {
      result += numbers[ones];
    }

    return result;
  };

  if (number === 0) return 'Không đồng';

  let result = '';
  let unitIndex = 0;

  while (number > 0) {
    const group = number % 1000;
    if (group > 0) {
      const groupText = readThreeDigits(group);
      if (unitIndex > 0) {
        result = groupText + ' ' + units[unitIndex] + (result ? ' ' + result : '');
      } else {
        result = groupText;
      }
    }
    number = Math.floor(number / 1000);
    unitIndex++;
  }

  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
};

const formatLocalDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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

  const printToPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin;

      // Logo and Header
      if (logo) {
        try {
          const img = new Image();
          img.src = logo;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          pdf.addImage(img, 'PNG', margin, yPosition, 40, 20);
        } catch (error) {
          console.warn('Error loading logo:', error);
        }
      }

      // Company info
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(garageName, margin + 50, yPosition + 8);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Địa chỉ: ${garageAddress}`, margin + 50, yPosition + 15);
      pdf.text(`Tel: ${garagePhone} | Email: ${garageEmail}`, margin + 50, yPosition + 20);

      // Document title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LỆNH SỬA CHỮA', pageWidth / 2, yPosition + 35, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Số: ${invoiceNumber}`, pageWidth - margin - 40, yPosition + 45);
      pdf.text(`Ngày: ${formatLocalDate(invoiceDate)}`, pageWidth - margin - 40, yPosition + 52);

      yPosition += 65;

      // Customer info
      pdf.autoTable({
        startY: yPosition,
        body: [
          ['Khách hàng:', customerName, 'Biển số xe:', vehicleLicensePlate],
          ['Địa chỉ:', customerAddress || '', 'Hãng xe:', vehicleBrand || ''],
          ['Điện thoại:', customerPhone || '', 'Model:', vehicleModel || ''],
          ['Thợ sửa chữa:', repairTechnician || '', 'Số KM:', odometerReading?.toLocaleString() || ''],
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 },
          2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 30 }
        },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Items table
      const tableData = items.map((item, index) => [
        index + 1,
        item.description,
        item.unit,
        item.quantity,
        item.unitPrice.toLocaleString(),
        item.amount.toLocaleString()
      ]);

      pdf.autoTable({
        startY: yPosition,
        head: [['STT', 'Nội dung', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Summary
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Tổng cộng: ${total.toLocaleString()} VNĐ`, pageWidth - margin - 50, yPosition, { align: 'right' });
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Bằng chữ: ${numberToVietnameseText(total)}`, margin, yPosition);

      yPosition += 15;

      // Bank info
      if (bankName && bankAccount) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('THÔNG TIN THANH TOÁN:', margin, yPosition);
        yPosition += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Ngân hàng: ${bankName}`, margin, yPosition);
        yPosition += 4;
        pdf.text(`Số TK: ${bankAccount}`, margin, yPosition);
        if (bankOwner) {
          yPosition += 4;
          pdf.text(`Chủ TK: ${bankOwner}`, margin, yPosition);
        }
        yPosition += 8;
      }

      // Footer
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Cảm ơn quý khách hàng!`, pageWidth / 2, yPosition + 10, { align: 'center' });

      pdf.save(`Lenh_sua_chua_${invoiceNumber}.pdf`);
      toast({
        title: 'Thành công',
        description: 'Đã xuất file PDF thành công.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xuất file PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center space-x-4">
          {logo && <img src={logo} alt="Logo" className="h-20 w-auto object-contain" />}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{garageName}</h1>
            <p className="text-sm text-gray-600">{garageAddress}</p>
            <p className="text-sm text-gray-600">Tel: {garagePhone} | Email: {garageEmail}</p>
            <p className="text-sm text-gray-600">MST: {garageTaxCode}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-green-600 mb-2">LỆNH SỬA CHỮA</h2>
          <p className="text-sm"><strong>Số:</strong> {invoiceNumber}</p>
          <p className="text-sm"><strong>Ngày:</strong> {formatLocalDate(invoiceDate)}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p><strong>Khách hàng:</strong> {customerName}</p>
          <p><strong>Địa chỉ:</strong> {customerAddress || ''}</p>
          <p><strong>Điện thoại:</strong> {customerPhone || ''}</p>
          <p><strong>Thợ sửa chữa:</strong> {repairTechnician || ''}</p>
        </div>
        <div>
          <p><strong>Biển số xe:</strong> {vehicleLicensePlate}</p>
          <p><strong>Hãng xe:</strong> {vehicleBrand || ''}</p>
          <p><strong>Model:</strong> {vehicleModel || ''}</p>
          <p><strong>Số KM:</strong> {odometerReading?.toLocaleString() || ''}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-center">STT</th>
              <th className="border border-gray-300 p-2 text-left">Nội dung</th>
              <th className="border border-gray-300 p-2 text-center">ĐVT</th>
              <th className="border border-gray-300 p-2 text-center">SL</th>
              <th className="border border-gray-300 p-2 text-right">Đơn giá</th>
              <th className="border border-gray-300 p-2 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                <td className="border border-gray-300 p-2 text-right">{item.amount.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={5} className="border border-gray-300 p-2 text-right">Tổng cộng:</td>
              <td className="border border-gray-300 p-2 text-right">{total.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-gray-300 p-2 italic">
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
            {isGeneratingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}
          </button>
        </div>
      )}
    </div>
  );
}