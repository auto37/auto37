import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Customer,
  Invoice,
  RepairOrder,
  RepairOrderItem,
  Vehicle
} from '@/lib/types';
import QuyetToanTemplate from '@/components/print/QuyetToanTemplate';
import PrintButton from '@/components/print/PrintButton';

export default function InvoicePrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [repairOrder, setRepairOrder] = useState<RepairOrder | null>(null);
  const [repairItems, setRepairItems] = useState<RepairOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const invoiceId = parseInt(id || '0');
    if (isNaN(invoiceId) || invoiceId === 0) {
      toast({
        title: 'Lỗi',
        description: 'ID hóa đơn không hợp lệ',
        variant: 'destructive',
      });
      navigate('/invoices');
      return;
    }

    const fetchInvoiceData = async () => {
      setIsLoading(true);
      try {
        // Fetch invoice
        const invoiceData = await db.invoices.get(invoiceId);
        if (!invoiceData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy hóa đơn',
            variant: 'destructive',
          });
          navigate('/invoices');
          return;
        }
        setInvoice(invoiceData);
        
        // Fetch customer
        const customerData = await db.customers.get(invoiceData.customerId);
        setCustomer(customerData ?? null);
        
        // Fetch vehicle
        const vehicleData = await db.vehicles.get(invoiceData.vehicleId);
        setVehicle(vehicleData ?? null);
        
        // Fetch repair order
        const repairData = await db.repairOrders.get(invoiceData.repairOrderId);
        setRepairOrder(repairData ?? null);
        
        // Fetch repair items
        if (repairData) {
          const items = await db.repairOrderItems
            .where('repairOrderId')
            .equals(repairData.id!)
            .toArray();
          setRepairItems(items);
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu hóa đơn',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-primary mb-4"></i>
          <p>Đang tải thông tin hóa đơn...</p>
        </div>
      </div>
    );
  }

  if (!invoice || !customer || !vehicle || !repairOrder) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-3xl text-amber-500 mb-4"></i>
          <p>Không thể tải thông tin hóa đơn</p>
          <Button className="mt-4" onClick={() => navigate('/invoices')}>
            Quay lại danh sách hóa đơn
          </Button>
        </div>
      </div>
    );
  }

  // Prepare items for the invoice template
  const printItems = repairItems.map((item, index) => ({
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
          onClick={() => navigate(`/invoices/${invoice.id}`)}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Quay lại hóa đơn
        </Button>

        <PrintButton 
          elementId="invoicePrintTemplate" 
          fileName={`HoaDon_${invoice.code}`}
          label="Xuất PDF"
        />
      </div>

      {/* Printable template */}
      <div id="invoicePrintTemplate">
        <QuyetToanTemplate
          customerName={customer.name}
          customerAddress={customer.address}
          customerPhone={customer.phone}
          vehicleBrand={vehicle.brand}
          vehicleModel={vehicle.model}
          vehicleLicensePlate={vehicle.licensePlate}
          invoiceNumber={invoice.code}
          invoiceDate={new Date(invoice.dateCreated)}
          repairTechnician=""
          odometerReading={repairOrder.odometer}
          items={printItems}
          subtotal={invoice.subtotal}
          tax={invoice.tax}
          discount={invoice.discount}
          total={invoice.total}
          notes={repairOrder.technicianNotes || repairOrder.customerRequest}
        />
      </div>
    </div>
  );
}
