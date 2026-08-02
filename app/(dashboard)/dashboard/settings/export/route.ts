import { auth } from "@/auth"
import { exportTransactionsCsv } from "@/lib/services/settings"
import { exportTransactionsSchema } from "@/lib/validations/settings"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = exportTransactionsSchema.safeParse({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
  })
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Invalid range", {
      status: 400,
    })
  }

  const csv = await exportTransactionsCsv(session.user.id, parsed.data)
  const filename = `transactions_${parsed.data.from}_${parsed.data.to}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
