// Drizzle representation of the learner tables. Auth-user foreign keys and RLS
// policies are maintained in the SQL migration because auth.users is managed by Supabase.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  vehicle: text("vehicle").notNull().default("light"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    questionId: text("question_id").notNull(),
    category: integer("category").notNull(),
    correct: boolean("correct").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("question_attempts_user_created_idx").on(table.userId, table.createdAt)],
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
  (table) => [index("test_attempts_user_created_idx").on(table.userId, table.createdAt)],
);
