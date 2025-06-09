import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { PDFDocument } from '@/lib/pdf-generator';
import { Settings } from '@/lib/settings';

interface PDFDownloadButtonProps {
  title: string;
  code: string;
  date: Date;
  customer: any;
  vehicle: any;
  items: any[];
  subtotal: number;
  tax?: number;
  total: number;
  settings: Settings;
  notes?: string;
  type: 'quotation' | 'repair' | 'invoice';
  fileName: string;
  children: React.ReactNode;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  title,
  code,
  date,
  customer,
  vehicle,
  items,
  subtotal,
  tax = 0,
  total,
  settings,
  notes,
  type,
  fileName,
  children,
}) => {
  const document = (
    <PDFDocument
      title={title}
      code={code}
      date={date}
      customer={customer}
      vehicle={vehicle}
      items={items}
      subtotal={subtotal}
      tax={tax}
      total={total}
      settings={settings}
      notes={notes}
      type={type}
    />
  );

  return (
    <PDFDownloadLink
      document={document}
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) =>
        loading ? (
          <Button disabled>
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Đang tạo PDF...
          </Button>
        ) : (
          <Button className="bg-primary hover:bg-primary-dark text-white">
            {children}
          </Button>
        )
      }
    </PDFDownloadLink>
  );
};

export default PDFDownloadButton;