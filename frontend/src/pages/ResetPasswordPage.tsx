import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import { toast } from "sonner";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [success, setSuccess] = React.useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token || !email) {
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
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold">Link không hợp lệ</h1>
                <p className="text-sm text-muted-foreground">
                  Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
                </p>
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  Yêu cầu link mới
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await authService.resetPassword(token, email, data.newPassword);
      setSuccess(true);
      toast.success("Đặt lại mật khẩu thành công");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Không thể đặt lại mật khẩu. Vui lòng thử lại"
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
            {success ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold">
                  Đặt lại mật khẩu thành công
                </h1>
                <p className="text-sm text-muted-foreground">
                  Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với
                  mật khẩu mới.
                </p>
                <Button onClick={() => navigate("/signin")} className="w-full">
                  Đi đến trang đăng nhập
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <a href="/" className="mx-auto block w-fit text-center">
                    <img src="/logo.svg" alt="Moji" />
                  </a>
                  <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
                  <p className="text-balance text-muted-foreground">
                    Nhập mật khẩu mới cho tài khoản{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-3">
                    <label htmlFor="newPassword" className="block text-sm">
                      Mật khẩu mới
                    </label>
                    <Input
                      type="password"
                      id="newPassword"
                      placeholder="Ít nhất 6 ký tự"
                      {...register("newPassword")}
                    />
                    {errors.newPassword && (
                      <p className="text-sm text-destructive">
                        {errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <label htmlFor="confirmPassword" className="block text-sm">
                      Xác nhận mật khẩu mới
                    </label>
                    <Input
                      type="password"
                      id="confirmPassword"
                      placeholder="Nhập lại mật khẩu"
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  <a
                    href="/signin"
                    className="underline underline-offset-4"
                  >
                    Quay lại đăng nhập
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
