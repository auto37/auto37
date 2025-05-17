import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { settingsDb } from '@/lib/settings';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Import jspdf-autotable for table rendering

// ... (Keep your existing interfaces and numberToVietnameseText function unchanged)

// Add this to your imports at the top
import autoTable from 'jspdf-autotable';

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
      autoTable(pdf, {
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

        autoTable(pdf, {
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

        autoTable(pdf, {
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

      autoTable(pdf, {
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

  // ... (Keep the rest of your component JSX unchanged, as it remains the same for display purposes)
}