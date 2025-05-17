import { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { 
  Customer, 
  Vehicle, 
  InventoryItem, 
  InventoryItemWithCategory,
  Service,
  RepairOrderItem,
  RepairOrderWithDetails
} from '@/lib/types';
import { formatCurrency, formatDate, calculateTotals } from '@/lib/utils';

const repairItemSchema = z.object({
  type: z.enum(['part', 'service']),
  itemId: z.number().int().positive(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  total: z.number().nonnegative(),
});

const repairOrderSchema = z.object({
  customerId: z.number().int().positive('Vui lòng chọn khách hàng'),
  vehicleId: z.number().int().positive('Vui lòng chọn xe'),
  quotationId: z.number().optional(),
  odometer: z.number().int().nonnegative('Số Km không được âm'),
  dateExpected: z.date().optional(),
  items: z.array(repairItemSchema).min(1, 'Lệnh sửa chữa cần có ít nhất một vật tư hoặc dịch vụ'),
  customerRequest: z.string().optional(),
  technicianNotes: z.string().optional(),
  technicianId: z.number().optional(),
  tax: z.number().nonnegative().optional(),
  status: z.enum(['new', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'cancelled']).default('new'),
});

type FormData = z.infer<typeof repairOrderSchema>;
type RepairItemForm = z.infer<typeof repairItemSchema>;

export default function RepairForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [repairMatch] = useRoute('/repairs/:id/edit');
  const [quoteMatch] = useRoute('/repairs/from-quote/:quoteId');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFromQuote, setIsFromQuote] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Data for selects
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemWithCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Items in the repair order
  const [repairItems, setRepairItems] = useState<RepairItemForm[]>([]);
  const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });

  // For adding new items
  const [selectedItemType, setSelectedItemType] = useState<'part' | 'service'>('part');
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid }, trigger } = useForm<FormData>({
    resolver: zodResolver(repairOrderSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      odometer: 0,
      items: [],
      customerRequest: '',
      technicianNotes: '',
      tax: 0,
      status: 'new',
      dateExpected: undefined
    }
  });

  // Watch for changes to update dependent fields
  const watchCustomerId = watch('customerId');
  const watchTax = watch('tax');

  // Log form errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Lỗi xác thực form lệnh sửa chữa:', errors);
    }
  }, [errors]);

  // Initialize form and load data
  useEffect(() => {
    const loadFormData = async () => {
      setIsLoading(true);
      try {
        // Load customers
        const allCustomers = await db.customers.toArray();
        setCustomers(allCustomers);

        // Load inventory items with categories
        const allItems = await db.inventoryItems.toArray();
        const itemsWithCategory = await Promise.all(
          allItems.map(async (item) => {
            const category = await db.inventoryCategories.get(item.categoryId);
            return { ...item, category };
          })
        );
        setInventoryItems(itemsWithCategory);

        // Load services
        const allServices = await db.services.toArray();
        setServices(allServices);

        // Check if editing an existing repair order
        if (repairMatch && params.id) {
          setIsEditing(true);
          await fetchRepairOrderData(parseInt(params.id));
        } 
        // Check if creating from a quote
        else if (quoteMatch && params.quoteId) {
          setIsFromQuote(true);
          await loadDataFromQuote(parseInt(params.quoteId));
        } 
        // New repair order - get URL params if any
        else {
          const urlParams = new URLSearchParams(window.location.search);
          const customerId = urlParams.get('customerId');
          const vehicleId = urlParams.get('vehicleId');

          if (customerId && !isNaN(parseInt(customerId))) {
            const customerIdNum = parseInt(customerId);
            setValue('customerId', customerIdNum, { shouldValidate: true });

            // Load vehicles for this customer
            const customerVehicles = await db.vehicles
              .where('customerId')
              .equals(customerIdNum)
              .toArray();
            setVehicles(customerVehicles);
            setFilteredVehicles(customerVehicles);

            // If vehicleId is provided, set it
            if (vehicleId && !isNaN(parseInt(vehicleId))) {
              const vehicleIdNum = parseInt(vehicleId);
              setValue('vehicleId', vehicleIdNum, { shouldValidate: true });

              // Get vehicle latest odometer
              const vehicle = await db.vehicles.get(vehicleIdNum);
              if (vehicle) {
                setValue('odometer', vehicle.lastOdometer, { shouldValidate: true });
              }
            }
          }

          await generateRepairOrderCode();
          await trigger();
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFormData();
  }, [repairMatch, quoteMatch, params.id, params.quoteId, setValue, toast, trigger]);

  // When customer changes, filter vehicles
  useEffect(() => {
    const loadVehiclesForCustomer = async () => {
      if (watchCustomerId && !isNaN(watchCustomerId)) {
        try {
          const customerVehicles = await db.vehicles
            .where('customerId')
            .equals(watchCustomerId)
            .toArray();
          setVehicles(customerVehicles);
          setFilteredVehicles(customerVehicles);

          // Clear vehicle selection if current selection is not valid for new customer
          const currentVehicleId = watch('vehicleId');
          if (currentVehicleId && !customerVehicles.some(v => v.id === currentVehicleId)) {
            setValue('vehicleId', 0, { shouldValidate: true });
            setValue('odometer', 0, { shouldValidate: true });
          }
        } catch (error) {
          console.error('Error loading vehicles for customer:', error);
        }
      } else {
        setVehicles([]);
        setFilteredVehicles([]);
        setValue('vehicleId', 0, { shouldValidate: true });
        setValue('odometer', 0, { shouldValidate: true });
      }
    };

    loadVehiclesForCustomer();
  }, [watchCustomerId, setValue, watch]);

  // Update totals when items or tax changes
  useEffect(() => {
    const { subtotal, tax, total } = calculateTotals(repairItems);
    const taxAmount = watchTax !== undefined ? subtotal * (watchTax / 100) : 0;
    const totalWithTax = subtotal + taxAmount;

    setTotals({
      subtotal,
      tax: taxAmount,
      total: totalWithTax
    });

    setValue('items', repairItems, { shouldValidate: true });
    trigger();
  }, [repairItems, watchTax, setValue, trigger]);

  const fetchRepairOrderData = async (id: number) => {
    try {
      const repair = await db.repairOrders.get(id);
      if (!repair) {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy lệnh sửa chữa.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Validate vehicleId
      const vehicleId = Number(repair.vehicleId);
      if (isNaN(vehicleId) || vehicleId <= 0) {
        console.error('vehicleId không hợp lệ:', repair.vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Dữ liệu xe không hợp lệ trong lệnh sửa chữa.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Set form values
      setValue('customerId', repair.customerId, { shouldValidate: true });
      setValue('vehicleId', vehicleId, { shouldValidate: true });
      setValue('quotationId', repair.quotationId, { shouldValidate: true });
      setValue('odometer', repair.odometer, { shouldValidate: true });
      setValue('customerRequest', repair.customerRequest || '', { shouldValidate: true });
      setValue('technicianNotes', repair.technicianNotes || '', { shouldValidate: true });
      setValue('status', repair.status, { shouldValidate: true });
      setValue('tax', repair.tax ? (repair.tax / repair.subtotal) * 100 : 0, { shouldValidate: true });

      if (repair.dateExpected) {
        setValue('dateExpected', new Date(repair.dateExpected), { shouldValidate: true });
      }

      // Load vehicles for this customer
      const customerVehicles = await db.vehicles
        .where('customerId')
        .equals(repair.customerId)
        .toArray();
      setVehicles(customerVehicles);
      setFilteredVehicles(customerVehicles);

      // Validate vehicleId exists in customer vehicles
      if (!customerVehicles.some(v => v.id === vehicleId)) {
        console.error('vehicleId không tồn tại trong danh sách xe:', vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Xe không thuộc khách hàng này.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Load repair items
      const items = await db.repairOrderItems
        .where('repairOrderId')
        .equals(id)
        .toArray();

      const formItems = items.map(item => ({
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));

      setRepairItems(formItems);
      setValue('items', formItems, { shouldValidate: true });

      await trigger();
    } catch (error) {
      console.error('Error fetching repair order data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin lệnh sửa chữa. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const loadDataFromQuote = async (quoteId: number) => {
    try {
      const quote = await db.quotations.get(quoteId);
      if (!quote) {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy báo giá.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Validate quote status
      if (quote.status !== 'accepted') {
        toast({
          title: 'Lỗi',
          description: 'Báo giá chưa được khách hàng đồng ý.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Validate vehicleId
      const vehicleId = Number(quote.vehicleId);
      if (isNaN(vehicleId) || vehicleId <= 0) {
        console.error('vehicleId không hợp lệ trong báo giá:', quote.vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Dữ liệu xe không hợp lệ trong báo giá.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Set form values from quote
      setValue('customerId', quote.customerId, { shouldValidate: true });
      setValue('vehicleId', vehicleId, { shouldValidate: true });
      setValue('quotationId', quoteId, { shouldValidate: true });
      setValue('tax', quote.tax ? (quote.tax / quote.subtotal) * 100 : 0, { shouldValidate: true });

      // Load vehicles for this customer
      const customerVehicles = await db.vehicles
        .where('customerId')
        .equals(quote.customerId)
        .toArray();
      setVehicles(customerVehicles);
      setFilteredVehicles(customerVehicles);

      // Validate vehicleId exists in customer vehicles
      if (!customerVehicles.some(v => v.id === vehicleId)) {
        console.error('vehicleId không tồn tại trong danh sách xe:', vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Xe không thuộc khách hàng này.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Set odometer from vehicle
      const vehicle = await db.vehicles.get(vehicleId);
      if (vehicle) {
        setValue('odometer', vehicle.lastOdometer, { shouldValidate: true });
      } else {
        console.error('Không tìm thấy xe với ID:', vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy thông tin xe.',
          variant: 'destructive'
        });
        setLocation('/repairs');
        return;
      }

      // Load quote items
      const quoteItems = await db.quotationItems
        .where('quotationId')
        .equals(quoteId)
        .toArray();

      const formItems = quoteItems.map(item => ({
        type: item.type,
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      }));

      setRepairItems(formItems);
      setValue('items', formItems, { shouldValidate: true });

      await trigger();
    } catch (error) {
      console.error('Error loading data from quote:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin từ báo giá. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const generateRepairOrderCode = async () => {
    try {
      const code = await db.generateRepairOrderCode();
    } catch (error) {
      console.error('Error generating repair order code:', error);
    }
  };

  const handleAddItem = () => {
    if (!selectedItemId) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn vật tư hoặc dịch vụ.',
        variant: 'destructive'
      });
      return;
    }

    if (selectedQuantity <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Số lượng phải lớn hơn 0.',
        variant: 'destructive'
      });
      return;
    }

    const existingItemIndex = repairItems.findIndex(
      item => item.type === selectedItemType && item.itemId === selectedItemId
    );

    if (existingItemIndex !== -1) {
      const updatedItems = [...repairItems];
      const item = updatedItems[existingItemIndex];
      const newQuantity = item.quantity + selectedQuantity;
      updatedItems[existingItemIndex] = {
        ...item,
        quantity: newQuantity,
        total: item.unitPrice * newQuantity
      };
      setRepairItems(updatedItems);
    } else {
      let name = '';
      let unitPrice = 0;

      if (selectedItemType === 'part') {
        const item = inventoryItems.find(i => i.id === selectedItemId);
        if (!item) return;
        name = item.name;
        unitPrice = item.sellingPrice;

        if (item.quantity < selectedQuantity) {
          toast({
            title: 'Cảnh báo',
            description: `Chỉ còn ${item.quantity} ${item.unit} trong kho.`,
          });
        }
      } else {
        const service = services.find(s => s.id === selectedItemId);
        if (!service) return;
        name = service.name;
        unitPrice = service.price;
      }

      const newItem: RepairItemForm = {
        type: selectedItemType,
        itemId: selectedItemId,
        name,
        quantity: selectedQuantity,
        unitPrice,
        total: unitPrice * selectedQuantity
      };

      setRepairItems([...repairItems, newItem]);
    }

    setSelectedItemId(0);
    setSelectedQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...repairItems];
    updatedItems.splice(index, 1);
    setRepairItems(updatedItems);
  };

  const handleUpdateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;

    const updatedItems = [...repairItems];
    const item = updatedItems[index];

    if (item.type === 'part') {
      const inventoryItem = inventoryItems.find(i => i.id === item.itemId);
      if (inventoryItem && inventoryItem.quantity < newQuantity) {
        toast({
          title: 'Cảnh báo',
          description: `Chỉ còn ${inventoryItem.quantity} ${inventoryItem.unit} trong kho.`,
        });
      }
    }

    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      total: item.unitPrice * newQuantity
    };

    setRepairItems(updatedItems);
  };

  const onSubmit = async (data: FormData) => {
    if (data.items.length === 0) {
      toast({
        title: 'Lỗi',
        description: 'Lệnh sửa chữa cần có ít nhất một vật tư hoặc dịch vụ.',
        variant: 'destructive'
      });
      return;
    }

    if (isNaN(data.vehicleId) || data.vehicleId <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn xe hợp lệ.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const taxRate = data.tax || 0;
      const taxAmount = totals.subtotal * (taxRate / 100);

      if (data.status === 'completed' && isEditing) {
        const currentRepair = await db.repairOrders.get(parseInt(params.id!));
        if (currentRepair && currentRepair.status !== 'completed') {
          const partItems = data.items.filter(item => item.type === 'part');
          let insufficientItems: {name: string, available: number, required: number}[] = [];

          for (const item of partItems) {
            const inventoryItem = await db.inventoryItems.get(item.itemId);
            if (inventoryItem && inventoryItem.quantity < item.quantity) {
              insufficientItems.push({
                name: item.name,
                available: inventoryItem.quantity,
                required: item.quantity
              });
            }
          }

          if (insufficientItems.length > 0) {
            const message = insufficientItems.map(item => 
              `${item.name}: Cần ${item.required}, Tồn kho ${item.available}`
            ).join('\n');

            if (!window.confirm(`Kho không đủ vật tư sau:\n\n${message}\n\nVẫn tiếp tục hoàn thành?`)) {
              setIsLoading(false);
              return;
            }
          }
        }
      }

      if (isEditing && params.id) {
        const repairId = parseInt(params.id);

        await db.repairOrders.update(repairId, {
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          quotationId: data.quotationId,
          odometer: data.odometer,
          dateExpected: data.dateExpected,
          customerRequest: data.customerRequest,
          technicianNotes: data.technicianNotes,
          technicianId: data.technicianId,
          subtotal: totals.subtotal,
          tax: taxAmount,
          total: totals.subtotal + taxAmount,
          status: data.status
        });

        await db.repairOrderItems
          .where('repairOrderId')
          .equals(repairId)
          .delete();

        for (const item of data.items) {
          await db.repairOrderItems.add({
            repairOrderId: repairId,
            type: item.type,
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          });
        }

        const vehicle = await db.vehicles.get(data.vehicleId);
        if (vehicle && data.odometer > vehicle.lastOdometer) {
          await db.vehicles.update(data.vehicleId, {
            lastOdometer: data.odometer
          });
        }

        if (data.status === 'completed') {
          const currentRepair = await db.repairOrders.get(repairId);
          if (currentRepair && currentRepair.status !== 'completed') {
            await db.updateInventoryQuantities(repairId);
          }
        }

        toast({
          title: 'Thành công',
          description: 'Đã cập nhật lệnh sửa chữa.',
        });
      } else {
        const repairCode = await db.generateRepairOrderCode();

        const repairId = await db.repairOrders.add({
          code: repairCode,
          dateCreated: new Date(),
          dateExpected: data.dateExpected,
          quotationId: data.quotationId,
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          odometer: data.odometer,
          customerRequest: data.customerRequest,
          technicianNotes: data.technicianNotes,
          technicianId: data.technicianId,
          subtotal: totals.subtotal,
          tax: taxAmount,
          total: totals.subtotal + taxAmount,
          status: data.status
        });

        for (const item of data.items) {
          await db.repairOrderItems.add({
            repairOrderId: repairId,
            type: item.type,
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          });
        }

        const vehicle = await db.vehicles.get(data.vehicleId);
        if (vehicle && data.odometer > vehicle.lastOdometer) {
          await db.vehicles.update(data.vehicleId, {
            lastOdometer: data.odometer
          });
        }

        if (isFromQuote && data.quotationId) {
          await db.quotations.update(data.quotationId, {
            status: 'accepted'
          });
        }

        if (data.status === 'completed') {
          await db.updateInventoryQuantities(repairId);
        }

        toast({
          title: 'Thành công',
          description: 'Đã tạo lệnh sửa chữa mới.',
        });
      }

      setLocation('/repairs');
    } catch (error) {
      console.error('Error saving repair order:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu lệnh sửa chữa. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setValue('dateExpected', new Date(dateValue), { shouldValidate: true });
    } else {
      setValue('dateExpected', undefined, { shouldValidate: true });
    }
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>
            {isEditing 
              ? 'Chỉnh Sửa Lệnh Sửa Chữa' 
              : isFromQuote 
                ? 'Tạo Lệnh Sửa Chữa Từ Báo Giá' 
                : 'Tạo Lệnh Sửa Chữa Mới'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="info">Thông Tin Chung</TabsTrigger>
                <TabsTrigger value="items">Vật Tư & Dịch Vụ</TabsTrigger>
                <TabsTrigger value="notes">Ghi Chú & Hướng Dẫn</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Khách Hàng*</Label>
                    <Select
                      value={watch('customerId')?.toString() || '0'}
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          setValue('customerId', numValue, { shouldValidate: true });
                        }
                      }}
                      disabled={isEditing || isFromQuote}
                    >
                      <SelectTrigger id="customerId">
                        <SelectValue placeholder="Chọn khách hàng" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.length === 0 ? (
                          <SelectItem value="0" disabled>Không có khách hàng nào</SelectItem>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem 
                              key={customer.id} 
                              value={customer.id?.toString() || '0'}
                            >
                              {customer.name} - {customer.phone}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.customerId && (
                      <p className="text-sm text-red-500">{errors.customerId.message}</p>
                    )}
                    {customers.length === 0 && (
                      <p className="text-sm text-yellow-500">
                        <Link href="/customers/new" className="underline">
                          Thêm khách hàng mới
                        </Link> trước khi tạo lệnh sửa chữa.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleId">Xe*</Label>
                    <Select
                      value={watch('vehicleId')?.toString() || '0'}
                      onValueChange={(value) => {
                        const vehicleId = parseInt(value);
                        if (!isNaN(vehicleId)) {
                          setValue('vehicleId', vehicleId, { shouldValidate: true });
                          const vehicle = vehicles.find(v => v.id === vehicleId);
                          if (vehicle) {
                            setValue('odometer', vehicle.lastOdometer, { shouldValidate: true });
                          }
                        }
                      }}
                      disabled={isEditing || isFromQuote || !watchCustomerId}
                    >
                      <SelectTrigger id="vehicleId">
                        <SelectValue placeholder="Chọn xe" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredVehicles.length === 0 ? (
                          <SelectItem value="0" disabled>
                            {watchCustomerId ? 'Khách hàng chưa có xe nào' : 'Vui lòng chọn khách hàng trước'}
                          </SelectItem>
                        ) : (
                          filteredVehicles.map((vehicle) => (
                            <SelectItem 
                              key={vehicle.id} 
                              value={vehicle.id?.toString() || '0'}
                            >
                              {vehicle.brand} {vehicle.model} - {vehicle.licensePlate}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.vehicleId && (
                      <p className="text-sm text-red-500">{errors.vehicleId.message}</p>
                    )}
                    {watchCustomerId && filteredVehicles.length === 0 && (
                      <p className="text-sm text-yellow-500">
                        <Link href={`/customers/${watchCustomerId}/edit`} className="underline">
                          Thêm xe mới
                        </Link> cho khách hàng này.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="odometer">Số Km Hiện Tại*</Label>
                    <Input
                      id="odometer"
                      type="number"
                      min="0"
                      {...register('odometer', { 
                        valueAsNumber: true,
                        setValueAs: (v) => v === '' ? 0 : Number(v)
                      })}
                    />
                    {errors.odometer && (
                      <p className="text-sm text-red-500">{errors.odometer.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateExpected">Ngày Hẹn Trả Xe</Label>
                    <Input
                      id="dateExpected"
                      type="date"
                      value={formatDateForInput(watch('dateExpected'))}
                      onChange={handleDateChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax">Thuế VAT (%)</Label>
                    <Input
                      id="tax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      {...register('tax', { 
                        valueAsNumber: true,
                        setValueAs: (v) => v === '' ? 0 : Number(v)
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng Thái</Label>
                    <Select
                      value={watch('status')}
                      onValueChange={(value) => setValue('status', value as any, { shouldValidate: true })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Mới Tạo</SelectItem>
                        <SelectItem value="in_progress">Đang Sửa Chữa</SelectItem>
                        <SelectItem value="waiting_parts">Chờ Phụ Tùng</SelectItem>
                        <SelectItem value="completed">Hoàn Thành</SelectItem>
                        <SelectItem value="delivered">Đã Giao Xe</SelectItem>
                        <SelectItem value="cancelled">Đã Hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Tổng Cộng</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Tạm tính:</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thuế ({watch('tax') || 0}%):</span>
                      <span>{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Tổng cộng:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="items">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Thêm Vật Tư / Dịch Vụ</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="itemType">Loại</Label>
                        <Select
                          value={selectedItemType}
                          onValueChange={(value) => {
                            setSelectedItemType(value as 'part' | 'service');
                            setSelectedItemId(0);
                          }}
                        >
                          <SelectTrigger id="itemType">
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="part">Vật Tư / Phụ Tùng</SelectItem>
                            <SelectItem value="service">Dịch Vụ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="itemId">Chọn {selectedItemType === 'part' ? 'Vật Tư' : 'Dịch Vụ'}</Label>
                        <Select
                          value={selectedItemId?.toString() || '0'}
                          onValueChange={(value) => setSelectedItemId(parseInt(value))}
                        >
                          <SelectTrigger id="itemId">
                            <SelectValue placeholder={`Chọn ${selectedItemType === 'part' ? 'vật tư' : 'dịch vụ'}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedItemType === 'part' ? (
                              inventoryItems.length === 0 ? (
                                <SelectItem value="0" disabled>Không có vật tư nào</SelectItem>
                              ) : (
                                inventoryItems.map((item) => (
                                  <SelectItem 
                                    key={item.id} 
                                    value={item.id?.toString() || '0'}
                                  >
                                    {item.name} ({formatCurrency(item.sellingPrice)})
                                    {item.quantity <= 0 && ' - Hết hàng'}
                                  </SelectItem>
                                ))
                              )
                            ) : (
                              services.length === 0 ? (
                                <SelectItem value="0" disabled>Không có dịch vụ nào</SelectItem>
                              ) : (
                                services.map((service) => (
                                  <SelectItem 
                                    key={service.id} 
                                    value={service.id?.toString() || '0'}
                                  >
                                    {service.name} ({formatCurrency(service.price)})
                                  </SelectItem>
                                ))
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="quantity">Số Lượng</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="flex items-end">
                        <Button 
                          type="button" 
                          onClick={handleAddItem}
                          disabled={!selectedItemId || selectedQuantity <= 0}
                          className="w-full"
                        >
                          <i className="fas fa-plus mr-2"></i> Thêm
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Danh Sách Vật Tư & Dịch Vụ</h3>
                    {repairItems.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Chưa có vật tư hoặc dịch vụ nào trong lệnh sửa chữa</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Loại</TableHead>
                              <TableHead>Tên</TableHead>
                              <TableHead>Đơn Giá</TableHead>
                              <TableHead className="w-24">Số Lượng</TableHead>
                              <TableHead>Thành Tiền</TableHead>
                              <TableHead className="text-right">Thao Tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {repairItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {item.type === 'part' ? 'Vật tư' : 'Dịch vụ'}
                                </TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>{formatCurrency(item.total)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Tổng Cộng</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Tạm tính:</span>
                          <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thuế ({watch('tax') || 0}%):</span>
                          <span>{formatCurrency(totals.tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Tổng cộng:</span>
                          <span>{formatCurrency(totals.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerRequest">Yêu Cầu Của Khách Hàng</Label>
                    <Textarea
                      id="customerRequest"
                      placeholder="Mô tả yêu cầu của khách hàng hoặc tình trạng xe"
                      {...register('customerRequest')}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="technicianNotes">Ghi Chú Cho Kỹ Thuật Viên</Label>
                    <Textarea
                      id="technicianNotes"
                      placeholder="Ghi chú nội bộ cho kỹ thuật viên"
                      {...register('technicianNotes')}
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Link href="/repairs">
                <Button type="button" variant="outline">Hủy</Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isLoading || !isValid}
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Đang Lưu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    {isEditing ? 'Cập Nhật' : 'Lưu'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}