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
  QuotationItem
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

const quoteItemSchema = z.object({
  type: z.enum(['part', 'service']),
  itemId: z.number().int().positive(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  total: z.number().nonnegative(),
});

const quoteSchema = z.object({
  customerId: z.number().int().positive('Vui lòng chọn khách hàng'),
  vehicleId: z.number().int().positive('Vui lòng chọn xe'),
  items: z.array(quoteItemSchema).min(1, 'Báo giá cần có ít nhất một vật tư hoặc dịch vụ'),
  notes: z.string().optional(),
  tax: z.number().nonnegative().optional(),
  status: z.enum(['new', 'sent', 'accepted', 'rejected']).default('new'),
});

type FormData = z.infer<typeof quoteSchema>;
type QuoteItemForm = z.infer<typeof quoteItemSchema>;

export default function QuoteForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [match] = useRoute('/quotes/:id/edit');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Data for selects
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemWithCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Items in the quote
  const [quoteItems, setQuoteItems] = useState<QuoteItemForm[]>([]);
  const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });

  // For adding new items
  const [selectedItemType, setSelectedItemType] = useState<'part' | 'service'>('part');
  // selectedItemId = -1 nghĩa là đang thêm mới
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  // State dùng cho form nhập thông tin mới
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(0);

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid }, trigger } = useForm<FormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      items: [],
      notes: '',
      tax: 0,
      status: 'new'
    }
  });

  // Watch for changes to update dependent fields
  const watchCustomerId = watch('customerId');
  const watchTax = watch('tax');

  // Log form errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Lỗi xác thực form:', errors);
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

        // Check if editing
        if (match && params.id) {
          setIsEditing(true);
          await fetchQuoteData(parseInt(params.id));
        } else {
          // New quote - get URL params if any
          const urlParams = new URLSearchParams(window.location.search);
          const customerId = urlParams.get('customerId');
          const vehicleId = urlParams.get('vehicleId');

          if (customerId) {
            const customerIdNum = parseInt(customerId);
            setValue('customerId', customerIdNum, { shouldValidate: true });

            // Load vehicles for this customer
            const customerVehicles = await db.vehicles
              .where('customerId')
              .equals(customerIdNum)
              .toArray();
            setVehicles(customerVehicles);
            setFilteredVehicles(customerVehicles);

            if (vehicleId && !isNaN(parseInt(vehicleId))) {
              const vehicleIdNum = parseInt(vehicleId);
              setValue('vehicleId', vehicleIdNum, { shouldValidate: true });
            }
          }

          await generateQuoteCode();
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
  }, [match, params.id, setValue, toast, trigger]);

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
          }
        } catch (error) {
          console.error('Error loading vehicles for customer:', error);
        }
      } else {
        setVehicles([]);
        setFilteredVehicles([]);
        setValue('vehicleId', 0, { shouldValidate: true });
      }
    };

    loadVehiclesForCustomer();
  }, [watchCustomerId, setValue, watch]);

  // Update totals when items or tax changes
  useEffect(() => {
    const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = watchTax !== undefined ? subtotal * (watchTax / 100) : 0;
    const totalWithTax = subtotal + taxAmount;

    setTotals({
      subtotal,
      tax: taxAmount,
      total: totalWithTax
    });

    setValue('items', quoteItems, { shouldValidate: true });
    trigger();
  }, [quoteItems, watchTax, setValue, trigger]);

  const fetchQuoteData = async (id: number) => {
    try {
      console.log('Tải dữ liệu báo giá ID:', id);
      const quote = await db.quotations.get(id);
      if (!quote) {
        console.error('Không tìm thấy báo giá ID:', id);
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy báo giá.',
          variant: 'destructive'
        });
        setLocation('/quotes');
        return;
      }

      // Validate vehicleId
      const vehicleId = Number(quote.vehicleId);
      if (isNaN(vehicleId) || vehicleId <= 0) {
        console.error('vehicleId không hợp lệ:', quote.vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Dữ liệu xe không hợp lệ trong báo giá.',
          variant: 'destructive'
        });
        setLocation('/quotes');
        return;
      }

      // Set form values
      setValue('customerId', quote.customerId, { shouldValidate: true });
      setValue('vehicleId', vehicleId, { shouldValidate: true });
      setValue('notes', quote.notes || '', { shouldValidate: true });
      setValue('status', quote.status, { shouldValidate: true });
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
        console.error('vehicleId không tồn tại trong danh sách xe của khách hàng:', vehicleId);
        toast({
          title: 'Lỗi',
          description: 'Xe không thuộc khách hàng này.',
          variant: 'destructive'
        });
        setLocation('/quotes');
        return;
      }

      // Load quote items
      const items = await db.quotationItems
        .where('quotationId')
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

      setQuoteItems(formItems);
      setValue('items', formItems, { shouldValidate: true });

      // Trigger validation
      await trigger();
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu báo giá:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin báo giá. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  const generateQuoteCode = async () => {
    try {
      const code = await db.generateQuotationCode();
    } catch (error) {
      console.error('Error generating quote code:', error);
    }
  };

  const handleAddItem = async () => {
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

    // Nếu chọn "Thêm mới" (selectedItemId = -1) thì tiến hành lưu mục mới
    if (selectedItemId === -1) {
      if (!newItemName.trim()) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng nhập tên cho mục mới.',
          variant: 'destructive'
        });
        return;
      }

      if (newItemPrice <= 0) {
        toast({
          title: 'Lỗi',
          description: 'Đơn giá phải lớn hơn 0.',
          variant: 'destructive'
        });
        return;
      }

      let newId = 0;

      if (selectedItemType === 'part') {
        try {
          const newPart = {
            sku: `NEW${Date.now()}`, // Tạo một mã SKU tạm thời
            name: newItemName,
            sellingPrice: newItemPrice,
            costPrice: newItemPrice * 0.8, // Giá nhập ước tính
            quantity: 100, // Giá trị mặc định cho kho
            unit: 'cái',
            categoryId: 1, // Đảm bảo sử dụng một ID danh mục hợp lệ
            minQuantity: 10, // Giá trị mặc định
            location: 'Kho chính', // Giá trị mặc định
            supplier: 'Chưa xác định' // Giá trị mặc định
          };
          newId = await db.inventoryItems.add(newPart);
          console.log("Đã thêm vật tư mới với ID:", newId);
          setInventoryItems(prev => [
            ...prev,
            { ...newPart, id: newId, category: { id: 1, name: 'Phụ tùng', code: 'PT' } }
          ]);
        } catch (error) {
          console.error("Lỗi khi thêm vật tư mới:", error);
          toast({
            title: 'Lỗi',
            description: 'Không thể thêm vật tư mới. Vui lòng thử lại.',
            variant: 'destructive'
          });
          return;
        }
      } else {
        try {
          const newService = {
            code: `DV${Date.now()}`, // Tạo mã dịch vụ tạm thời
            name: newItemName,
            price: newItemPrice,
            description: '',
            estimatedTime: 60 // Thời gian mặc định 60 phút
          };
          newId = await db.services.add(newService);
          console.log("Đã thêm dịch vụ mới với ID:", newId);
          setServices(prev => [...prev, { ...newService, id: newId }]);
        } catch (error) {
          console.error("Lỗi khi thêm dịch vụ mới:", error);
          toast({
            title: 'Lỗi',
            description: 'Không thể thêm dịch vụ mới. Vui lòng thử lại.',
            variant: 'destructive'
          });
          return;
        }
      }

      // Cập nhật selectedItemId với ID mới tạo được
      setSelectedItemId(newId);
    }

    // Kiểm tra xem mục có đã có trong danh sách báo giá chưa
    const existingItemIndex = quoteItems.findIndex(
      item => item.type === selectedItemType && item.itemId === selectedItemId
    );

    if (existingItemIndex !== -1) {
      const updatedItems = [...quoteItems];
      const item = updatedItems[existingItemIndex];
      const newQuantity = item.quantity + selectedQuantity;
      const newTotal = item.unitPrice * newQuantity;

      updatedItems[existingItemIndex] = {
        ...item,
        quantity: newQuantity,
        total: newTotal
      };
      setQuoteItems(updatedItems);
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
            variant: 'destructive'
          });
        }
      } else {
        const service = services.find(s => s.id === selectedItemId);
        if (!service) return;
        name = service.name;
        unitPrice = service.price;
      }

      const itemTotal = unitPrice * selectedQuantity;

      const newItem: QuoteItemForm = {
        type: selectedItemType,
        itemId: selectedItemId,
        name,
        quantity: selectedQuantity,
        unitPrice,
        total: itemTotal
      };

      setQuoteItems([...quoteItems, newItem]);
    }

    // Reset lại các giá trị đã chọn, cũng như thông tin mục mới
    setSelectedItemId(0);
    setSelectedQuantity(1);
    setNewItemName('');
    setNewItemPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...quoteItems];
    updatedItems.splice(index, 1);
    setQuoteItems(updatedItems);
  };

  const handleUpdateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;

    const updatedItems = [...quoteItems];
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

    const newTotal = item.unitPrice * newQuantity;

    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      total: newTotal
    };

    setQuoteItems(updatedItems);
  };

  const onSubmit = async (data: FormData) => {
    console.log('Nộp form với dữ liệu:', data);
    console.log('Trạng thái hiện tại:', {
      customerId: data.customerId, 
      vehicleId: data.vehicleId, 
      items: quoteItems.length
    });

    if (quoteItems.length === 0) {
      toast({
        title: 'Lỗi',
        description: 'Báo giá cần có ít nhất một vật tư hoặc dịch vụ.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const taxRate = data.tax || 0;
      const taxAmount = totals.subtotal * (taxRate / 100);

      if (isEditing && params.id) {
        const quoteId = parseInt(params.id);
        await db.quotations.update(quoteId, {
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          subtotal: totals.subtotal,
          tax: taxAmount,
          total: totals.subtotal + taxAmount,
          notes: data.notes,
          status: data.status
        });

        const itemsToDelete = await db.quotationItems
          .where('quotationId')
          .equals(quoteId)
          .toArray();

        for (const item of itemsToDelete) {
          if (item.id) {
            await db.quotationItems.delete(item.id);
          }
        }

        for (const item of quoteItems) {
          await db.quotationItems.add({
            quotationId: quoteId,
            type: item.type,
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          });
        }

        toast({
          title: 'Thành công',
          description: 'Đã cập nhật báo giá.',
        });
      } else {
        const quoteCode = await db.generateQuotationCode();

        const quoteId = await db.quotations.add({
          code: quoteCode,
          dateCreated: new Date(),
          customerId: data.customerId,
          vehicleId: data.vehicleId,
          subtotal: totals.subtotal,
          tax: taxAmount,
          total: totals.subtotal + taxAmount,
          notes: data.notes,
          status: data.status
        });

        for (const item of quoteItems) {
          await db.quotationItems.add({
            quotationId: quoteId,
            type: item.type,
            itemId: item.itemId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          });
        }

        toast({
          title: 'Thành công',
          description: 'Đã tạo báo giá mới.',
        });
      }

      setLocation('/quotes');
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu báo giá. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{isEditing ? 'Chỉnh Sửa Báo Giá' : 'Tạo Báo Giá Mới'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="info">Thông Tin Báo Giá</TabsTrigger>
                <TabsTrigger value="items">Vật Tư & Dịch Vụ</TabsTrigger>
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
                      disabled={isEditing}
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
                        </Link> trước khi tạo báo giá.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleId">Xe*</Label>
                    <Select
                      value={watch('vehicleId')?.toString() || '0'}
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          setValue('vehicleId', numValue, { shouldValidate: true });
                        }
                      }}
                      disabled={isEditing || !watchCustomerId}
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
                        <SelectItem value="sent">Đã Gửi KH</SelectItem>
                        <SelectItem value="accepted">KH Đồng Ý</SelectItem>
                        <SelectItem value="rejected">KH Từ Chối</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Ghi Chú & Điều Khoản</Label>
                    <Textarea
                      id="notes"
                      placeholder="Nhập ghi chú và điều khoản (nếu có)"
                      {...register('notes')}
                      rows={3}
                    />
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
                              <>
                                <SelectItem value="-1">Thêm mới vật tư</SelectItem>
                                {inventoryItems.length === 0 ? (
                                  <SelectItem value="0" disabled>Không có vật tư nào</SelectItem>
                                ) : (
                                  inventoryItems.map((item) => (
                                    <SelectItem 
                                      key={item.id} 
                                      value={item.id?.toString() || '0'}
                                      disabled={item.quantity <= 0}
                                    >
                                      {item.name} ({formatCurrency(item.sellingPrice)})
                                      {item.quantity <= 0 && ' - Hết hàng'}
                                    </SelectItem>
                                  ))
                                )}
                              </>
                            ) : (
                              <>
                                <SelectItem value="-1">Thêm mới dịch vụ</SelectItem>
                                {services.length === 0 ? (
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
                                )}
                              </>
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

                    {/* Form nhập thông tin cho mục mới nếu chọn "Thêm mới" */}
                    {selectedItemId === -1 && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold">Nhập thông tin {selectedItemType === 'part' ? 'vật tư mới' : 'dịch vụ mới'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>{selectedItemType === 'part' ? 'Tên vật tư' : 'Tên dịch vụ'}</Label>
                            <Input 
                              value={newItemName} 
                              onChange={(e) => setNewItemName(e.target.value)} 
                              placeholder="Nhập tên" 
                            />
                          </div>
                          <div>
                            <Label>{selectedItemType === 'part' ? 'Đơn giá' : 'Giá dịch vụ'}</Label>
                            <Input 
                              type="number" 
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                              placeholder="Nhập giá" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Danh Sách Vật Tư & Dịch Vụ</h3>
                    {quoteItems.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Chưa có vật tư hoặc dịch vụ nào trong báo giá</p>
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
                            {quoteItems.map((item, index) => (
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
            </Tabs>

            <div className="flex justify-end gap-2 mt-6">
              <Link href="/quotes">
                <Button type="button" variant="outline">Hủy</Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isLoading || !isValid || quoteItems.length === 0}
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
