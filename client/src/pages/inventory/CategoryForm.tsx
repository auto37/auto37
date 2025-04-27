import { useState, useEffect } from 'react';
import { useLocation, useParams, useRoute, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { InventoryCategory } from '@/lib/types';

const categorySchema = z.object({
  code: z.string().min(1, 'Mã danh mục là bắt buộc'),
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
});

type FormData = z.infer<typeof categorySchema>;

export default function CategoryForm() {
  const params = useParams();
  const [match] = useRoute('/inventory/category/:id/edit');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
    }
  });

  useEffect(() => {
    if (match && params.id) {
      setIsEditing(true);
      fetchCategory(parseInt(params.id));
    } else {
      generateCategoryCode();
    }
  }, [match, params.id]);

  const fetchCategory = async (id: number) => {
    setIsLoading(true);
    try {
      const category = await db.inventoryCategories.get(id);
      if (category) {
        setValue('code', category.code);
        setValue('name', category.name);
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy danh mục.',
          variant: 'destructive'
        });
        navigate('/inventory');
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin danh mục. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCategoryCode = async () => {
    try {
      const code = await db.generateCategoryCode();
      setValue('code', code);
    } catch (error) {
      console.error('Error generating category code:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo mã danh mục.',
        variant: 'destructive'
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (isEditing && params.id) {
        const id = parseInt(params.id);
        await db.inventoryCategories.update(id, {
          code: data.code,
          name: data.name,
        });
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật thông tin danh mục.',
        });
      } else {
        await db.inventoryCategories.add({
          code: data.code,
          name: data.name,
        });
        toast({
          title: 'Thành công',
          description: 'Đã thêm danh mục mới.',
        });
      }
      navigate('/inventory');
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu thông tin danh mục. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card className="max-w-md mx-auto">
        <CardHeader className="pb-3">
          <CardTitle>{isEditing ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Mã Danh Mục*
                </label>
                <Input
                  id="code"
                  {...register('code')}
                  disabled={isEditing}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Tên Danh Mục*
                </label>
                <Input
                  id="name"
                  placeholder="Nhập tên danh mục"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Link href="/inventory">
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
