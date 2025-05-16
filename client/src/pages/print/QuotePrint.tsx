import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Customer,
  Quotation,
  QuotationItem,
  Vehicle
} from '@/lib/types';
import QuotationTemplate from '@/components/print/QuotationTemplate';
import PrintButton from '@/components/print/PrintButton';

export default function QuotePrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quotation | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const quoteId = parseInt(id || '0');
    if (isNaN(quoteId) || quoteId === 0) {
      toast({
        title: 'Lỗi',
        description: 'ID báo giá không hợp lệ',
        variant: 'destructive',
      });
      navigate('/quotes');
      return;
    }

    const fetchQuoteData = async () => {
      setIsLoading(true);
      try {
        // Fetch quote
        const quoteData = await db.quotations.get(quoteId);
        if (!quoteData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy báo giá',
            variant: 'destructive',
          });
          navigate('/quotes');
          return;
        }
        setQuote(quoteData);
        
        // Fetch customer
        const customerData = await db.customers.get(quoteData.customerId);
        setCustomer(customerData ?? null);
        
        // Fetch vehicle
        const vehicleData = await db.vehicles.get(quoteData.vehicleId);
        setVehicle(vehicleData ?? null);
        
        // Fetch quote items
        const items = await db.quotationItems
          .where('quotationId')
          .equals(quoteData.id!)
          .toArray();
        setQuoteItems(items);
      } catch (error) {
        console.error('Error fetching quote details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu báo giá',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuoteData();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-primary mb-4"></i>
          <p>Đang tải thông tin báo giá...</p>
        </div>
      </div>
    );
  }

  if (!quote || !customer || !vehicle) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-3xl text-amber-500 mb-4"></i>
          <p>Không thể tải thông tin báo giá</p>
          <Button className="mt-4" onClick={() => navigate('/quotes')}>
            Quay lại danh sách báo giá
          </Button>
        </div>
      </div>
    );
  }

  // Prepare items for the quote template
  const printItems = quoteItems.map((item, index) => ({
    id: item.id || index,
    stt: index + 1,
    description: item.name,
    unit: item.type === 'part' ? 'Cái' : 'Dịch vụ',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.total,
    discount: 0,
    total: item.total,
  }));

  return (
    <div className="py-4">
      {/* Back button */}
      <div className="container mx-auto mb-4 flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/quotes/${quote.id}`)}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Quay lại báo giá
        </Button>

        <PrintButton 
          elementId="quotePrintTemplate" 
          fileName={`BaoGia_${quote.code}`}
          label="Xuất PDF"
        />
      </div>

      {/* Printable template */}
      <div id="quotePrintTemplate">
        <QuotationTemplate
          customerName={customer.name}
          customerAddress={customer.address}
          customerPhone={customer.phone}
          vehicleBrand={vehicle.brand}
          vehicleModel={vehicle.model}
          vehicleLicensePlate={vehicle.licensePlate}
          invoiceNumber={quote.code}
          invoiceDate={new Date(quote.dateCreated)}
          repairTechnician=""
          odometerReading={vehicle.lastOdometer}
          items={printItems}
          subtotal={quote.subtotal}
          tax={quote.tax}
          discount={0}
          total={quote.total}
          notes={quote.notes}
        />
      </div>
    </div>
  );
}
