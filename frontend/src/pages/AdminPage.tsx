import * as React from "react";
import {
  ActivityIcon,
  BellIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  FlagIcon,
  ImagesIcon,
  LockIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UnlockIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar, type AdminSection } from "@/components/admin/AdminSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import {
  adminService,
  type AdminPagination,
  type AdminStats,
} from "@/services/adminService";
import { useAuthStore } from "@/stores/useAuthStore";
import type { User } from "@/types/user";

interface AdminMessage {
  _id: string;
  content?: string;
  type?: string;
  createdAt: string;
  deletedAt?: string;
  senderId?: { displayName?: string; username?: string; avatarUrl?: string };
}

interface AdminGroup {
  _id: string;
  group?: { name?: string; createdBy?: { displayName?: string } };
  participants: Array<{
    joinedAt?: string;
    userId?: { _id?: string; displayName?: string; username?: string };
  }>;
  status?: "active" | "locked" | "deleted";
  lockedReason?: string;
  createdAt?: string;
}

interface AdminReport {
  _id: string;
  targetType: string;
  reason: string;
  severity: string;
  status: string;
  internalNote?: string;
  resolution?: string;
  createdAt: string;
  reporterId?: { displayName?: string; username?: string };
}

interface AdminNotification {
  _id: string;
  title: string;
  content: string;
  audience: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

interface AdminMedia {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: "image" | "file";
  messageId: string;
  createdAt: string;
  sender?: { displayName?: string };
}

interface AdminAudit {
  _id: string;
  action: string;
  targetType: string;
  detail?: string;
  createdAt: string;
  adminId?: { displayName?: string; username?: string; avatarUrl?: string };
}

const emptyPagination: AdminPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

const initials = (name?: string) =>
  (name || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Khong ro";

const formatBytes = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return "Khong the thuc hien thao tac";
};

function MiniChart({
  data,
  type = "line",
}: {
  data: Array<{ label: string; value: number }>;
  type?: "line" | "bar";
}) {
  const values = data.length ? data : [{ label: "-", value: 0 }];
  const max = Math.max(...values.map((item) => item.value), 1);

  if (type === "bar") {
    return (
      <div className="flex h-44 items-end gap-1.5 pt-4">
        {values.slice(-16).map((item) => (
          <div key={item.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-primary/70 transition hover:bg-primary"
              style={{ height: `${Math.max((item.value / max) * 130, 4)}px` }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="hidden text-[9px] text-muted-foreground xl:block">
              {item.label.slice(0, 2)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const points = values
    .map((item, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 92 - (item.value / max) * 78;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-44 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="adminChart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,100 ${points} 100,100`}
        fill="url(#adminChart)"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const AdminPage = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [section, setSection] = React.useState<AdminSection>("overview");
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);
  const [pagination, setPagination] = React.useState(emptyPagination);
  const [messages, setMessages] = React.useState<AdminMessage[]>([]);
  const [groups, setGroups] = React.useState<AdminGroup[]>([]);
  const [reports, setReports] = React.useState<AdminReport[]>([]);
  const [notifications, setNotifications] = React.useState<AdminNotification[]>([]);
  const [media, setMedia] = React.useState<AdminMedia[]>([]);
  const [storageBytes, setStorageBytes] = React.useState(0);
  const [audits, setAudits] = React.useState<AdminAudit[]>([]);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: "user" | "message" | "group";
    id: string;
    active?: boolean;
    status?: string;
    label: string;
  } | null>(null);
  const [reason, setReason] = React.useState("");
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);
  const [notificationForm, setNotificationForm] = React.useState({
    title: "",
    content: "",
    link: "",
    audience: "all",
    scheduledAt: "",
  });

  const loadCore = React.useCallback(async () => {
    const [nextStats, userData] = await Promise.all([
      adminService.getStats(),
      adminService.getUsers(1, "", {}),
    ]);
    setStats(nextStats);
    setUsers(userData.users);
    setPagination(userData.pagination);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([adminService.getStats(), adminService.getUsers(1, "", {})])
      .then(([nextStats, userData]) => {
        if (cancelled) return;
        setStats(nextStats);
        setUsers(userData.users);
        setPagination(userData.pagination);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSection = React.useCallback(async (target: AdminSection) => {
    try {
      setLoading(true);
      if (target === "messages") {
        const data = await adminService.getMessages(1, query);
        setMessages(data.messages);
      }
      if (target === "groups") setGroups(await adminService.getGroups());
      if (target === "reports") setReports(await adminService.getReports());
      if (target === "notifications") {
        setNotifications(await adminService.getNotifications());
      }
      if (target === "media") {
        const data = await adminService.getMedia();
        setMedia(data.media);
        setStorageBytes(data.storage.totalBytes);
      }
      if (target === "admins") setAudits(await adminService.getAudits());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [query]);

  const changeSection = (nextSection: AdminSection) => {
    setSection(nextSection);
    if (!["overview", "users", "stories", "system"].includes(nextSection)) {
      void loadSection(nextSection);
    }
  };

  const searchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const data = await adminService.getUsers(page, query, {
        status: statusFilter || undefined,
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    try {
      setLoading(true);
      if (confirmAction.type === "user") {
        await adminService.updateUser(confirmAction.id, {
          isActive: !confirmAction.active,
          reason,
        });
        await searchUsers(pagination.page);
      }
      if (confirmAction.type === "message") {
        await adminService.deleteMessage(confirmAction.id, reason);
        await loadSection("messages");
      }
      if (confirmAction.type === "group") {
        await adminService.updateGroup(
          confirmAction.id,
          confirmAction.status || "locked",
          reason
        );
        await loadSection("groups");
      }
      setStats(await adminService.getStats());
      toast.success("Thao tac da duoc cap nhat");
      setConfirmAction(null);
      setReason("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = () => {
    const rows = [
      ["ID", "Ten", "Username", "Email", "Trang thai", "Vai tro", "Tin nhan"],
      ...users.map((user) => [
        user._id,
        user.displayName,
        user.username,
        user.email,
        user.isActive ? "active" : "banned",
        user.role,
        String(user.messageCount ?? 0),
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "moji-users.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const sectionMeta: Record<AdminSection, [string, string]> = {
    overview: ["Dashboard thong ke", "Tong quan realtime ve he thong Moji"],
    users: ["Quan ly nguoi dung", "Tai khoan, ho so va lich su hoat dong"],
    stories: ["Quan ly Story", "Kiem duyet bai dang va noi dung ngan"],
    messages: ["Quan ly tin nhan", "Kiem tra va xu ly noi dung vi pham"],
    groups: ["Quan ly nhom chat", "Nhom, thanh vien va trang thai hoat dong"],
    reports: ["Bao cao vi pham", "Hang doi report thong nhat"],
    notifications: ["Thong bao he thong", "Soan, len lich va xem lich su"],
    media: ["Media va file", "Thu vien tep da tai len he thong"],
    admins: ["Quyen quan tri", "Vai tro admin va lich su thao tac"],
    system: ["Trang thai he thong", "Dich vu cot loi cua Moji"],
  };

  const statsCards = [
    ["Nguoi dung", stats?.totalUsers ?? 0, UsersIcon, "text-violet-600 bg-violet-500/10"],
    ["Dang online", stats?.onlineUsers ?? 0, ActivityIcon, "text-emerald-600 bg-emerald-500/10"],
    ["Tin nhan", stats?.totalMessages ?? 0, MessageCircleIcon, "text-blue-600 bg-blue-500/10"],
    ["Nhom hoat dong", stats?.activeGroups ?? 0, UsersRoundIcon, "text-cyan-600 bg-cyan-500/10"],
    ["Report chua xu ly", stats?.unresolvedReports ?? 0, FlagIcon, "text-red-600 bg-red-500/10"],
  ] as const;

  const usersView = (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Danh sach nguoi dung</CardTitle>
            <CardDescription>{pagination.total} tai khoan</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportUsers}>
            <DownloadIcon /> Xuat CSV
          </Button>
        </div>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            searchUsers(1);
          }}
        >
          <div className="relative min-w-64 flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tim theo ten, email, username hoac ID"
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border bg-background px-3 text-sm"
          >
            <option value="">Tat ca trang thai</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <Button type="submit">Loc du lieu</Button>
        </form>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nguoi dung</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3">Ngay tao</th>
                <th className="px-4 py-3">Tin nhan</th>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3 text-right">Hanh dong</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "outline" : "destructive"}>
                      {user.isActive ? "Active" : "Banned"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">{user.messageCount ?? 0}</td>
                  <td className="px-4 py-3">{user.reportCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            setDetail(await adminService.getUserDetail(user._id));
                          } catch (error) {
                            toast.error(getErrorMessage(error));
                          }
                        }}
                      >
                        <EyeIcon />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={user._id === currentUser?._id}
                        onClick={() =>
                          setConfirmAction({
                            type: "user",
                            id: user._id,
                            active: user.isActive,
                            label: user.isActive ? "Khoa tai khoan" : "Mo khoa tai khoan",
                          })
                        }
                      >
                        {user.isActive ? <LockIcon /> : <UnlockIcon />}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost">
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={user._id === currentUser?._id}
                            onSelect={async () => {
                              try {
                                await adminService.updateUser(user._id, {
                                  role: user.role === "admin" ? "user" : "admin",
                                  adminRole: "moderator",
                                });
                                toast.success("Da cap nhat quyen");
                                searchUsers(pagination.page);
                              } catch (error) {
                                toast.error(getErrorMessage(error));
                              }
                            }}
                          >
                            <ShieldCheckIcon />
                            {user.role === "admin" ? "Thu hoi admin" : "Cap Moderator"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => searchUsers(pagination.page - 1)}
            >
              Truoc
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => searchUsers(pagination.page + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <SidebarProvider
      className="admin-panel"
      style={
        {
          "--sidebar-width": "220px",
        } as React.CSSProperties
      }
    >
      <AdminSidebar
        activeSection={section}
        onSectionChange={changeSection}
        reportCount={stats?.unresolvedReports ?? 0}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b bg-background px-5">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0">
            <h1 className="truncate text-[13px] font-medium text-muted-foreground">
              {sectionMeta[section][0]}
            </h1>
          </div>
          <div className="ml-4 hidden w-[360px] lg:block">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tim kiem toan he thong..."
                className="h-8 rounded-md bg-muted/60 pl-9 text-xs"
              />
            </div>
          </div>
          <div className="ml-auto" />
          <Button size="icon-sm" variant="ghost" className="relative">
            <BellIcon />
            {(stats?.unresolvedReports ?? 0) > 0 && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500" />
            )}
          </Button>
          <Avatar size="sm">
            <AvatarImage src={currentUser?.avatarUrl} />
            <AvatarFallback>{initials(currentUser?.displayName)}</AvatarFallback>
          </Avatar>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                await loadCore();
                await loadSection(section);
              } finally {
                setLoading(false);
              }
            }}
          >
            <RefreshCwIcon className={loading ? "animate-spin" : ""} />
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-muted/35 p-5">
          <div className="mx-auto max-w-[1500px] space-y-4">
            <div>
              <h2 className="text-lg font-medium">{sectionMeta[section][0]}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sectionMeta[section][1]}
              </p>
            </div>
            {section === "overview" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {statsCards.map(([label, value, Icon, color]) => (
                    <Card key={label}>
                      <CardContent className="p-4">
                        <div className={`mb-3 flex size-10 items-center justify-center rounded-xl ${color}`}>
                          <Icon className="size-5" />
                        </div>
                        <p className="text-2xl font-bold">{value}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <Badge variant="outline" className="text-[10px]">Realtime</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Nguoi dung hoat dong</CardTitle>
                        <div className="flex rounded-md bg-muted p-0.5 text-[10px]">
                          <span className="rounded bg-background px-2 py-1 font-medium">
                            7 ngay
                          </span>
                          <span className="px-2 py-1 text-muted-foreground">
                            30 ngay
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <MiniChart data={stats?.userTrend ?? []} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Phan loai vi pham</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                      <div
                        className="relative flex size-32 items-center justify-center rounded-full"
                        style={{
                          background:
                            "conic-gradient(#534AB7 0 40%, #E24B4A 40% 70%, #EF9F27 70% 90%, #888780 90% 100%)",
                        }}
                      >
                        <div className="size-20 rounded-full bg-card" />
                        <span className="absolute text-lg font-semibold">
                          {stats?.unresolvedReports ?? 0}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                        {[
                          ["#534AB7", "Spam 40%"],
                          ["#E24B4A", "Noi dung 30%"],
                          ["#EF9F27", "Quay roi 20%"],
                          ["#888780", "Khac 10%"],
                        ].map(([color, label]) => (
                          <span key={label} className="flex items-center gap-1">
                            <i
                              className="size-2 rounded-sm"
                              style={{ backgroundColor: color }}
                            />
                            {label}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Tin nhan theo gio trong ngay</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MiniChart data={stats?.messageTrend ?? []} type="bar" />
                  </CardContent>
                </Card>
                {usersView}
              </>
            )}

            {section === "users" && usersView}

            {section === "stories" && (
              <Card>
                <CardContent className="flex min-h-96 flex-col items-center justify-center text-center">
                  <ImagesIcon className="mb-4 size-14 text-muted-foreground" />
                  <CardTitle>Module Story chua duoc kich hoat</CardTitle>
                  <CardDescription className="mt-2 max-w-lg">
                    Ung dung Moji hien chua co model va chuc nang Story. Giao dien
                    kiem duyet da san sang de ket noi khi module Story duoc xay dung.
                  </CardDescription>
                </CardContent>
              </Card>
            )}

            {section === "messages" && (
              <Card>
                <CardHeader>
                  <CardTitle>Dong thoi gian tin nhan</CardTitle>
                  <CardDescription>Noi dung gan day trong he thong</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messages.map((message) => (
                    <div key={message._id} className="flex gap-3">
                      <Avatar size="sm">
                        <AvatarImage src={message.senderId?.avatarUrl} />
                        <AvatarFallback>{initials(message.senderId?.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {message.senderId?.displayName || "Nguoi dung"}
                          </span>
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                        <div className="inline-block max-w-2xl rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                          {message.deletedAt ? (
                            <span className="italic text-muted-foreground">Tin nhan da bi xoa</span>
                          ) : (
                            message.content || `[${message.type || "file"}]`
                          )}
                        </div>
                      </div>
                      {!message.deletedAt && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setConfirmAction({
                              type: "message",
                              id: message._id,
                              label: "Xoa tin nhan vi pham",
                            })
                          }
                        >
                          <Trash2Icon /> Xoa
                        </Button>
                      )}
                    </div>
                  ))}
                  {!messages.length && <p className="text-sm text-muted-foreground">Chua co du lieu.</p>}
                </CardContent>
              </Card>
            )}

            {section === "groups" && (
              <Card>
                <CardHeader>
                  <CardTitle>Danh sach nhom chat</CardTitle>
                  <CardDescription>{groups.length} nhom trong he thong</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {groups.map((group) => (
                    <details key={group._id} className="rounded-xl border p-4">
                      <summary className="flex cursor-pointer list-none items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <UsersRoundIcon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{group.group?.name || "Nhom khong ten"}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.participants.length} thanh vien · Tao {formatDate(group.createdAt)}
                          </p>
                        </div>
                        <Badge variant={group.status === "locked" ? "destructive" : "outline"}>
                          {group.status || "active"}
                        </Badge>
                        <Button
                          size="sm"
                          variant={group.status === "locked" ? "default" : "destructive"}
                          onClick={(event) => {
                            event.preventDefault();
                            setConfirmAction({
                              type: "group",
                              id: group._id,
                              status: group.status === "locked" ? "active" : "locked",
                              label: group.status === "locked" ? "Mo khoa nhom" : "Khoa nhom",
                            });
                          }}
                        >
                          {group.status === "locked" ? <UnlockIcon /> : <LockIcon />}
                        </Button>
                      </summary>
                      <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-2">
                        {group.participants.map((participant) => (
                          <div key={participant.userId?._id} className="rounded-lg bg-muted/50 p-2 text-sm">
                            {participant.userId?.displayName || "Thanh vien"} ·{" "}
                            <span className="text-muted-foreground">
                              {formatDate(participant.joinedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </CardContent>
              </Card>
            )}

            {section === "reports" && (
              <div className="grid gap-4 xl:grid-cols-3">
                {[
                  ["new", "Moi"],
                  ["reviewing", "Dang xu ly"],
                  ["resolved", "Da xu ly"],
                ].map(([status, label]) => (
                  <Card key={status}>
                    <CardHeader>
                      <CardTitle>{label}</CardTitle>
                      <CardDescription>
                        {reports.filter((report) => report.status === status).length} report
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {reports
                        .filter((report) => report.status === status)
                        .map((report) => (
                          <div key={report._id} className="rounded-xl border p-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">{report.targetType}</Badge>
                              <Badge variant={report.severity === "critical" ? "destructive" : "secondary"}>
                                {report.severity}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm font-medium">{report.reason}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {report.reporterId?.displayName || "He thong"} · {formatDate(report.createdAt)}
                            </p>
                            <div className="mt-3 flex gap-2">
                              {status === "new" && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await adminService.updateReport(report._id, { status: "reviewing" });
                                    loadSection("reports");
                                  }}
                                >
                                  Tiep nhan
                                </Button>
                              )}
                              {status === "reviewing" && (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await adminService.updateReport(report._id, {
                                      status: "resolved",
                                      resolution: "Da xu ly boi admin",
                                    });
                                    loadSection("reports");
                                  }}
                                >
                                  Hoan tat
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {section === "notifications" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Soan thong bao</CardTitle>
                    <CardDescription>Gui ngay hoac len lich thong bao he thong</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Tieu de"
                      value={notificationForm.title}
                      onChange={(event) =>
                        setNotificationForm((form) => ({ ...form, title: event.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Noi dung thong bao..."
                      className="min-h-36"
                      value={notificationForm.content}
                      onChange={(event) =>
                        setNotificationForm((form) => ({ ...form, content: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Link dinh kem (tuy chon)"
                      value={notificationForm.link}
                      onChange={(event) =>
                        setNotificationForm((form) => ({ ...form, link: event.target.value }))
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        className="h-9 rounded-lg border bg-background px-3 text-sm"
                        value={notificationForm.audience}
                        onChange={(event) =>
                          setNotificationForm((form) => ({ ...form, audience: event.target.value }))
                        }
                      >
                        <option value="all">Tat ca nguoi dung</option>
                        <option value="active">Nguoi dung active</option>
                        <option value="admins">Quan tri vien</option>
                      </select>
                      <Input
                        type="datetime-local"
                        value={notificationForm.scheduledAt}
                        onChange={(event) =>
                          setNotificationForm((form) => ({ ...form, scheduledAt: event.target.value }))
                        }
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          await adminService.createNotification(notificationForm);
                          toast.success("Da tao thong bao");
                          setNotificationForm({
                            title: "",
                            content: "",
                            link: "",
                            audience: "all",
                            scheduledAt: "",
                          });
                          loadSection("notifications");
                        } catch (error) {
                          toast.error(getErrorMessage(error));
                        }
                      }}
                    >
                      <SendIcon /> Gui thong bao
                    </Button>
                  </CardContent>
                </Card>
                <div className="space-y-5">
                  <Card>
                    <CardHeader><CardTitle>Xem truoc</CardTitle></CardHeader>
                    <CardContent>
                      <div className="rounded-2xl border bg-background p-4 shadow-soft">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <BellIcon className="size-5" />
                          </div>
                          <div>
                            <p className="font-medium">{notificationForm.title || "Tieu de thong bao"}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {notificationForm.content || "Noi dung se hien thi tai day."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Lich su</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {notifications.slice(0, 8).map((item) => (
                        <div key={item._id} className="rounded-lg border p-3">
                          <div className="flex justify-between gap-2">
                            <p className="font-medium">{item.title}</p>
                            <Badge variant="outline">{item.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.sentAt || item.scheduledAt || item.createdAt)}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {section === "media" && (
              <>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-6 p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">Tong dung luong</p>
                      <p className="text-2xl font-bold">{formatBytes(storageBytes)}</p>
                    </div>
                    <div className="h-2 min-w-52 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[35%] rounded-full bg-primary" />
                    </div>
                    <Badge variant="outline">{media.length} tep</Badge>
                  </CardContent>
                </Card>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {media.map((item) => (
                    <Card key={`${item.messageId}-${item.url}`} className="pt-0">
                      {item.kind === "image" ? (
                        <img src={item.url} alt={item.originalName} className="h-40 w-full object-cover" />
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-muted">
                          <FileIcon className="size-12 text-muted-foreground" />
                        </div>
                      )}
                      <CardContent>
                        <p className="truncate font-medium">{item.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(item.size)} · {item.sender?.displayName || "Nguoi dung"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {section === "admins" && (
              <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Tai khoan quan tri</CardTitle>
                    <CardDescription>Super Admin / Moderator / Support</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {users.filter((user) => user.role === "admin").map((user) => (
                      <div key={user._id} className="flex items-center gap-3 rounded-xl border p-3">
                        <Avatar size="sm">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge>{user.adminRole || "super_admin"}</Badge>
                      </div>
                    ))}
                    <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                      Super Admin co toan quyen. Moderator xu ly noi dung va report.
                      Support xem user va ho tro tai khoan.
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Audit trail</CardTitle>
                    <CardDescription>100 thao tac quan tri gan nhat</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {audits.map((audit) => (
                      <div key={audit._id} className="flex gap-3 border-b pb-3 last:border-0">
                        <Avatar size="sm">
                          <AvatarImage src={audit.adminId?.avatarUrl} />
                          <AvatarFallback>{initials(audit.adminId?.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm">
                            <strong>{audit.adminId?.displayName || "Admin"}</strong>{" "}
                            {audit.action} · {audit.targetType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {audit.detail || "Khong co ghi chu"} · {formatDate(audit.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === "system" && (
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["MongoDB", "Co so du lieu", DatabaseIcon],
                  ["Express API", "Xu ly nghiep vu", ActivityIcon],
                  ["Socket.IO", "Ket noi realtime", MessageCircleIcon],
                ].map(([name, detailText, Icon]) => (
                  <Card key={String(name)}>
                    <CardHeader>
                      <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle>{String(name)}</CardTitle>
                      <CardDescription>{String(detailText)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2Icon className="size-4" /> Dang hoat dong
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.label}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Day la thao tac quan trong. Vui long nhap ly do de luu vao audit log.
          </p>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ly do xu ly..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Huy</Button>
            <Button variant="destructive" onClick={executeConfirmedAction} disabled={!reason.trim()}>
              Xac nhan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Ho so chi tiet nguoi dung</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <pre className="overflow-auto rounded-xl bg-muted p-4 text-xs">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminPage;
