import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface QuyetToanItemType {
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
  items: QuyetToanItemType[];
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
  items: allItems,
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

  const itemsPerPage = 10;
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const pages = Array.from({ length: totalPages }, (_, pageIndex) => {
    const start = pageIndex * itemsPerPage;
    const end = start + itemsPerPage;
    return allItems.slice(start, end);
  });

  const printToPdf = async () => {
    setIsGeneratingPdf(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageElement = document.getElementById(`quyetToanPrint-page-${pageIndex}`);
      if (!pageElement) continue;

      const canvas = await html2canvas(pageElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    }

    pdf.save(`Quyet_toan_${invoiceNumber}.pdf`);
    toast({
      title: 'Thành công',
      description: 'Đã xuất file PDF thành công.',
    });
    setIsGeneratingPdf(false);
  };

  const services = allItems.filter(item => item.unit === 'Dịch vụ');
  const materials = allItems.filter(item => item.unit !== 'Dịch vụ');
  const subtotalServices = services.reduce((sum, item) => sum + item.total, 0);
  const subtotalMaterials = materials.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className={`${isPrintMode || isGeneratingPdf ? 'p-0' : 'p-4 bg-gray-100 min-h-screen'}`}>
      {!(isPrintMode || isGeneratingPdf) && (
        <div className="mb-6 flex justify-end max-w-4xl mx-auto print-hidden">
          <button
            onClick={printToPdf}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            Xuất PDF
          </button>
        </div>
      )}

      {pages.map((pageItems, pageIndex) => (
        <div
          key={pageIndex}
          id={`quyetToanPrint-page-${pageIndex}`}
          className={`bg-white font-['Roboto',sans-serif] page-break mb-4 ${
            isPrintMode || isGeneratingPdf ? 'p-0' : 'p-8 border border-gray-200 rounded-lg shadow-lg'
          }`}
          style={{ maxWidth: '210mm', margin: '0 auto', fontSize: '12px' }}
        >
          <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-start">
            <div className="flex items-center space-x-4">
              {logo && <img src={logo} alt={garageName} className="h-16 w-auto object-contain" />}
              <div>
                <h1 className="text-2xl font-bold text-blue-800 uppercase">{garageName}</h1>
                <p className="text-gray-600">Địa chỉ: {garageAddress}</p>
                <p className="text-gray-600">Điện thoại: {garagePhone} | MST: {garageTaxCode}</p>
                <p className="text-gray-600">Email: {garageEmail}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-semibold text-blue-600">QUYẾT TOÁN DỊCH VỤ</h2>
              <p className="text-gray-600">Số: {invoiceNumber}</p>
              <p className="text-gray-600">Ngày: {formatLocalDate(invoiceDate)}</p>
            </div>
          </div>

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

          {pageItems.filter(item => item.unit === 'Dịch vụ').length > 0 && (
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
                  {pageItems
                    .filter(item => item.unit === 'Dịch vụ')
                    .map((item, index) => (
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
                </tbody>
              </table>
            </div>
          )}

          {pageItems.filter(item => item.unit !== 'Dịch vụ').length > 0 && (
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
                  {pageItems
                    .filter(item => item.unit !== 'Dịch vụ')
                    .map((item, index) => (
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
                </tbody>
              </table>
            </div>
          )}

          {pageIndex === totalPages - 1 && (
            <>
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

              <div className="mb-6">
                <p className="text-sm">
                  <span className="font-semibold">Bằng chữ (VNĐ): </span>
                  <span className="italic">{numberToVietnameseText(total)}</span>
                </p>
              </div>

              <div className="mb-6 text-sm italic text-gray-600">
                <p>- Giá trên chưa bao gồm VAT. Nếu cần hóa đơn GTGT, xin vui lòng thông báo trước.</p>
                {notes && <p>- {notes}</p>}
              </div>

              <div className="grid grid-cols-2 text-center text-sm mt-8 mb-6">
                <div>
                  <p className="font-semibold mb-8">Người lập phiếu</p>
                  <p className="italic text-gray-600">(Ký và ghi rõ họ tên)</p>
                </div>
                <div>
                  <p className="font-semibold mb-8">Khách hàng</p>
                  <p className="italic text-gray-600">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
            <p>Cảm ơn quý khách đã sử dụng dịch vụ của {garageName}!</p>
            <p>Liên hệ: {garagePhone} | {garageEmail}</p>
          </div>
        </div>
      ))}

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
          .page-break {
            page-break-after: always;
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