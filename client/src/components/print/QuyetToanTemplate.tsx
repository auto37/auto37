import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import { formatCurrency, formatDate } from '@/lib/utils';
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
  isPrintMode = false
}: QuyetToanTemplateProps) {
  const { toast } = useToast();
  const [logo, setLogo] = useState<string>('');
  const [garageName, setGarageName] = useState<string>('AUTO37 GARAGE');
  const [garageAddress, setGarageAddress] = useState<string>('Số 74 Trần Phú, P.Mộ Lao, TP.Hà Đông, HN');
  const [garagePhone, setGaragePhone] = useState<string>('0987654321');
  const [garageEmail, setGarageEmail] = useState<string>('auto37@gmail.com');
  const [garageTaxCode, setGarageTaxCode] = useState<string>('0123456789');

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
    const element = document.getElementById('quyetToanPrint');
    if (!element) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo file PDF. Vui lòng thử lại.',
        variant: 'destructive'
      });
      return;
    }

    html2canvas(element, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Quyet_toan_${invoiceNumber}.pdf`);

      toast({
        title: 'Thành công',
        description: 'Đã xuất file PDF thành công.',
      });
    });
  };

  // Format date as DD/MM/YYYY
  const formatLocalDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className={`${isPrintMode ? '' : 'p-4 mb-4'}`}>
      {!isPrintMode && (
        <div className="mb-4 flex justify-end">
          <button 
            onClick={printToPdf}
            className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            Xuất PDF
          </button>
        </div>
      )}

      <div 
        id="quyetToanPrint" 
        className={`bg-white ${isPrintMode ? 'p-0' : 'p-6 border border-gray-200 rounded-md shadow-sm'}`}
        style={{ maxWidth: '210mm', margin: '0 auto' }}
      >
        {/* Header with logo and garage info */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            {logo && (
              <img src={logo} alt={garageName} className="h-16 mr-4" />
            )}
            <div>
              <h1 className="text-xl font-bold text-blue-800 uppercase">{garageName}</h1>
              <p className="text-sm">Địa chỉ: {garageAddress}</p>
              <p className="text-sm">Điện thoại: {garagePhone} - MST: {garageTaxCode}</p>
              <p className="text-sm">Email: {garageEmail}</p>
            </div>
          </div>
        </div>

        {/* Document title */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold uppercase">QUYẾT TOÁN DỊCH VỤ</h2>
          <p className="text-sm">Ngày {formatLocalDate(invoiceDate)}</p>
        </div>

        {/* Customer and Vehicle Info */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-1 font-semibold w-24 bg-gray-100">Khách hàng:</td>
                <td className="border border-gray-300 p-1">{customerName}</td>
                <td className="border border-gray-300 p-1 font-semibold w-24 bg-gray-100">Mã Phiếu:</td>
                <td className="border border-gray-300 p-1 w-32">{invoiceNumber}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Địa chỉ:</td>
                <td className="border border-gray-300 p-1">{customerAddress || ''}</td>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Ngày:</td>
                <td className="border border-gray-300 p-1">{formatLocalDate(invoiceDate)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Biển số:</td>
                <td className="border border-gray-300 p-1">{vehicleLicensePlate}</td>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Hãng xe:</td>
                <td className="border border-gray-300 p-1">{vehicleBrand || ''}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Loại xe:</td>
                <td className="border border-gray-300 p-1">{vehicleModel || ''}</td>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Số KM:</td>
                <td className="border border-gray-300 p-1">{odometerReading?.toLocaleString() || ''}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Thợ sửa chữa:</td>
                <td className="border border-gray-300 p-1">{repairTechnician || ''}</td>
                <td className="border border-gray-300 p-1 font-semibold bg-gray-100">Số điện thoại:</td>
                <td className="border border-gray-300 p-1">{customerPhone || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Main content - line items */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Khách hàng yêu cầu:</h3>
          
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-1 text-center w-12">STT</th>
                <th className="border border-gray-300 p-1">Tên dịch vụ & vật tư</th>
                <th className="border border-gray-300 p-1 text-center w-14">ĐVT</th>
                <th className="border border-gray-300 p-1 text-center w-14">SL</th>
                <th className="border border-gray-300 p-1 text-center w-24">Đơn giá</th>
                <th className="border border-gray-300 p-1 text-center w-24">Thành tiền</th>
                <th className="border border-gray-300 p-1 text-center w-20">Chiết khấu</th>
                <th className="border border-gray-300 p-1 text-center w-24">Thành toán</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td className="border border-gray-300 p-1 text-center">{item.stt || index + 1}</td>
                  <td className="border border-gray-300 p-1">{item.description}</td>
                  <td className="border border-gray-300 p-1 text-center">{item.unit}</td>
                  <td className="border border-gray-300 p-1 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-1 text-right">{item.unitPrice.toLocaleString()}</td>
                  <td className="border border-gray-300 p-1 text-right">{item.amount.toLocaleString()}</td>
                  <td className="border border-gray-300 p-1 text-right">{(item.discount || 0).toLocaleString()}</td>
                  <td className="border border-gray-300 p-1 text-right">{item.total.toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="border border-gray-300 p-1 text-right font-semibold">Cộng:</td>
                <td className="border border-gray-300 p-1 text-right font-semibold">{subtotal.toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-right font-semibold">
                  {(discount || 0).toLocaleString()}
                </td>
                <td className="border border-gray-300 p-1 text-right font-semibold">{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary and totals */}
        <div className="mb-4 flex justify-end">
          <table className="w-72 text-sm">
            <tbody>
              <tr>
                <td className="p-1 font-semibold">Cộng tổn tiền hàng:</td>
                <td className="p-1 text-right">{subtotal.toLocaleString()}</td>
              </tr>
              {tax !== undefined && tax > 0 && (
                <tr>
                  <td className="p-1 font-semibold">Chiết khấu:</td>
                  <td className="p-1 text-right">{tax.toLocaleString()}</td>
                </tr>
              )}
              <tr>
                <td className="p-1 font-semibold">Phải thanh toán:</td>
                <td className="p-1 text-right font-bold">{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in words */}
        <div className="mb-4 text-sm">
          <p>
            <span className="font-semibold">Bằng chữ (VNĐ): </span>
            <span className="italic">{/* Tiến đã convert từ số sang chữ */}</span>
          </p>
        </div>

        {/* Notes and signature */}
        <div className="mb-2 text-sm italic">
          <p>- Giá trên chưa bao gồm VAT. Nếu cần hoá đơn GTGT xin vui lòng thông báo trước</p>
          {notes && <p>- {notes}</p>}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 text-center text-sm mt-8">
          <div>
            <p className="font-semibold mb-16">Người lập phiếu</p>
            <p className="italic">(Ký và ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-semibold mb-16">Khách hàng</p>
            <p className="italic">(Ký và ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
