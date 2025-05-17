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

// Định nghĩa loại dữ liệu đăng nhập
interface LoginData {
  username: string;
  password: string;
}

export function LoginPage() {
  // State lưu thông tin đăng nhập
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Sử dụng React Query để đăng nhập
  const loginMutation = useMutation<any, Error, LoginData>({
    mutationFn: async (data: LoginData) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Đăng nhập thất bại");
        }
        
        return await response.json();
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Đã xảy ra lỗi khi đăng nhập");
      }
    },
    onSuccess: (data: any) => {
      setIsLoading(false);
      toast({
        title: "Đăng nhập thành công",
        description: `Xin chào, ${data?.user?.fullName || 'quản trị viên'}`,
      });
      
      // Chuyển đến trang chính sau khi đăng nhập
      setLocation("/");
    },
    onError: (error: any) => {
      setIsLoading(false);
      toast({
        title: "Đăng nhập thất bại",
        description: error.message || "Sai tên đăng nhập hoặc mật khẩu",
        variant: "destructive",
      });
    },
  });

  // Xử lý đăng nhập
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    loginMutation.mutate({ username, password });
  };

  // Kiểm tra xem đã có tài khoản admin chưa
  const checkAdmin = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      
      // Nếu có lỗi 401 hoặc 403, tức là chưa đăng nhập hoặc không có quyền admin
      if (response.status === 401 || response.status === 403) {
        // Kiểm tra xem có admin nào chưa
        const setupResponse = await fetch("/api/setup/admin", { method: "GET" });
        if (setupResponse.ok) {
          const setupData = await setupResponse.json();
          if (setupData.needsSetup) {
            setLocation("/auth/setup");
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra tài khoản admin:", error);
    }
  };

  // Kiểm tra admin khi trang được tải
  useState(() => {
    checkAdmin();
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>
            Đăng nhập để truy cập hệ thống quản lý gara ô tô
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setLocation("/")}>
              Quay lại
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default LoginPage;