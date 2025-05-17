import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Định nghĩa loại dữ liệu đăng ký admin
interface SetupAdminData {
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export function SetupPage() {
  // State lưu thông tin đăng ký
  const [formData, setFormData] = useState<SetupAdminData>({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    email: "",
    phone: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Sử dụng React Query để tạo tài khoản admin
  const setupMutation = useMutation<any, Error, SetupAdminData>({
    mutationFn: async (data: SetupAdminData) => {
      try {
        const response = await fetch("/api/setup/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Tạo tài khoản thất bại");
        }
        
        return await response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Đã xảy ra lỗi khi tạo tài khoản admin");
      }
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: "Thiết lập thành công",
        description: "Tài khoản admin đã được tạo. Vui lòng đăng nhập để tiếp tục.",
      });
      
      // Chuyển đến trang đăng nhập
      setLocation("/auth/login");
    },
    onError: (error: any) => {
      setIsLoading(false);
      toast({
        title: "Thiết lập thất bại",
        description: error.message || "Đã xảy ra lỗi khi tạo tài khoản admin",
        variant: "destructive",
      });
    },
  });

  // Xử lý thay đổi giá trị form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Xử lý tạo tài khoản admin
  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kiểm tra dữ liệu đầu vào
    if (!formData.username || !formData.password || !formData.fullName) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Mật khẩu không khớp",
        description: "Mật khẩu xác nhận không khớp với mật khẩu đã nhập",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "Mật khẩu quá ngắn",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setupMutation.mutate(formData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Thiết lập ban đầu</CardTitle>
          <CardDescription>
            Tạo tài khoản quản trị viên đầu tiên để quản lý hệ thống
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSetup}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Nhập tên đăng nhập"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Nhập họ và tên"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email (không bắt buộc)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập địa chỉ email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="phone">Số điện thoại (không bắt buộc)</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Nhập số điện thoại"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản admin"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default SetupPage;