import { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { InventoryItem, InventoryCategory, UNITS } from '@/lib/types';

const inventoryItemSchema = z.object({
  sku: z.string().min(1, 'Mã SKU là bắt buộc'),
  name: z.string().min(1, 'Tên vật tư là bắt buộc'),
  categoryId: z.number().int().positive('Vui lòng chọn danh mục'),
  unit: z.string().min(1, 'Đơn vị tính là bắt buộc'),
  quantity: z.number().int().min(0, 'Số lượng không được âm'),
  costPrice: z.number().positive('Giá nhập phải lớn hơn 0'),
  sellingPrice: z.number().positive('Giá bán phải lớn hơn 0'),
  supplier: z.string().optional(),
  location: z.string().optional(),
  minQuantity: z.number().int().nonnegative('Mức tồn kho tối thiểu không được âm').optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof inventoryItemSchema>;

export default function InventoryForm() {
  const params = useParams();
  const [match] = useRoute('/inventory/:id/edit');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      sku: '',
      name: '',
      categoryId: 0,
      unit: '',
      quantity: 0,
      costPrice: 0,
      sellingPrice: 0,
      supplier: '',
      location: '',
      minQuantity: 0,
      notes: '',
    }
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const allCategories = await db.inventoryCategories.toArray();
        setCategories(allCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải danh sách danh mục. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    };

    fetchCategories();
  }, [toast]);

  useEffect(() => {
    if (match && params.id) {
      setIsEditing(true);
      fetchInventoryItem(parseInt(params.id));
    } else {
      // Generate SKU for new items
      generateSku();
    }
  }, [match, params.id]);
  
  // Cập nhật mã SKU tự động khi danh mục thay đổi
  useEffect(() => {
    if (!isEditing && watch('categoryId')) {
      generateSku();
    }
  }, [watch('categoryId')]);


  const fetchInventoryItem = async (id: number) => {
    setIsLoading(true);
    try {
      const item = await db.inventoryItems.get(id);
      if (item) {
        setValue('sku', item.sku);
        setValue('name', item.name);
        setValue('categoryId', item.categoryId);
        setValue('unit', item.unit);
        setValue('quantity', item.quantity);
        setValue('costPrice', item.costPrice);
        setValue('sellingPrice', item.sellingPrice);
        setValue('supplier', item.supplier || '');
        setValue('location', item.location || '');
        setValue('minQuantity', item.minQuantity || 0);
        setValue('notes', item.notes || '');
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy vật tư.',
          variant: 'destructive'
        });
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin vật tư. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSku = async () => {
    try {
      const categoryId = watch('categoryId');
      if (!categoryId) {
        // Nếu chưa chọn danh mục, đặt mã mặc định
        const count = await db.inventoryItems.count();
        const sku = `VT${(count + 1).toString().padStart(4, '0')}`;
        setValue('sku', sku);
        return;
      }

      // Lấy thông tin danh mục
      const category = await db.inventoryCategories.get(categoryId);
      if (!category) {
        throw new Error('Không tìm thấy danh mục');
      }

      // Lấy tiền tố mã dựa vào tên danh mục
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
      const items = await db.inventoryItems
        .where('categoryId')
        .equals(categoryId)
        .toArray();
        
      const count = items.length;
      const sku = `${prefix}${(count + 1).toString().padStart(4, '0')}`;
      setValue('sku', sku);
    } catch (error) {
      console.error('Error generating SKU:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo mã SKU.',
        variant: 'destructive'
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (isEditing && params.id) {
        const id = parseInt(params.id);
        await db.inventoryItems.update(id, {
          sku: data.sku,
          name: data.name,
          categoryId: data.categoryId,
          unit: data.unit,
          quantity: data.quantity,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          supplier: data.supplier,
          location: data.location,
          minQuantity: data.minQuantity,
          notes: data.notes,
        });
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật thông tin vật tư.',
        });
      } else {
        await db.inventoryItems.add({
          sku: data.sku,
          name: data.name,
          categoryId: data.categoryId,
          unit: data.unit,
          quantity: data.quantity,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          supplier: data.supplier,
          location: data.location,
          minQuantity: data.minQuantity,
          notes: data.notes,
        });
        toast({
          title: 'Thành công',
          description: 'Đã thêm vật tư mới.',
        });
      }
      navigate('/inventory');
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu thông tin vật tư. Vui lòng thử lại.',
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
          <CardTitle>{isEditing ? 'Chỉnh Sửa Vật Tư' : 'Thêm Vật Tư Mới'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku">Mã SKU*</Label>
                <Input
                  id="sku"
                  {...register('sku')}
                  disabled={isEditing}
                />
                {errors.sku && (
                  <p className="text-sm text-red-500">{errors.sku.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Tên Vật Tư*</Label>
                <Input
                  id="name"
                  placeholder="Nhập tên vật tư"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="categoryId">Danh Mục*</Label>
                <Select
                  value={watch('categoryId')?.toString()}
                  onValueChange={(value) => setValue('categoryId', parseInt(value), { shouldValidate: true })}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="0" disabled>Không có danh mục nào</SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem 
                          key={category.id} 
                          value={category.id?.toString() || '0'}
                        >
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId.message}</p>
                )}
                {categories.length === 0 && (
                  <p className="text-sm text-yellow-500">
                    <Link href="/inventory/category/new" className="underline">
                      Thêm danh mục mới
                    </Link> trước khi thêm vật tư.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit">Đơn Vị Tính*</Label>
                <Select
                  value={watch('unit')}
                  onValueChange={(value) => setValue('unit', value, { shouldValidate: true })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Chọn đơn vị tính" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-red-500">{errors.unit.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Số Lượng Tồn Kho*</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-sm text-red-500">{errors.quantity.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minQuantity">Mức Tồn Kho Tối Thiểu</Label>
                <Input
                  id="minQuantity"
                  type="number"
                  placeholder="0"
                  {...register('minQuantity', { 
                    valueAsNumber: true,
                    setValueAs: (v) => v === '' ? undefined : Number(v)
                  })}
                />
                {errors.minQuantity && (
                  <p className="text-sm text-red-500">{errors.minQuantity.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="costPrice">Giá Nhập*</Label>
                <Input
                  id="costPrice"
                  type="number"
                  {...register('costPrice', { valueAsNumber: true })}
                />
                {errors.costPrice && (
                  <p className="text-sm text-red-500">{errors.costPrice.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Giá Bán*</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  {...register('sellingPrice', { valueAsNumber: true })}
                />
                {errors.sellingPrice && (
                  <p className="text-sm text-red-500">{errors.sellingPrice.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier">Nhà Cung Cấp</Label>
                <Input
                  id="supplier"
                  placeholder="Nhập thông tin nhà cung cấp"
                  {...register('supplier')}
                />
                {errors.supplier && (
                  <p className="text-sm text-red-500">{errors.supplier.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Vị Trí Lưu Kho</Label>
                <Input
                  id="location"
                  placeholder="Nhập vị trí lưu kho"
                  {...register('location')}
                />
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Ghi Chú</Label>
                <Textarea
                  id="notes"
                  placeholder="Nhập ghi chú về vật tư (nếu có)"
                  {...register('notes')}
                  rows={3}
                />
                {errors.notes && (
                  <p className="text-sm text-red-500">{errors.notes.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Link href="/inventory">
                <Button type="button" variant="outline">Hủy</Button>
              </Link>
              <Button type="submit" disabled={isLoading || categories.length === 0}>
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
