import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listAuditLogs } from "@/lib/services/audit-query"
import { formatAppDateTime } from "@/lib/time"

export default async function AuditPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const logs = await listAuditLogs(session.user.id, { limit: 150 })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Recent changes to your financial data. Linked payment edits are blocked; archives keep ledger history."
      />

      <Card className="border-border/70 bg-card/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base tracking-tight">
            Latest activity
          </CardTitle>
          <CardDescription>
            Showing up to 150 newest events for this owner account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{log.action}</Badge>
                      <Badge variant="secondary">{log.entityType}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.entityId.slice(0, 10)}…
                      </span>
                    </div>
                    {log.reason ? (
                      <p className="text-sm text-muted-foreground">{log.reason}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{formatAppDateTime(log.createdAt)}</p>
                    {log.ipAddress ? <p>IP {log.ipAddress}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
