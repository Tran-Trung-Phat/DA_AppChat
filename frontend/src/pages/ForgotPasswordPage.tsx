import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import { toast } from "sonner";

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
      toast.success("Đã gửi email đặt lại mật khẩu");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể gửi email. Vui lòng thử lại"
      );
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10",
        className
      )}
      {...props}
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8">
            {sent ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold">Kiểm tra email của bạn</h1>
                <p className="text-sm text-muted-foreground">
                  Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt
                  lại mật khẩu. Vui lòng kiểm tra hộp thư (và thư mục spam).
                </p>
                <p className="text-xs text-muted-foreground">
                  Link sẽ hết hạn sau 1 giờ.
                </p>
                <a
                  href="/signin"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  Quay lại đăng nhập
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <a href="/" className="mx-auto block w-fit text-center">
                    <img src="/logo.svg" alt="Moji" />
                  </a>
                  <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
                  <p className="text-balance text-muted-foreground">
                    Nhập email đã đăng ký để nhận link đặt lại mật khẩu
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-3">
                    <label htmlFor="email" className="block text-sm">
                      Email
                    </label>
                    <Input
                      type="email"
                      id="email"
                      placeholder="you@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  Đã nhớ mật khẩu?{" "}
                  <a
                    href="/signin"
                    className="underline underline-offset-4"
                  >
                    Đăng nhập
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
