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

  // Generate SKU based on category (same logic as InventoryForm.tsx)
  const generateSKU = async (categoryId: string) => {
    if (!categoryId) return '';
    
    try {
      const category = categories.find(c => c.id.toString() === categoryId);
      if (!category) {
        // Fallback: count all items and use VT prefix
        const count = await directInventoryDb.inventoryItems.count();
        const sku = `VT${(count + 1).toString().padStart(4, '0')}`;
        return sku;
      }

      // Lấy tiền tố mã dựa vào tên danh mục (same logic as original)
      let prefix = 'VT'; // Mặc định

      // Các danh mục đặc biệt
      if (category.name.toLowerCase().includes('phụ tùng')) {
        prefix = 'PT';
      } else if (category.name.toLowerCase().includes('nhân công')) {
        prefix = 'NC';
      } else if (category.name.toLowerCase().includes('gia công')) {
        prefix = 'GC';
      } else {
        // Lấy 2 chữ cái đầu tiên viết hoa từ tên danh mục
        const words = category.name.split(' ');
        if (words.length >= 2) {
          prefix = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
        } else if (words.length === 1 && words[0].length >= 2) {
          prefix = words[0].substring(0, 2).toUpperCase();
        }
      }

      // Đếm số lượng mặt hàng thuộc danh mục này
      const items = await directInventoryDb.inventoryItems
        .where('categoryId')
        .equals(Number(categoryId))
        .toArray();
        
      const count = items.length;
      const sku = `${prefix}${(count + 1).toString().padStart(4, '0')}`;
      return sku;
    } catch (error) {
      console.error('Error generating SKU:', error);
      return '';
    }
  };

  const handleChange = async (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate SKU when category changes
    if (field === 'categoryId' && value) {
      const generatedSKU = await generateSKU(value);
      setFormData(prev => ({
        ...prev,
        sku: generatedSKU
      }));
    }
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
      
      // Generate SKU if empty
      let finalSKU = formData.sku.trim();
      if (!finalSKU) {
        finalSKU = await generateSKU(formData.categoryId);
        if (!finalSKU) {
          finalSKU = `SKU${timestamp.slice(-6)}`; // Fallback
        }
      }

      // Create clean inventory item object
      const itemRecord = {};
      itemRecord['sku'] = finalSKU;
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
    <div className="container mx-auto py-3 lg:py-6 px-4 lg:px-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">Thêm vật tư mới</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/inventory')}
          disabled={isLoading}
          className="self-start sm:self-auto"
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
                  placeholder="Tự động tạo theo danh mục"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <div className="flex flex-col sm:flex-row justify-end gap-4 sm:space-x-4 sm:gap-0">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/inventory')}
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
            {isLoading ? 'Đang lưu...' : 'Lưu vật tư'}
          </Button>
        </div>
      </form>
    </div>
  );
}