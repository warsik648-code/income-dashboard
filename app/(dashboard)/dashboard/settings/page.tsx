import { Settings } from "lucide-react"

import { SectionPage } from "@/components/layout/section-page"

export default function SettingsPage() {
  return (
    <SectionPage
      title="Settings"
      description="Manage your owner profile, preferred currency, and security preferences."
      icon={Settings}
      emptyTitle="Settings coming next"
      emptyDescription="Profile and preference controls will land here. Sign out is available from the sidebar."
    />
  )
}
