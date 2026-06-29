import * as React from "react";
import {
  BellIcon,
  FileImageIcon,
  FlagIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  MoonIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SunIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";

export type AdminSection =
  | "overview"
  | "users"
  | "stories"
  | "messages"
  | "groups"
  | "reports"
  | "notifications"
  | "media"
  | "admins"
  | "system";

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  reportCount?: number;
}

const initials = (name?: string) =>
  (name || "SA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const sections = [
  {
    label: "Tong quan",
    items: [
      { id: "overview" as const, label: "Dashboard", icon: LayoutDashboardIcon },
    ],
  },
  {
    label: "Quan ly",
    items: [
      { id: "users" as const, label: "Nguoi dung", icon: UsersIcon },
      { id: "messages" as const, label: "Tin nhan", icon: MessagesSquareIcon },
      { id: "groups" as const, label: "Nhom chat", icon: UsersRoundIcon },
      { id: "stories" as const, label: "Bai dang / Story", icon: ImagesIcon },
    ],
  },
  {
    label: "Kiem duyet",
    items: [
      { id: "reports" as const, label: "Bao cao vi pham", icon: FlagIcon },
      { id: "media" as const, label: "Media / File", icon: FileImageIcon },
    ],
  },
  {
    label: "He thong",
    items: [
      { id: "notifications" as const, label: "Thong bao", icon: BellIcon },
      { id: "admins" as const, label: "Quyen Admin", icon: ShieldIcon },
      { id: "system" as const, label: "Trang thai", icon: ShieldCheckIcon },
    ],
  },
];

const roleSections: Record<string, AdminSection[]> = {
  super_admin: sections.flatMap((group) => group.items.map((item) => item.id)),
  moderator: [
    "overview",
    "users",
    "stories",
    "messages",
    "groups",
    "reports",
    "media",
    "system",
  ],
  support: ["overview", "users", "system"],
};

export function AdminSidebar({
  activeSection,
  onSectionChange,
  reportCount = 0,
  ...props
}: AdminSidebarProps) {
  const { user, signOut } = useAuthStore();
  const [darkMode, setDarkMode] = React.useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const allowed =
    roleSections[user?.adminRole || "super_admin"] ?? roleSections.support;

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <Sidebar collapsible="offcanvas" className="admin-sidebar" {...props}>
      <SidebarHeader className="border-b p-0">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#534AB7] text-[#EEEDFE]">
            <MessageCircleIcon className="size-4" />
          </div>
          <span className="text-[15px] font-semibold">ChatAdmin</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-1">
        {sections.map((group) => {
          const items = group.items.filter((item) => allowed.includes(item.id));
          if (!items.length) return null;

          return (
            <SidebarGroup key={group.label} className="px-2 py-1">
              <SidebarGroupLabel className="h-7 px-2 text-[10px] font-medium uppercase tracking-[.08em] text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={activeSection === item.id}
                        className="h-9 rounded-md px-3 text-[13px] data-[active=true]:bg-[#EEEDFE] data-[active=true]:font-medium data-[active=true]:text-[#3C3489] dark:data-[active=true]:bg-[#534AB7]/25 dark:data-[active=true]:text-[#c9c5ff]"
                        onClick={() => onSectionChange(item.id)}
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                        {item.id === "reports" && reportCount > 0 && (
                          <span className="ml-auto rounded-full bg-[#E24B4A] px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {reportCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        <SidebarSeparator className="my-2" />
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-9 px-3 text-[13px]">
                  <Link to="/">
                    <MessageCircleIcon className="size-4" />
                    <span>Mo ung dung chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-9 px-3 text-[13px]"
                  onClick={toggleTheme}
                >
                  {darkMode ? <SunIcon /> : <MoonIcon />}
                  <span>{darkMode ? "Giao dien sang" : "Giao dien toi"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-md p-1">
          <Avatar size="sm">
            <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
            <AvatarFallback className="bg-[#EEEDFE] text-[#3C3489]">
              {initials(user?.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">
              {user?.displayName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {user?.adminRole || "Super Admin"}
            </p>
          </div>
          <Button size="icon-xs" variant="ghost" onClick={signOut}>
            <LogOutIcon />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
