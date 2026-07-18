import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const storeSettings = sqliteTable("store_settings", {
  id: integer("id").primaryKey().default(1),
  payload: text("payload").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  metadata: text("metadata").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
