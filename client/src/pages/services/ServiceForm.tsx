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
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { Service } from '@/lib/types';

const serviceSchema = z.object({
  code: z.string().min(1, 'Mã dịch vụ là bắt buộc'),
  name: z.string().min(1, 'Tên dịch vụ là bắt buộc'),
  description: z.string().optional(),
  price: z.number().positive('Giá dịch vụ phải lớn hơn 0'),
  estimatedTime: z.number().int().nonnegative('Thời gian dự kiến không được âm').optional(),
});

type FormData = z.infer<typeof serviceSchema>;

export default function ServiceForm() {
  const params = useParams();
  const [match] = useRoute('/services/:id/edit');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      price: 0,
      estimatedTime: 0,
    }
  });

  useEffect(() => {
    if (match && params.id) {
      setIsEditing(true);
      fetchService(parseInt(params.id));
    } else {
      generateServiceCode();
    }
  }, [match, params.id]);

  const fetchService = async (id: number) => {
    setIsLoading(true);
    try {
      const service = await db.services.get(id);
      if (service) {
        setValue('code', service.code);
        setValue('name', service.name);
        setValue('description', service.description || '');
        setValue('price', service.price);
        setValue('estimatedTime', service.estimatedTime || 0);
      } else {
        toast({
          title: 'Lỗi',
          description: 'Không tìm thấy dịch vụ.',
          variant: 'destructive'
        });
        navigate('/services');
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin dịch vụ. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateServiceCode = async () => {
    try {
      const code = await db.generateServiceCode();
      setValue('code', code);
    } catch (error) {
      console.error('Error generating service code:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo mã dịch vụ.',
        variant: 'destructive'
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (isEditing && params.id) {
        const id = parseInt(params.id);
        await db.services.update(id, {
          code: data.code,
          name: data.name,
          description: data.description,
          price: data.price,
          estimatedTime: data.estimatedTime,
        });
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật thông tin dịch vụ.',
        });
      } else {
        await db.services.add({
          code: data.code,
          name: data.name,
          description: data.description,
          price: data.price,
          estimatedTime: data.estimatedTime,
        });
        toast({
          title: 'Thành công',
          description: 'Đã thêm dịch vụ mới.',
        });
      }
      navigate('/services');
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu thông tin dịch vụ. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <CardTitle>{isEditing ? 'Chỉnh Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="code">Mã Dịch Vụ*</Label>
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
                <Label htmlFor="name">Tên Dịch Vụ*</Label>
                <Input
                  id="name"
                  placeholder="Nhập tên dịch vụ"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Giá Dịch Vụ*</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimatedTime">Thời Gian Dự Kiến (phút)</Label>
                <Input
                  id="estimatedTime"
                  type="number"
                  placeholder="0"
                  {...register('estimatedTime', { 
                    valueAsNumber: true,
                    setValueAs: (v) => v === '' ? undefined : Number(v)
                  })}
                />
                {errors.estimatedTime && (
                  <p className="text-sm text-red-500">{errors.estimatedTime.message}</p>
                )}
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Mô Tả Dịch Vụ</Label>
                <Textarea
                  id="description"
                  placeholder="Mô tả chi tiết về dịch vụ"
                  {...register('description')}
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Link href="/services">
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
