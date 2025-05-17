import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface QuotationItemType {
  id: number;
  stt: number;
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
  items: QuotationItemType[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  notes?: string;
  isPrintMode?: boolean;
}

// Hàm chuyển số thành chữ tiếng Việt với chữ cái đầu viết hoa
const numberToVietnameseText = (number: number): string => {
  if (number < 0) return 'Số âm không hợp lệ';

  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const numbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const readThreeDigits = (num: number): string => {
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;
    let str = '';

    if (hundreds > 0) {
      str += `${numbers[hundreds]} trăm `;
    }
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

  const printToPdf = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      const element = document.getElementById('quotationPrint');
      if (!element) {
        toast({
          title: 'Lỗi',
          description: 'Không thể tạo file PDF. Vui lòng thử lại.',
          variant: 'destructive',
        });
        setIsGeneratingPdf(false);
        return;
      }

      html2canvas(element, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`Bao_gia_${invoiceNumber}.pdf`);

        toast({
          title: 'Thành công',
          description: 'Đã xuất file PDF thành công.',
        });
        setIsGeneratingPdf(false);
      });
    }, 100);
  };

  const formatLocalDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Chia items thành Dịch vụ và Vật tư
  const services = items.filter(item => item.unit === 'Dịch vụ');
  const materials = items.filter(item => item.unit !== 'Dịch vụ');

  // Tính tổng phụ cho Dịch vụ và Vật tư
  const subtotalServices = services.reduce((sum, item) => sum + item.total, 0);
  const subtotalMaterials = materials.reduce((sum, item) => sum + item.total, 0);

  // Kiểm tra dữ liệu total
  useEffect(() => {
    const calculatedTotal = subtotalServices + subtotalMaterials + (tax || 0) - (discount || 0);
    if (calculatedTotal !== total) {
      console.warn(`Tổng tiền không khớp: Tính toán = ${calculatedTotal}, Đầu vào = ${total}`);
    }
  }, [items, total, tax, discount]);

  return (
    <div className={`${isPrintMode || isGeneratingPdf ? 'p-0' : 'p-4 bg-gray-100 min-h-screen'}`}>
      {!(isPrintMode || isGeneratingPdf) && (
        <div className="mb-6 flex justify-end max-w-4xl mx-auto print-hidden">
          <button
            onClick={printToPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 focus:outline-none"
          >
            {isGeneratingPdf ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xuất PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"></path>
                </svg>
                Xuất PDF
              </>
            )}
          </button>
        </div>
      )}

      <div
        id="quotationPrint"
        className={`bg-white font-['Roboto',sans-serif] ${
          isPrintMode || isGeneratingPdf ? 'p-0' : 'p-8 border border-gray-200 rounded-lg shadow-lg'
        }`}
        style={{ maxWidth: '210mm', margin: '0 auto', fontSize: '12px' }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-start">
          <div className="flex items-center space-x-4">
            {logo && (
              <img src={logo} alt={garageName} className="h-16 w-auto object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-blue-800 uppercase">{garageName}</h1>
              <p className="text-gray-600">Địa chỉ: {garageAddress}</p>
              <p className="text-gray-600">Điện thoại: {garagePhone} | MST: {garageTaxCode}</p>
              <p className="text-gray-600">Email: {garageEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-blue-600">BÁO GIÁ DỊCH VỤ</h2>
            <p className="text-gray-600">Số: {invoiceNumber}</p>
            <p className="text-gray-600">Ngày: {formatLocalDate(invoiceDate)}</p>
          </div>
        </div>

        {/* Customer and Vehicle Info */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-200 text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold w-28 bg-gray-50">Khách hàng:</td>
                <td className="border border-gray-200 p-2">{customerName}</td>
                <td className="border border-gray-200 p-2 font-semibold w-28 bg-gray-50">Mã phiếu:</td>
                <td className="border border-gray-200 p-2 w-36">{invoiceNumber}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Địa chỉ:</td>
                <td className="border border-gray-200 p-2">{customerAddress || '-'}</td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Ngày:</td>
                <td className="border border-gray-200 p-2">{formatLocalDate(invoiceDate)}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Biển số:</td>
                <td className="border border-gray-200 p-2">{vehicleLicensePlate}</td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Hãng xe:</td>
                <td className="border border-gray-200 p-2">{vehicleBrand || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Loại xe:</td>
                <td className="border border-gray-200 p-2">{vehicleModel || '-'}</td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Số KM:</td>
                <td className="border border-gray-200 p-2">{odometerReading?.toLocaleString() || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Thợ sửa chữa:</td>
                <td className="border border-gray-200 p-2">{repairTechnician || '-'}</td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Số điện thoại:</td>
                <td className="border border-gray-200 p-2">{customerPhone || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Services Table */}
        {services.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Chi tiết dịch vụ</h3>
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-200 p-2 text-center w-12">STT</th>
                  <th className="border border-gray-200 p-2 text-left">Tên dịch vụ</th>
                  <th className="border border-gray-200 p-2 text-center w-16">ĐVT</th>
                  <th className="border border-gray-200 p-2 text-center w-16">SL</th>
                  <th className="border border-gray-200 p-2 text-right w-24">Đơn giá</th>
                  <th className="border border-gray-200 p-2 text-right w-24">Thành tiền</th>
                  <th className="border border-gray-200 p-2 text-right w-20">Chiết khấu</th>
                  <th className="border border-gray-200 p-2 text-right w-24">Thành toán</th>
                </tr>
              </thead>
              <tbody>
                {services.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="border border-gray-200 p-2 text-center">{item.stt || index + 1}</td>
                    <td className="border border-gray-200 p-2">{item.description}</td>
                    <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
                    <td className="border border-gray-200 p-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-200 p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{item.amount.toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{(item.discount || 0).toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="border border-gray-200 p-2 text-right font-semibold bg-gray-50">
                    Cộng dịch vụ:
                  </td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">{subtotalServices.toLocaleString()}</td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">
                    {(services.reduce((sum, item) => sum + (item.discount || 0), 0)).toLocaleString()}
                  </td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">{subtotalServices.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Materials Table */}
        {materials.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Chi tiết vật tư</h3>
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-200 p-2 text-center w-12">STT</th>
                  <th className="border border-gray-200 p-2 text-left">Tên vật tư</th>
                  <th className="border border-gray-200 p-2 text-center w-16">ĐVT</th>
                  <th className="border border-gray-200 p-2 text-center w-16">SL</th>
                  <th className="border border-gray-200 p-2 text-right w-24">Đơn giá</th>
                  <th className="border border-gray-200 p-2 text-right w-24">Thành tiền</th>
                  <th className="border border-gray-200 p-2 text-right w-20">Chiết khấu</th>
                  <th className="border border-gray-200 p-2 text-right w-24">Thành toán</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="border border-gray-200 p-2 text-center">{item.stt || index + 1}</td>
                    <td className="border border-gray-200 p-2">{item.description}</td>
                    <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
                    <td className="border border-gray-200 p-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-200 p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{item.amount.toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{(item.discount || 0).toLocaleString()}</td>
                    <td className="border border-gray-200 p-2 text-right">{item.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="border border-gray-200 p-2 text-right font-semibold bg-gray-50">
                    Cộng vật tư:
                  </td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">{subtotalMaterials.toLocaleString()}</td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">
                    {(materials.reduce((sum, item) => sum + (item.discount || 0), 0)).toLocaleString()}
                  </td>
                  <td className="border border-gray-200 p-2 text-right font-semibold">{subtotalMaterials.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 flex justify-end">
          <table className="border-collapse border border-gray-200 w-80">
            <tbody>
              {services.length > 0 && (
                <tr>
                  <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Tổng tiền dịch vụ:</td>
                  <td className="border border-gray-200 p-2 text-right">{subtotalServices.toLocaleString()}</td>
                </tr>
              )}
              {materials.length > 0 && (
                <tr>
                  <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Tổng tiền vật tư:</td>
                  <td className="border border-gray-200 p-2 text-right">{subtotalMaterials.toLocaleString()}</td>
                </tr>
              )}
              {tax !== undefined && tax > 0 && (
                <tr>
                  <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Thuế VAT:</td>
                  <td className="border border-gray-200 p-2 text-right">{tax.toLocaleString()}</td>
                </tr>
              )}
              {discount !== undefined && discount > 0 && (
                <tr>
                  <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Chiết khấu:</td>
                  <td className="border border-gray-200 p-2 text-right">{discount.toLocaleString()}</td>
                </tr>
              )}
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">Phải thanh toán:</td>
                <td className="border border-gray-200 p-2 text-right font-bold">{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="mb-6">
          <p className="text-sm">
            <span className="font-semibold">Bằng chữ (VNĐ): </span>
            <span className="italic">{numberToVietnameseText(total)}</span>
          </p>
        </div>

        {/* Notes */}
        <div className="mb-6 text-sm italic text-gray-600">
          <p>- Giá trên chưa bao gồm VAT. Nếu cần hóa đơn GTGT, xin vui lòng thông báo trước.</p>
          <p>- Báo giá có giá trị trong vòng 7 ngày kể từ ngày {formatLocalDate(invoiceDate)}.</p>
          {notes && <p>- {notes}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          <p>Cảm ơn quý khách đã sử dụng dịch vụ của {garageName}!</p>
          <p>Liên hệ: {garagePhone} | {garageEmail}</p>
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Roboto', sans-serif;
          }
          .p-4 {
            padding: 0 !important;
          }
          .bg-gray-100 {
            background: white !important;
          }
          .shadow-lg,
          .border {
            box-shadow: none !important;
            border: none !important;
          }
          .print-hidden {
            display: none !important;
          }
          #quotationPrint {
            width: 100%;
            max-width: none;
          }
        }
        @font-face {
          font-family: 'Roboto';
          src: url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        }
      `}</style>
    </div>
  );
}