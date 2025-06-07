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

interface QuyetToanItem {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  discount?: number;
  total: number;
}

interface QuyetToanTemplateProps {
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
  items: QuyetToanItem[];
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

export default function QuyetToanTemplate({
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
}: QuyetToanTemplateProps) {
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
      const pdf = new jsPDF('p', 'mm', 'a4', true); // Enable compression
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin + 20; // Hạ xuống 2cm (20mm)

      // Logo and Header
      if (logo) {
        try {
          const img = new Image();
          img.src = logo;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          // Compress and optimize image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 200; // Reduce resolution
          canvas.height = 100;
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedImage = canvas.toDataURL('image/jpeg', 0.7); // JPEG with 70% quality
          pdf.addImage(compressedImage, 'JPEG', margin, yPosition, 40, 20);
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
      pdf.text('HÓA ĐƠN QUYẾT TOÁN', pageWidth / 2, yPosition + 35, { align: 'center' });
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Số: ${invoiceNumber}`, pageWidth - margin - 40, yPosition + 45);
      pdf.text(`Ngày: ${formatLocalDate(invoiceDate)}`, pageWidth - margin - 40, yPosition + 52);

      yPosition += 65;

      // Customer info
      pdf.autoTable({
        startY: yPosition,
        body: [
          ['Khách hàng:', customerName, 'Mã phiếu:', invoiceNumber],
          ['Địa chỉ:', customerAddress || '', 'Ngày:', formatLocalDate(invoiceDate)],
          ['Biển số:', vehicleLicensePlate, 'Hãng xe:', vehicleBrand || ''],
          ['Loại xe:', vehicleModel || '', 'Số KM:', odometerReading?.toLocaleString() || '0'],
          ['Thợ sửa chữa:', repairTechnician || '-', 'Số điện thoại:', customerPhone || '']
        ],
        theme: 'grid',
        styles: { 
          fontSize: 10, 
          cellPadding: 3,
          fillColor: [50, 50, 50],
          textColor: [255, 255, 255]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 25 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', cellWidth: 25 },
          3: { cellWidth: 60 }
        },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 10;

      // Separate items by type
      const materials = items.filter(item => item.unit === 'Cái');
      const services = items.filter(item => item.unit === 'Dịch vụ');

      // Materials table
      if (materials.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Chi tiết vật tư', margin, yPosition);
        yPosition += 8;

        const materialsData = materials.map((item, index) => [
          index + 1,
          item.description,
          item.unit,
          item.quantity,
          item.unitPrice.toLocaleString(),
          item.amount.toLocaleString(),
          '0', // Chiết khấu
          item.amount.toLocaleString()
        ]);

        // Add total row
        const materialsTotal = materials.reduce((sum, item) => sum + item.amount, 0);
        materialsData.push(['', 'Cộng vật tư:', '', '', '', materialsTotal.toLocaleString(), '0', materialsTotal.toLocaleString()]);

        pdf.autoTable({
          startY: yPosition,
          head: [['STT', 'Tên vật tư', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'Chiết khấu', 'Thành toán']],
          body: materialsData,
          theme: 'grid',
          styles: { 
            fontSize: 8,
            cellPadding: 1.5,
            lineWidth: 0.1
          },
          headStyles: { 
            fillColor: [240, 240, 240], 
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 22, halign: 'right' }
          }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Services table
      if (services.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Chi tiết dịch vụ', margin, yPosition);
        yPosition += 8;

        const servicesData = services.map((item, index) => [
          index + 1,
          item.description,
          item.unit,
          item.quantity,
          item.unitPrice.toLocaleString(),
          item.amount.toLocaleString(),
          '0', // Chiết khấu
          item.amount.toLocaleString()
        ]);

        // Add total row
        const servicesTotal = services.reduce((sum, item) => sum + item.amount, 0);
        servicesData.push(['', 'Cộng dịch vụ:', '', '', '', servicesTotal.toLocaleString(), '0', servicesTotal.toLocaleString()]);

        pdf.autoTable({
          startY: yPosition,
          head: [['STT', 'Tên dịch vụ', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'Chiết khấu', 'Thành toán']],
          body: servicesData,
          theme: 'grid',
          styles: { 
            fontSize: 8,
            cellPadding: 1.5,
            lineWidth: 0.1
          },
          headStyles: { 
            fillColor: [240, 240, 240], 
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 22, halign: 'right' }
          }
        });

        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Summary totals table
      const materialsTotal = materials.reduce((sum, item) => sum + item.amount, 0);
      const servicesTotal = services.reduce((sum, item) => sum + item.amount, 0);

      const summaryData = [
        ['Tổng tiền dịch vụ:', '', '', '', '', servicesTotal.toLocaleString()],
        ['Tổng tiền vật tư:', '', '', '', '', materialsTotal.toLocaleString()],
        ['Phải thanh toán:', '', '', '', '', total.toLocaleString()]
      ];

      pdf.autoTable({
        startY: yPosition,
        body: summaryData,
        theme: 'plain',
        styles: { 
          fontSize: 10,
          cellPadding: 2,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30, halign: 'right' }
        }
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 5;
      
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

      // Notes section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('- Giá trên chưa bao gồm VAT. Nếu cần hóa đơn GTGT, xin vui lòng thông báo trước.', margin, yPosition);
      yPosition += 6;
      pdf.text('- Hóa đơn có giá trị trong vòng 7 ngày kể từ ngày 06/06/2025.', margin, yPosition);
      
      yPosition += 20;

      // Footer message
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Cảm ơn quý khách đã sử dụng dịch vụ của ${garageName}!`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      pdf.text(`Liên hệ: ${garagePhone} - ${garageEmail} | ${garageEmail}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 20;

      // Signature section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Người lập hóa đơn', pageWidth - margin - 50, yPosition, { align: 'center' });
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text('(Ký và ghi rõ họ tên)', pageWidth - margin - 50, yPosition, { align: 'center' });

      // Optimize PDF before saving
      pdf.setProperties({
        title: `Hóa đơn ${invoiceNumber}`,
        subject: 'Hóa đơn quyết toán',
        creator: garageName
      });

      // Compress and save
      pdf.save(`Quyet_toan_${invoiceNumber}.pdf`);
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
          <h2 className="text-2xl font-bold text-purple-600 mb-2">HÓA ĐƠN QUYẾT TOÁN</h2>
          <p className="text-sm"><strong>Số:</strong> {invoiceNumber}</p>
          <p className="text-sm"><strong>Ngày:</strong> {formatLocalDate(invoiceDate)}</p>
        </div>
      </div>

      {/* Customer Info - Dark styled table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <tbody>
            <tr className="bg-gray-800 text-white">
              <td className="border border-gray-300 p-3 font-bold">Khách hàng:</td>
              <td className="border border-gray-300 p-3">{customerName}</td>
              <td className="border border-gray-300 p-3 font-bold">Mã phiếu:</td>
              <td className="border border-gray-300 p-3">{invoiceNumber}</td>
            </tr>
            <tr className="bg-gray-800 text-white">
              <td className="border border-gray-300 p-3 font-bold">Địa chỉ:</td>
              <td className="border border-gray-300 p-3">{customerAddress || ''}</td>
              <td className="border border-gray-300 p-3 font-bold">Ngày:</td>
              <td className="border border-gray-300 p-3">{formatLocalDate(invoiceDate)}</td>
            </tr>
            <tr className="bg-gray-800 text-white">
              <td className="border border-gray-300 p-3 font-bold">Biển số:</td>
              <td className="border border-gray-300 p-3">{vehicleLicensePlate}</td>
              <td className="border border-gray-300 p-3 font-bold">Hãng xe:</td>
              <td className="border border-gray-300 p-3">{vehicleBrand || ''}</td>
            </tr>
            <tr className="bg-gray-800 text-white">
              <td className="border border-gray-300 p-3 font-bold">Loại xe:</td>
              <td className="border border-gray-300 p-3">{vehicleModel || ''}</td>
              <td className="border border-gray-300 p-3 font-bold">Số KM:</td>
              <td className="border border-gray-300 p-3">{odometerReading?.toLocaleString() || '0'}</td>
            </tr>
            <tr className="bg-gray-800 text-white">
              <td className="border border-gray-300 p-3 font-bold">Thợ sửa chữa:</td>
              <td className="border border-gray-300 p-3">{repairTechnician || '-'}</td>
              <td className="border border-gray-300 p-3 font-bold">Số điện thoại:</td>
              <td className="border border-gray-300 p-3">{customerPhone || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Items Tables - Separate Materials and Services */}
      <div className="mb-6">
        {/* Materials Table */}
        {(() => {
          const materials = items.filter(item => item.unit === 'Cái');
          const materialsTotal = materials.reduce((sum, item) => sum + item.amount, 0);
          
          return materials.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-blue-600">VẬT TƯ</h3>
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
                  {materials.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-2">{item.description}</td>
                      <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                      <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 text-right">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={5} className="border border-gray-300 p-2 text-right">Tổng vật tư:</td>
                    <td className="border border-gray-300 p-2 text-right">{materialsTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null;
        })()}

        {/* Services Table */}
        {(() => {
          const services = items.filter(item => item.unit === 'Dịch vụ');
          const servicesTotal = services.reduce((sum, item) => sum + item.amount, 0);
          
          return services.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-green-600">DỊCH VỤ</h3>
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
                  {services.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-2">{item.description}</td>
                      <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                      <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 text-right">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-50 font-bold">
                    <td colSpan={5} className="border border-gray-300 p-2 text-right">Tổng dịch vụ:</td>
                    <td className="border border-gray-300 p-2 text-right">{servicesTotal.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null;
        })()}

        {/* Total Summary */}
        <div className="bg-gray-100 p-4 rounded-lg">
          {discount && discount > 0 && (
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Chiết khấu:</span>
              <span className="font-semibold text-orange-600">-{discount.toLocaleString()} VNĐ</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold">PHẢI THANH TOÁN:</span>
            <span className="text-lg font-bold text-red-600">{total.toLocaleString()} VNĐ</span>
          </div>
          <div className="text-sm italic text-gray-600">
            Bằng chữ: {numberToVietnameseText(total)}
          </div>
        </div>
      </div>

      <div className="mb-6 text-sm italic">
        <p className="mb-1">- Giá trên chưa bao gồm VAT. Nếu cần hóa đơn GTGT, xin vui lòng thông báo trước.</p>
        <p className="mb-1">- Hóa đơn có giá trị trong vòng 7 ngày kể từ ngày {formatLocalDate(invoiceDate)}.</p>
        {notes && <p className="mb-1">- {notes}</p>}
      </div>

      {bankName && bankAccount && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h4 className="font-bold text-base mb-2 text-purple-800">THÔNG TIN THANH TOÁN:</h4>
          <div className="text-sm space-y-1">
            <p><span className="font-semibold">Ngân hàng:</span> {bankName}</p>
            <p><span className="font-semibold">Số tài khoản:</span> {bankAccount}</p>
            {bankOwner && <p><span className="font-semibold">Chủ tài khoản:</span> {bankOwner}</p>}
            {bankBranch && <p><span className="font-semibold">Chi nhánh:</span> {bankBranch}</p>}
          </div>
        </div>
      )}

      {/* Footer message */}
      <div className="text-center text-sm mb-6">
        <p className="mb-1">Cảm ơn quý khách đã sử dụng dịch vụ của {garageName}!</p>
        <p>Liên hệ: {garagePhone} - {garageEmail} | {garageEmail}</p>
      </div>

      {/* Signature section */}
      <div className="flex justify-end mb-6">
        <div className="text-center">
          <p className="font-bold mb-2">Người lập hóa đơn</p>
          <p className="text-sm italic">(Ký và ghi rõ họ tên)</p>
          <div className="w-32 h-16 border-b border-gray-400 mt-4"></div>
        </div>
      </div>

      {!isPrintMode && (
        <div className="mt-6 text-center">
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
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