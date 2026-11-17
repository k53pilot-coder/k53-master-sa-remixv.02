// Drizzle representation of the learner tables. Auth-user foreign keys and RLS
// policies are maintained in the SQL migration because auth.users is managed by Supabase.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull().default(""),
    vehicle: text("vehicle").notNull().default("light"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("profiles_vehicle_check", sql`${table.vehicle} in ('light', 'heavy', 'motorcycle')`),
  ],
);

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    questionId: text("question_id").notNull(),
    category: smallint("category").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("question_attempts_user_created_at_idx").on(table.userId, table.createdAt),
    check("question_attempts_question_id_check", sql`char_length(${table.questionId}) <= 100`),
    check("question_attempts_category_check", sql`${table.category} between 0 and 7`),
  ],
);

export const testAttempts = pgTable(
  "test_attempts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    mode: text("mode").notNull(),
    results: jsonb("results").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("test_attempts_user_created_at_idx").on(table.userId, table.createdAt),
    check("test_attempts_mode_check", sql`${table.mode} in ('practice', 'mock')`),
  ],
);
