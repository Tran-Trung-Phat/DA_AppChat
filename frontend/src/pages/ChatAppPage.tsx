import { AppSidebar } from '@/components/sidebar/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import ChatWindowLayout from '@/components/chat/ChatWindowLayout';
import { Separator } from '@/components/ui/separator';


const ChatAppPage = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">Moji</span>
            <span className="truncate text-xs text-muted-foreground">
              Chat workspace
            </span>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 p-3">
          <ChatWindowLayout />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ChatAppPage
