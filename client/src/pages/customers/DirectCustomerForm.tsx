import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Dexie from 'dexie';

// Create a clean database instance just for this form
class DirectDatabase extends Dexie {
  customers!: Dexie.Table<any, number>;
  vehicles!: Dexie.Table<any, number>;

  constructor() {
    super('garageDatabase');
    this.version(1).stores({
      customers: '++id, code, name, phone, email',
      vehicles: '++id, code, customerId, licensePlate, brand, model'
    });
  }
}

const directDb = new DirectDatabase();

export default function DirectCustomerForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    taxCode: '',
    notes: ''
  });

  const [vehicleData, setVehicleData] = useState({
    licensePlate: '',
    brand: '',
    model: '',
    vin: '',
    year: '',
    color: '',
    lastOdometer: ''
  });

  const handleCustomerChange = (field: string, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVehicleChange = (field: string, value: string) => {
    setVehicleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerData.name.trim() || !customerData.phone.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền tên và số điện thoại khách hàng.',
        variant: 'destructive'
      });
      return;
    }

    if (!vehicleData.licensePlate.trim() || !vehicleData.brand.trim()) {
      toast({
        title: 'Lỗi', 
        description: 'Vui lòng điền biển số và hãng xe.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create clean customer object - NO async code generation
      const timestamp = Date.now().toString();
      
      const customerRecord = {};
      customerRecord['code'] = 'KH' + timestamp.slice(-4);
      customerRecord['name'] = customerData.name.trim();
      customerRecord['phone'] = customerData.phone.trim();
      customerRecord['address'] = customerData.address.trim();
      customerRecord['email'] = customerData.email.trim();
      customerRecord['taxCode'] = customerData.taxCode.trim();
      customerRecord['notes'] = customerData.notes.trim();

      console.log('Direct customer save:', customerRecord);

      // Direct database add
      const customerId = await directDb.customers.add(customerRecord);
      
      console.log('Customer ID received:', customerId);

      // Create vehicle record
      const vehicleRecord = {};
      vehicleRecord['code'] = 'XE' + (timestamp.slice(-4));
      vehicleRecord['customerId'] = Number(customerId);
      vehicleRecord['licensePlate'] = vehicleData.licensePlate.trim();
      vehicleRecord['brand'] = vehicleData.brand.trim();
      vehicleRecord['model'] = vehicleData.model.trim();
      vehicleRecord['vin'] = vehicleData.vin.trim();
      vehicleRecord['color'] = vehicleData.color.trim();
      vehicleRecord['lastOdometer'] = Number(vehicleData.lastOdometer || 0);
      
      if (vehicleData.year && !isNaN(Number(vehicleData.year))) {
        vehicleRecord['year'] = Number(vehicleData.year);
      }

      console.log('Direct vehicle save:', vehicleRecord);

      await directDb.vehicles.add(vehicleRecord);

      console.log('Both records saved successfully');

      toast({
        title: 'Thành công',
        description: 'Đã thêm khách hàng và xe mới.',
      });

      // Navigate back to customers list
      navigate('/customers');
      
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lưu thông tin khách hàng.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Thêm khách hàng mới (Direct)</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/customers')}
          disabled={isLoading}
        >
          Quay lại
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin khách hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên khách hàng *</Label>
                <Input
                  id="name"
                  value={customerData.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  placeholder="Nhập tên khách hàng"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input
                  id="phone"
                  value={customerData.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  placeholder="Nhập số điện thoại"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                value={customerData.address}
                onChange={(e) => handleCustomerChange('address', e.target.value)}
                placeholder="Nhập địa chỉ"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => handleCustomerChange('email', e.target.value)}
                  placeholder="Nhập email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxCode">Mã số thuế</Label>
                <Input
                  id="taxCode"
                  value={customerData.taxCode}
                  onChange={(e) => handleCustomerChange('taxCode', e.target.value)}
                  placeholder="Nhập mã số thuế"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                value={customerData.notes}
                onChange={(e) => handleCustomerChange('notes', e.target.value)}
                placeholder="Nhập ghi chú"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin xe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="licensePlate">Biển số xe *</Label>
                <Input
                  id="licensePlate"
                  value={vehicleData.licensePlate}
                  onChange={(e) => handleVehicleChange('licensePlate', e.target.value)}
                  placeholder="Nhập biển số xe"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Hãng xe *</Label>
                <Input
                  id="brand"
                  value={vehicleData.brand}
                  onChange={(e) => handleVehicleChange('brand', e.target.value)}
                  placeholder="Nhập hãng xe"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model xe</Label>
                <Input
                  id="model"
                  value={vehicleData.model}
                  onChange={(e) => handleVehicleChange('model', e.target.value)}
                  placeholder="Nhập model xe"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year">Năm sản xuất</Label>
                <Input
                  id="year"
                  type="number"
                  value={vehicleData.year}
                  onChange={(e) => handleVehicleChange('year', e.target.value)}
                  placeholder="Nhập năm sản xuất"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Màu sắc</Label>
                <Input
                  id="color"
                  value={vehicleData.color}
                  onChange={(e) => handleVehicleChange('color', e.target.value)}
                  placeholder="Nhập màu sắc"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastOdometer">Số Km</Label>
                <Input
                  id="lastOdometer"
                  type="number"
                  value={vehicleData.lastOdometer}
                  onChange={(e) => handleVehicleChange('lastOdometer', e.target.value)}
                  placeholder="Nhập số Km"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">Số VIN</Label>
              <Input
                id="vin"
                value={vehicleData.vin}
                onChange={(e) => handleVehicleChange('vin', e.target.value)}
                placeholder="Nhập số VIN"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/customers')}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu khách hàng'}
          </Button>
        </div>
      </form>
    </div>
  );
}