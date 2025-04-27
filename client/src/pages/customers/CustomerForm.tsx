import { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { Customer, Vehicle, CAR_BRANDS } from '@/lib/types';

interface FormData {
  code: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  taxCode?: string;
  notes?: string;
  vehicles: {
    id?: number;
    licensePlate: string;
    brand: string;
    model: string;
    vin?: string;
    year?: number;
    color?: string;
    lastOdometer: number;
  }[];
}

const customerSchema = z.object({
  code: z.string().min(1, 'Mã khách hàng là bắt buộc'),
  name: z.string().min(1, 'Tên khách hàng là bắt buộc'),
  phone: z.string().min(1, 'Số điện thoại là bắt buộc'),
  address: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  taxCode: z.string().optional(),
  notes: z.string().optional(),
  vehicles: z.array(
    z.object({
      id: z.number().optional(),
      licensePlate: z.string().min(1, 'Biển số xe là bắt buộc'),
      brand: z.string().min(1, 'Hãng xe là bắt buộc'),
      model: z.string().min(1, 'Model xe là bắt buộc'),
      vin: z.string().optional(),
      year: z.number().int().positive().optional(),
      color: z.string().optional(),
      lastOdometer: z.number().int().nonnegative('Số Km không được âm'),
    })
  )
});

export default function CustomerForm() {
  const params = useParams();
  const [match] = useRoute('/customers/:id/edit');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');

  const { register, handleSubmit, setValue, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: '',
      name: '',
      phone: '',
      address: '',
      email: '',
      taxCode: '',
      notes: '',
      vehicles: [
        {
          licensePlate: '',
          brand: '',
          model: '',
          vin: '',
          year: undefined,
          color: '',
          lastOdometer: 0
        }
      ]
    }
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Check if editing mode based on URL
  useEffect(() => {
    if (match && params.id) {
      setIsEditing(true);
      fetchCustomer(parseInt(params.id));
    } else {
      generateCustomerCode();
    }
  }, [match, params.id]);

  // Fetch customer data
  const fetchCustomer = async (id: number) => {
    setIsLoading(true);
    try {
      const customer = await db.customers.get(id);
      if (customer) {
        setValue('code', customer.code);
        setValue('name', customer.name);
        setValue('phone', customer.phone);
        setValue('address', customer.address || '');
        setValue('email', customer.email || '');
        setValue('taxCode', customer.taxCode || '');
        setValue('notes', customer.notes || '');

        // Fetch vehicles
        const customerVehicles = await db.vehicles
          .where('customerId')
          .equals(id)
          .toArray();
        
        setVehicles(customerVehicles);
        
        if (customerVehicles.length > 0) {
          setValue('vehicles', customerVehicles.map(v => ({
            id: v.id,
            licensePlate: v.licensePlate,
            brand: v.brand,
            model: v.model,
            vin: v.vin || '',
            year: v.year,
            color: v.color || '',
            lastOdometer: v.lastOdometer
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin khách hàng. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate auto customer code for new customers
  const generateCustomerCode = async () => {
    try {
      const code = await db.generateCustomerCode();
      setValue('code', code);
    } catch (error) {
      console.error('Error generating customer code:', error);
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (isEditing && params.id) {
        // Update existing customer
        const customerId = parseInt(params.id);
        
        await db.customers.update(customerId, {
          code: data.code,
          name: data.name,
          phone: data.phone,
          address: data.address,
          email: data.email,
          taxCode: data.taxCode,
          notes: data.notes
        });

        // Handle vehicles
        // First, get existing vehicles to compare
        const existingVehicles = await db.vehicles
          .where('customerId')
          .equals(customerId)
          .toArray();
        
        // Map of existing vehicle ids
        const existingVehicleIds = new Set(existingVehicles.map(v => v.id));
        
        // Process each vehicle in the form
        for (const vehicle of data.vehicles) {
          if (vehicle.id) {
            // Update existing vehicle
            await db.vehicles.update(vehicle.id, {
              licensePlate: vehicle.licensePlate,
              brand: vehicle.brand,
              model: vehicle.model,
              vin: vehicle.vin,
              year: vehicle.year,
              color: vehicle.color,
              lastOdometer: vehicle.lastOdometer
            });
            // Remove from the set of existing vehicles
            existingVehicleIds.delete(vehicle.id);
          } else {
            // Add new vehicle
            const vehicleCode = await db.generateVehicleCode();
            await db.vehicles.add({
              code: vehicleCode,
              customerId: customerId,
              licensePlate: vehicle.licensePlate,
              brand: vehicle.brand,
              model: vehicle.model,
              vin: vehicle.vin,
              year: vehicle.year,
              color: vehicle.color,
              lastOdometer: vehicle.lastOdometer
            });
          }
        }
        
        // Delete vehicles that are no longer in the form
        for (const vehicleId of existingVehicleIds) {
          if (vehicleId) {
            await db.vehicles.delete(vehicleId);
          }
        }
        
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật thông tin khách hàng.',
        });
      } else {
        // Add new customer
        const customerId = await db.customers.add({
          code: data.code,
          name: data.name,
          phone: data.phone,
          address: data.address,
          email: data.email,
          taxCode: data.taxCode,
          notes: data.notes
        });
        
        // Add vehicles
        for (const vehicle of data.vehicles) {
          const vehicleCode = await db.generateVehicleCode();
          await db.vehicles.add({
            code: vehicleCode,
            customerId: customerId,
            licensePlate: vehicle.licensePlate,
            brand: vehicle.brand,
            model: vehicle.model,
            vin: vehicle.vin,
            year: vehicle.year,
            color: vehicle.color,
            lastOdometer: vehicle.lastOdometer
          });
        }
        
        toast({
          title: 'Thành công',
          description: 'Đã thêm khách hàng mới.',
        });
      }
      
      // Navigate back to customers list
      navigate('/customers');
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi khi lưu thông tin khách hàng.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const watchVehicles = watch('vehicles');

  const addVehicle = () => {
    setValue('vehicles', [
      ...watchVehicles,
      {
        licensePlate: '',
        brand: '',
        model: '',
        vin: '',
        year: undefined,
        color: '',
        lastOdometer: 0
      }
    ]);
  };

  const removeVehicle = (index: number) => {
    const updatedVehicles = [...watchVehicles];
    updatedVehicles.splice(index, 1);
    setValue('vehicles', updatedVehicles);
  };

  return (
    <div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{isEditing ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="info">Thông Tin Khách Hàng</TabsTrigger>
                <TabsTrigger value="vehicles">Thông Tin Xe</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã Khách Hàng*</Label>
                    <Input
                      id="code"
                      {...register('code')}
                      disabled={true}
                    />
                    {errors.code && (
                      <p className="text-sm text-red-500">{errors.code.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên Khách Hàng*</Label>
                    <Input
                      id="name"
                      placeholder="Nhập tên khách hàng"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số Điện Thoại*</Label>
                    <Input
                      id="phone"
                      placeholder="Nhập số điện thoại"
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500">{errors.phone.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      placeholder="Nhập email"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Địa Chỉ</Label>
                    <Input
                      id="address"
                      placeholder="Nhập địa chỉ"
                      {...register('address')}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="taxCode">Mã Số Thuế</Label>
                    <Input
                      id="taxCode"
                      placeholder="Nhập mã số thuế (nếu là công ty)"
                      {...register('taxCode')}
                    />
                    {errors.taxCode && (
                      <p className="text-sm text-red-500">{errors.taxCode.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Ghi Chú</Label>
                    <Textarea
                      id="notes"
                      placeholder="Nhập ghi chú về khách hàng (nếu có)"
                      {...register('notes')}
                      rows={3}
                    />
                    {errors.notes && (
                      <p className="text-sm text-red-500">{errors.notes.message}</p>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="vehicles">
                <div className="space-y-6">
                  {watchVehicles.map((vehicle, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-slate-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Xe #{index + 1}</h3>
                        {watchVehicles.length > 1 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => removeVehicle(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-trash mr-2"></i>
                            Xóa Xe
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.licensePlate`}>Biển Số Xe*</Label>
                          <Input
                            id={`vehicles.${index}.licensePlate`}
                            placeholder="Nhập biển số xe"
                            {...register(`vehicles.${index}.licensePlate`)}
                          />
                          {errors.vehicles?.[index]?.licensePlate && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.licensePlate?.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.brand`}>Hãng Xe*</Label>
                          <Select
                            onValueChange={(value) => setValue(`vehicles.${index}.brand`, value)}
                            defaultValue={vehicle.brand}
                          >
                            <SelectTrigger id={`vehicles.${index}.brand`}>
                              <SelectValue placeholder="Chọn hãng xe" />
                            </SelectTrigger>
                            <SelectContent>
                              {CAR_BRANDS.map((brand) => (
                                <SelectItem key={brand} value={brand}>
                                  {brand}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.vehicles?.[index]?.brand && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.brand?.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.model`}>Model Xe*</Label>
                          <Input
                            id={`vehicles.${index}.model`}
                            placeholder="Nhập model xe"
                            {...register(`vehicles.${index}.model`)}
                          />
                          {errors.vehicles?.[index]?.model && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.model?.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.year`}>Năm Sản Xuất</Label>
                          <Input
                            id={`vehicles.${index}.year`}
                            type="number"
                            placeholder="Nhập năm sản xuất"
                            {...register(`vehicles.${index}.year`, { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? undefined : Number(v)
                            })}
                          />
                          {errors.vehicles?.[index]?.year && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.year?.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.vin`}>Số VIN (Số khung)</Label>
                          <Input
                            id={`vehicles.${index}.vin`}
                            placeholder="Nhập số VIN/số khung"
                            {...register(`vehicles.${index}.vin`)}
                          />
                          {errors.vehicles?.[index]?.vin && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.vin?.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.color`}>Màu Sắc</Label>
                          <Input
                            id={`vehicles.${index}.color`}
                            placeholder="Nhập màu xe"
                            {...register(`vehicles.${index}.color`)}
                          />
                          {errors.vehicles?.[index]?.color && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.color?.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`vehicles.${index}.lastOdometer`}>Số Km Hiện Tại*</Label>
                          <Input
                            id={`vehicles.${index}.lastOdometer`}
                            type="number"
                            placeholder="Nhập số Km"
                            {...register(`vehicles.${index}.lastOdometer`, { 
                              valueAsNumber: true,
                              setValueAs: (v) => v === '' ? 0 : Number(v)
                            })}
                          />
                          {errors.vehicles?.[index]?.lastOdometer && (
                            <p className="text-sm text-red-500">{errors.vehicles[index]?.lastOdometer?.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addVehicle}
                    className="mt-4"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Thêm Xe
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 mt-6">
              <Link href="/customers">
                <Button type="button" variant="outline">Hủy</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
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
