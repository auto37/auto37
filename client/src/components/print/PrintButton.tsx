import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrintButtonProps {
  elementId: string;
  fileName: string;
  label?: string;
}

export default function PrintButton({ elementId, fileName, label = 'Xuất PDF' }: PrintButtonProps) {
  const { toast } = useToast();

  const handlePrint = async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo file PDF. Vui lòng thử lại.',
        variant: 'destructive'
      });
      return;
    }

    try {
      toast({
        title: 'Đang xuất PDF',
        description: 'Vui lòng đợi trong giây lát...',
      });

      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${fileName}.pdf`);

      toast({
        title: 'Thành công',
        description: 'Đã xuất file PDF thành công.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Button 
      onClick={handlePrint}
      className="bg-primary hover:bg-primary-dark text-white"
    >
      <i className="fas fa-file-pdf mr-2"></i>
      {label}
    </Button>
  );
}
