import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SAFE_KEYS = new Set([
  "announcement", "heroEyebrow", "heroTitle", "heroCopy", "shippingThreshold",
  "loyaltyRate", "provider", "threeDSecure", "testMode", "bankTransfer",
  "cashOnDelivery", "installments",
]);

async function ensureSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS store_settings (id INTEGER PRIMARY KEY DEFAULT 1, payload TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at INTEGER NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, actor TEXT NOT NULL, metadata TEXT NOT NULL, created_at INTEGER NOT NULL)"),
  ]);
}

function sanitize(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => SAFE_KEYS.has(key)));
}

async function actorEmail() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-email") || (process.env.NODE_ENV === "development" ? "local-admin@lumera.test" : "");
}

export async function GET() {
  await ensureSchema();
  const row = await env.DB.prepare("SELECT payload, updated_at AS updatedAt FROM store_settings WHERE id = ?1").bind(1).first<{ payload: string; updatedAt: number }>();
  return NextResponse.json(row ? { settings: JSON.parse(row.payload), updatedAt: row.updatedAt } : { settings: null });
}

export async function PUT(request: Request) {
  const actor = await actorEmail();
  if (!actor) return NextResponse.json({ error: "Yönetici oturumu gerekli." }, { status: 401 });
  const body = sanitize(await request.json());
  const now = Date.now();
  await ensureSchema();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO store_settings (id, payload, updated_by, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_by = excluded.updated_by, updated_at = excluded.updated_at").bind(1, JSON.stringify(body), actor, now),
    env.DB.prepare("INSERT INTO audit_log (action, actor, metadata, created_at) VALUES (?1, ?2, ?3, ?4)").bind("store.settings.updated", actor, JSON.stringify({ keys: Object.keys(body) }), now),
  ]);
  return NextResponse.json({ ok: true, updatedAt: now });
}
