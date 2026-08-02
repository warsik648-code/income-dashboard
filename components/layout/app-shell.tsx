"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

type AppShellProps = {
  user: {
    email?: string | null
    name?: string | null
  }
  children: React.ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset className="min-h-svh bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md md:px-6">
            <SidebarTrigger className="-ml-1 transition-transform duration-200" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight">
                Income Dashboard
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Secure personal workspace
              </p>
            </div>
          </header>
          <div className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl animate-in fade-in-0 duration-300">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
