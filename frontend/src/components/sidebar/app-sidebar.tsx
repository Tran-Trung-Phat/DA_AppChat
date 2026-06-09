
import * as React from "react"


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Moon, Sun } from "lucide-react"




export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      {/* header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className='bg-gradient-primary'>
              <a href="#" className="flex w-full items-center justify-between">
                <h1 className="text-xl font-bold text-white">Moji</h1>
                <div className="flex items-center gap-2">
                  <Sun className="size-4 text-white/80"/>
                  <Switch
                  checked={true}
                  onCheckedChange={() =>{}}
                  className="data-[state=checked]:bg-background/80"
                  />
                  <Moon className="size-4 text-white/80"/>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* content */}
      <SidebarContent>
        
      </SidebarContent>

      {/* footer */}
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
    </Sidebar>
  )
}
