import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb, Settings } from '@/lib/settings';
import PDFDownloadButton from '@/components/ui/PDFDownloadButton';
import { formatCurrency } from '@/lib/utils';

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
  customerRequest?: string;
  technicianNotes?: string;
  isPrintMode?: boolean;
}

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
  tax = 0,
  discount = 0,
  total,
  notes,
  customerRequest,
  technicianNotes,
  isPrintMode = false,
}: RepairOrderTemplateProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    garageName: 'Auto37 Manager',
    garageAddress: '',
    garagePhone: '',
    garageEmail: '',
    garageTaxCode: '',
    logoUrl: '',
    iconColor: '#f97316',
    bankName: '',
    bankAccount: '',
    bankOwner: '',
    bankBranch: '',
    updatedAt: new Date(),
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const fetchedSettings = await settingsDb.getSettings();
        setSettings(fetchedSettings);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // Transform items for PDF
  const pdfItems = items.map(item => ({
    name: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
  }));

  // Create customer and vehicle objects
  const customer = {
    name: customerName,
    phone: customerPhone,
    address: customerAddress,
  };

  const vehicle = {
    licensePlate: vehicleLicensePlate,
    brand: vehicleBrand,
    model: vehicleModel,
    year: undefined,
  };

  const formatLocalDate = (date: Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const combinedNotes = [
    customerRequest && `Yêu cầu khách hàng: ${customerRequest}`,
    technicianNotes && `Ghi chú kỹ thuật: ${technicianNotes}`,
    notes && `Ghi chú khác: ${notes}`
  ].filter(Boolean).join('\n');

  if (isPrintMode) {
    return (
      <div id="repair-order-print" className="bg-white p-8 max-w-4xl mx-auto font-sans text-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
          )}
          <div className="flex-1 ml-4">
            <h1 className="text-xl font-bold">{settings.garageName}</h1>
            <p className="text-sm">
              {settings.garageAddress && `Địa chỉ: ${settings.garageAddress}`}<br />
              {settings.garagePhone && `ĐT: ${settings.garagePhone}`}
              {settings.garageEmail && ` - Email: ${settings.garageEmail}`}<br />
              {settings.garageTaxCode && `Mã số thuế: ${settings.garageTaxCode}`}
            </p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-6">LỆNH SỬA CHỮA</h2>

        {/* Document Info */}
        <div className="mb-6">
          <p><strong>Số:</strong> {invoiceNumber}</p>
          <p><strong>Ngày:</strong> {formatLocalDate(invoiceDate)}</p>
        </div>

        {/* Customer & Vehicle Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-bold mb-2">THÔNG TIN KHÁCH HÀNG:</h3>
            <p>Họ tên: {customerName}</p>
            <p>Điện thoại: {customerPhone || 'N/A'}</p>
            {customerAddress && <p>Địa chỉ: {customerAddress}</p>}
          </div>
          <div>
            <h3 className="font-bold mb-2">THÔNG TIN XE:</h3>
            <p>Biển số: {vehicleLicensePlate}</p>
            <p>Hãng xe: {vehicleBrand || 'N/A'}</p>
            <p>Dòng xe: {vehicleModel || 'N/A'}</p>
            {odometerReading && <p>Số KM: {odometerReading.toLocaleString()}</p>}
            {repairTechnician && <p>Thợ sửa chữa: {repairTechnician}</p>}
          </div>
        </div>

        {/* Customer Request */}
        {customerRequest && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200">
            <h4 className="font-bold mb-2">YÊU CẦU KHÁCH HÀNG:</h4>
            <p>{customerRequest}</p>
          </div>
        )}

        {/* Items Table */}
        <table className="w-full border-collapse border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">STT</th>
              <th className="border border-gray-300 p-2 text-left">Mô tả</th>
              <th className="border border-gray-300 p-2 text-left">ĐVT</th>
              <th className="border border-gray-300 p-2 text-left">SL</th>
              <th className="border border-gray-300 p-2 text-left">Đơn giá</th>
              <th className="border border-gray-300 p-2 text-left">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2">{item.unit}</td>
                <td className="border border-gray-300 p-2">{item.quantity}</td>
                <td className="border border-gray-300 p-2">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 p-2">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-1/3">
            <div className="flex justify-between mb-2">
              <span>Tạm tính:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between mb-2">
                <span>Thuế VAT:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Tổng cộng:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Technician Notes */}
        {technicianNotes && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200">
            <h4 className="font-bold mb-2">GHI CHÚ KỸ THUẬT:</h4>
            <p>{technicianNotes}</p>
          </div>
        )}

        {/* Other Notes */}
        {notes && (
          <div className="mb-6 p-4 bg-gray-50 border">
            <h4 className="font-bold mb-2">Ghi chú khác:</h4>
            <p>{notes}</p>
          </div>
        )}

        {/* Bank Info */}
        {settings.bankName && settings.bankAccount && (
          <div className="mb-6 p-4 bg-gray-50 border">
            <h4 className="font-bold mb-2">THÔNG TIN THANH TOÁN:</h4>
            <p>Ngân hàng: {settings.bankName}</p>
            <p>Số TK: {settings.bankAccount}</p>
            {settings.bankOwner && <p>Chủ TK: {settings.bankOwner}</p>}
            {settings.bankBranch && <p>Chi nhánh: {settings.bankBranch}</p>}
          </div>
        )}

        {/* Signatures */}
        <div className="flex justify-between mt-12">
          <div className="text-center w-1/3">
            <p className="font-bold mb-16">KHÁCH HÀNG</p>
            <p className="border-t border-black pt-2">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="text-center w-1/3">
            <p className="font-bold mb-16">KỸ THUẬT VIÊN</p>
            <p className="border-t border-black pt-2">(Ký và ghi rõ họ tên)</p>
          </div>
        </div>

        <p className="text-center mt-8 text-gray-600">Cảm ơn quý khách hàng!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <i className="fas fa-print mr-2"></i>
          In tài liệu
        </button>
        
        <PDFDownloadButton
          title="LỆNH SỬA CHỮA"
          code={invoiceNumber}
          date={invoiceDate}
          customer={customer}
          vehicle={vehicle}
          items={pdfItems}
          subtotal={subtotal}
          tax={tax}
          total={total}
          settings={settings}
          notes={combinedNotes}
          type="repair"
          fileName={`Lenh_sua_chua_${invoiceNumber}.pdf`}
        >
          <i className="fas fa-file-pdf mr-2"></i>
          Tải PDF
        </PDFDownloadButton>
      </div>

      {/* Print Preview */}
      <RepairOrderTemplate {...{
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
        customerRequest,
        technicianNotes,
        isPrintMode: true,
      }} />
    </div>
  );
}