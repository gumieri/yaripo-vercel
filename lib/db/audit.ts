import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"

export async function logAudit(params: {
  userId?: string | null
  action: string
  resourceType: string
  resourceId: string
  oldValues?: unknown
  newValues?: unknown
}) {
  await db.insert(auditLogs).values({
    userId: params.userId ?? null,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    oldValues: params.oldValues ? JSON.parse(JSON.stringify(params.oldValues)) : null,
    newValues: params.newValues ? JSON.parse(JSON.stringify(params.newValues)) : null,
  })
}
