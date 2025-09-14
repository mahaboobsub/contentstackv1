import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // response time, content references, etc.
  timestamp: timestamp("timestamp").defaultNow(),
});

export const contentGaps = pgTable("content_gaps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  frequency: integer("frequency").default(1),
  priority: text("priority").notNull(), // 'high' | 'medium' | 'low'
  suggestedContentType: text("suggested_content_type"),
  status: text("status").default("detected"), // 'detected' | 'draft_created' | 'published'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").defaultNow(),
  totalQueries: integer("total_queries").default(0),
  averageResponseTime: integer("average_response_time").default(0),
  successRate: integer("success_rate").default(0), // percentage * 100
  contentGapsCount: integer("content_gaps_count").default(0),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  sessionId: true,
  userId: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  sessionId: true,
  role: true,
  content: true,
  metadata: true,
});

export const insertContentGapSchema = createInsertSchema(contentGaps).pick({
  query: true,
  frequency: true,
  priority: true,
  suggestedContentType: true,
  status: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertContentGap = z.infer<typeof insertContentGapSchema>;
export type ContentGap = typeof contentGaps.$inferSelect;

export type Analytics = typeof analytics.$inferSelect;
