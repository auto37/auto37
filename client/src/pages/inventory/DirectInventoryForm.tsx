import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Dexie from 'dexie';

// Clean database instance for inventory
class DirectInventoryDatabase extends Dexie {
  inventoryCategories!: Dexie.Table<any, number>;
  inventoryItems!: Dexie.Table<any, number>;

  constructor() {
    super('garageDatabase');
    this.version(1).stores({
      inventoryCategories: '++id, code, name',
      inventoryItems: '++id, sku, name, categoryId, quantity'
    });
  }
}

const directInventoryDb = new DirectInventoryDatabase();

export default function DirectInventoryForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    categoryId: '',
    quantity: '',
    costPrice: '',
    sellingPrice: '',
    minQuantity: '',
    unit: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const allCategories = await directInventoryDb.inventoryCategories.toArray();
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.categoryId) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền tên vật tư và chọn danh mục.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const timestamp = Date.now().toString();
      
      // Create clean inventory item object
      const itemRecord = {};
      itemRecord['sku'] = formData.sku.trim() || `SKU${timestamp.slice(-6)}`;
      itemRecord['name'] = formData.name.trim();
      itemRecord['categoryId'] = Number(formData.categoryId);
      itemRecord['quantity'] = Number(formData.quantity || 0);
      itemRecord['costPrice'] = Number(formData.costPrice || 0);
      itemRecord['sellingPrice'] = Number(formData.sellingPrice || 0);
      itemRecord['unit'] = formData.unit.trim() || 'cái';
      itemRecord['location'] = formData.location.trim() || '';
      itemRecord['description'] = formData.description.trim() || '';
      
      if (formData.minQuantity && !isNaN(Number(formData.minQuantity))) {
        itemRecord['minQuantity'] = Number(formData.minQuantity);
      }

      console.log('Direct inventory save:', itemRecord);

      await directInventoryDb.inventoryItems.add(itemRecord);

      console.log('Inventory item saved successfully');

      toast({
        title: 'Thành công',
        description: 'Đã thêm vật tư mới.',
      });

      navigate('/inventory');
      
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast({
        title: 'Lỗi',
        description: 'Có lỗi xảy ra khi lưu vật tư.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Thêm vật tư mới</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/inventory')}
          disabled={isLoading}
        >
          Quay lại
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin vật tư</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">Mã SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="Để trống để tự tạo"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Tên vật tư *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nhập tên vật tư"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Danh mục *</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => handleChange('categoryId', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit">Đơn vị</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  placeholder="cái, bộ, lít..."
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Số lượng</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="costPrice">Giá nhập</Label>
                <Input
                  id="costPrice"
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => handleChange('costPrice', e.target.value)}
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Giá bán</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) => handleChange('sellingPrice', e.target.value)}
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minQuantity">Số lượng tối thiểu</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  value={formData.minQuantity}
                  onChange={(e) => handleChange('minQuantity', e.target.value)}
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Vị trí</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Kệ A1, Kho B..."
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
                placeholder="Mô tả chi tiết về vật tư"
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/inventory')}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu vật tư'}
          </Button>
        </div>
      </form>
    </div>
  );
}