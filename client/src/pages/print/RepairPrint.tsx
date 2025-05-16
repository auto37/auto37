import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import {
  Customer,
  RepairOrder,
  RepairOrderItem,
  Vehicle
} from '@/lib/types';
import RepairOrderTemplate from '@/components/print/RepairOrderTemplate';
import PrintButton from '@/components/print/PrintButton';

export default function RepairPrint() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [repair, setRepair] = useState<RepairOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [repairItems, setRepairItems] = useState<RepairOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const repairId = parseInt(id || '0');
    if (isNaN(repairId) || repairId === 0) {
      toast({
        title: 'Lỗi',
        description: 'ID lệnh sửa chữa không hợp lệ',
        variant: 'destructive',
      });
      navigate('/repairs');
      return;
    }

    const fetchRepairData = async () => {
      setIsLoading(true);
      try {
        // Fetch repair order
        const repairData = await db.repairOrders.get(repairId);
        if (!repairData) {
          toast({
            title: 'Lỗi',
            description: 'Không tìm thấy lệnh sửa chữa',
            variant: 'destructive',
          });
          navigate('/repairs');
          return;
        }
        setRepair(repairData);
        
        // Fetch customer
        const customerData = await db.customers.get(repairData.customerId);
        setCustomer(customerData ?? null);
        
        // Fetch vehicle
        const vehicleData = await db.vehicles.get(repairData.vehicleId);
        setVehicle(vehicleData ?? null);
        
        // Fetch repair items
        const items = await db.repairOrderItems
          .where('repairOrderId')
          .equals(repairData.id!)
          .toArray();
        setRepairItems(items);
      } catch (error) {
        console.error('Error fetching repair details:', error);
        toast({
          title: 'Lỗi',
          description: 'Có lỗi xảy ra khi tải dữ liệu lệnh sửa chữa',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepairData();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-primary mb-4"></i>
          <p>Đang tải thông tin lệnh sửa chữa...</p>
        </div>
      </div>
    );
  }

  if (!repair || !customer || !vehicle) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-3xl text-amber-500 mb-4"></i>
          <p>Không thể tải thông tin lệnh sửa chữa</p>
          <Button className="mt-4" onClick={() => navigate('/repairs')}>
            Quay lại danh sách lệnh sửa chữa
          </Button>
        </div>
      </div>
    );
  }

  // Prepare items for the repair order template
  const printItems = repairItems.map((item, index) => ({
    id: item.id || index,
    stt: index + 1,
    description: item.name,
    unit: item.type === 'part' ? 'Cái' : 'Dịch vụ',
    quantity: item.quantity
  }));

  return (
    <div className="py-4">
      {/* Back button */}
      <div className="container mx-auto mb-4 flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/repairs/${repair.id}`)}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Quay lại lệnh sửa chữa
        </Button>

        <PrintButton 
          elementId="repairOrderPrint" 
          fileName={`LenhSuaChua_${repair.code}`}
          label="Xuất PDF"
        />
      </div>

      {/* Printable template */}
      <div id="repairOrderPrint">
        <RepairOrderTemplate
          customerName={customer.name}
          customerAddress={customer.address}
          customerPhone={customer.phone}
          vehicleBrand={vehicle.brand}
          vehicleModel={vehicle.model}
          vehicleLicensePlate={vehicle.licensePlate}
          invoiceNumber={repair.code}
          invoiceDate={new Date(repair.dateCreated)}
          repairTechnician={repair.technicianId ? `ID: ${repair.technicianId}` : ''}
          odometerReading={repair.odometer}
          items={printItems}
          notes={repair.customerRequest}
        />
      </div>
    </div>
  );
}