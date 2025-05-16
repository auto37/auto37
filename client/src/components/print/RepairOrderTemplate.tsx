import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { settingsDb } from "@/lib/settings";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface RepairOrderItemType {
  id: number;
  stt: number;
  description: string;
  unit: string;
  quantity: number;
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
  items: RepairOrderItemType[];
  notes?: string;
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
  notes,
  isPrintMode = false,
}: RepairOrderTemplateProps) {
  const { toast } = useToast();
  const [logo, setLogo] = useState<string>("");
  const [garageName, setGarageName] = useState<string>("AUTO37 GARAGE");
  const [garageAddress, setGarageAddress] = useState<string>(
    "Số 74 Trần Phú, P.Mộ Lao, TP.Hà Đông, HN",
  );
  const [garagePhone, setGaragePhone] = useState<string>("0987654321");
  const [garageEmail, setGarageEmail] = useState<string>("auto37@gmail.com");
  const [garageTaxCode, setGarageTaxCode] = useState<string>("0123456789");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    console.log("RepairOrderTemplate: Fetching settings");
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
        console.error("Error fetching settings:", error);
      }
    };

    fetchSettings();
  }, []);

  const printToPdf = () => {
    console.log("RepairOrderTemplate: Exporting PDF");
    setIsGeneratingPdf(true);
    const element = document.getElementById("repairOrderPrint");
    if (!element) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo file PDF. Vui lòng thử lại.",
        variant: "destructive",
      });
      setIsGeneratingPdf(false);
      return;
    }

    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, pageHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, pageHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Lenh_sua_chua_${invoiceNumber}.pdf`);
      toast({
        title: "Thành công",
        description: "Đã xuất file PDF thành công.",
      });
      setIsGeneratingPdf(false);
    });
  };

  const formatLocalDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const services = items.filter((item) => item.unit === "Dịch vụ");
  const materials = items.filter((item) => item.unit !== "Dịch vụ");

  return (
    <div
      className={`${isPrintMode || isGeneratingPdf ? "p-0" : "p-4 bg-gray-100 min-h-screen"}`}
    >
      {!(isPrintMode || isGeneratingPdf) && (
        <div className="mb-6 flex justify-end max-w-4xl mx-auto print-hidden">
        
        </div>
      )}

      <div
        id="repairOrderPrint"
        className={`bg-white font-['Roboto',sans-serif] ${
          isPrintMode || isGeneratingPdf
            ? "p-0"
            : "p-8 border border-gray-200 rounded-lg shadow-lg"
        }`}
        style={{ maxWidth: "210mm", margin: "0 auto", fontSize: "12px" }}
      >
        <div className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-start">
          <div className="flex items-center space-x-4">
            {logo && (
              <img
                src={logo}
                alt={garageName}
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-blue-800 uppercase">
                {garageName}
              </h1>
              <p className="text-gray-600">Địa chỉ: {garageAddress}</p>
              <p className="text-gray-600">
                Điện thoại: {garagePhone} | MST: {garageTaxCode}
              </p>
              <p className="text-gray-600">Email: {garageEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-blue-600">
              LỆNH SỬA CHỮA
            </h2>
            <p className="text-gray-600">Số: {invoiceNumber}</p>
            <p className="text-gray-600">
              Ngày: {formatLocalDate(invoiceDate)}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-200 text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold w-28 bg-gray-50">
                  Khách hàng:
                </td>
                <td className="border border-gray-200 p-2">{customerName}</td>
                <td className="border border-gray-200 p-2 font-semibold w-28 bg-gray-50">
                  Mã phiếu:
                </td>
                <td className="border border-gray-200 p-2 w-36">
                  {invoiceNumber}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Địa chỉ:
                </td>
                <td className="border border-gray-200 p-2">
                  {customerAddress || "-"}
                </td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Ngày:
                </td>
                <td className="border border-gray-200 p-2">
                  {formatLocalDate(invoiceDate)}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Biển số:
                </td>
                <td className="border border-gray-200 p-2">
                  {vehicleLicensePlate}
                </td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Hãng xe:
                </td>
                <td className="border border-gray-200 p-2">
                  {vehicleBrand || "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Loại xe:
                </td>
                <td className="border border-gray-200 p-2">
                  {vehicleModel || "-"}
                </td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Số KM:
                </td>
                <td className="border border-gray-200 p-2">
                  {odometerReading?.toLocaleString() || "-"}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Thợ sửa chữa:
                </td>
                <td className="border border-gray-200 p-2">
                  {repairTechnician || "-"}
                </td>
                <td className="border border-gray-200 p-2 font-semibold bg-gray-50">
                  Số điện thoại:
                </td>
                <td className="border border-gray-200 p-2">
                  {customerPhone || "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {services.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Chi tiết dịch vụ
            </h3>
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-200 p-2 text-center w-12">
                    STT
                  </th>
                  <th className="border border-gray-200 p-2 text-left">
                    Tên dịch vụ
                  </th>
                  <th className="border border-gray-200 p-2 text-center w-16">
                    ĐVT
                  </th>
                  <th className="border border-gray-200 p-2 text-center w-16">
                    SL
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="border border-gray-200 p-2 text-center">
                      {item.stt || index + 1}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {item.description}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {item.unit}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {materials.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Chi tiết vật tư
            </h3>
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-200 p-2 text-center w-12">
                    STT
                  </th>
                  <th className="border border-gray-200 p-2 text-left">
                    Tên vật tư
                  </th>
                  <th className="border border-gray-200 p-2 text-center w-16">
                    ĐVT
                  </th>
                  <th className="border border-gray-200 p-2 text-center w-16">
                    SL
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="border border-gray-200 p-2 text-center">
                      {item.stt || index + 1}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {item.description}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {item.unit}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {notes && (
          <div className="mb-6 text-sm italic text-gray-600">
            <p>Ghi chú: {notes}</p>
          </div>
        )}

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

        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          <p>Cảm ơn quý khách đã sử dụng dịch vụ của {garageName}!</p>
          <p>
            Liên hệ: {garagePhone} | {garageEmail}
          </p>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: "Roboto", sans-serif;
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
          #repairOrderPrint {
            width: 100%;
            max-width: none;
          }
        }
        @font-face {
          font-family: "Roboto";
          src: url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap");
        }
      `}</style>
    </div>
  );
}
