import type { LucideIcon } from "lucide-react"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"

type SectionPageProps = {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  icon: LucideIcon
}

export function SectionPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
}: SectionPageProps) {
  return (
    <section>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
      />
    </section>
  )
}
