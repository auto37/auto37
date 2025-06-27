import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Dexie from 'dexie';

// Clean database instance for services
class DirectServiceDatabase extends Dexie {
  services!: Dexie.Table<any, number>;

  constructor() {
    super('garageDatabase');
    this.version(1).stores({
      services: '++id, code, name, price'
    });
  }
}

const directServiceDb = new DirectServiceDatabase();

export default function DirectServiceForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    estimatedTime: '',
    category: '',
    description: ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền tên dịch vụ.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const timestamp = Date.now().toString();
      
      // Create clean service object
      const serviceRecord = {};
      serviceRecord['code'] = `DV${timestamp.slice(-4)}`;
      serviceRecord['name'] = formData.name.trim();
      serviceRecord['price'] = Number(formData.price || 0);
      serviceRecord['category'] = formData.category.trim() || '';
      serviceRecord['description'] = formData.description.trim() || '';
      
      if (formData.estimatedTime && !isNaN(Number(formData.estimatedTime))) {
        serviceRecord['estimatedTime'] = Number(formData.estimatedTime);
      }

      console.log('Direct service save:', serviceRecord);

      await directServiceDb.services.add(serviceRecord);

      console.log('Service saved successfully');

      toast({
        title: 'Thành công',
        description: 'Đã thêm dịch vụ mới.',
      });

      navigate('/services');
      
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lưu dịch vụ.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-3 lg:py-6 px-4 lg:px-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">Thêm dịch vụ mới</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/services')}
          disabled={isLoading}
          className="self-start sm:self-auto"
        >
          Quay lại
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin dịch vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên dịch vụ *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nhập tên dịch vụ"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Giá dịch vụ</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedTime">Thời gian ước tính (phút)</Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  value={formData.estimatedTime}
                  onChange={(e) => handleChange('estimatedTime', e.target.value)}
                  placeholder="60"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Loại dịch vụ</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="Bảo dưỡng, Sửa chữa..."
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Mô tả chi tiết về dịch vụ"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-end gap-4 sm:space-x-4 sm:gap-0">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/services')}
            disabled={isLoading}
            className="order-2 sm:order-1"
          >
            Hủy
          </Button>
          <Button 
            type="submit"
            disabled={isLoading}
            className="order-1 sm:order-2"
          >
            {isLoading ? 'Đang lưu...' : 'Lưu dịch vụ'}
          </Button>
        </div>
      </form>
    </div>
  );
}