import { auth } from "@/auth"
import { exportTransactionsCsv } from "@/lib/services/settings"
import { exportTransactionsSchema } from "@/lib/validations/settings"

async function handleExport(request: Request) {
  const session = await auth()
  const userId = session?.user?.id?.trim()
  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  let from = ""
  let to = ""

  if (request.method === "POST") {
    const formData = await request.formData()
    from = String(formData.get("from") ?? "")
    to = String(formData.get("to") ?? "")
  } else {
    // GET disabled — prevent drive-by CSV download via cookie + crafted link.
    return new Response("Method Not Allowed. Use the Settings export form.", {
      status: 405,
      headers: { Allow: "POST" },
    })
  }

  const parsed = exportTransactionsSchema.safeParse({ from, to })
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Invalid range", {
      status: 400,
    })
  }

  const csv = await exportTransactionsCsv(userId, parsed.data)
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

export async function POST(request: Request) {
  return handleExport(request)
}

export async function GET(request: Request) {
  return handleExport(request)
}
