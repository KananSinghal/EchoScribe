import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    transcript: text("transcript").notNull(),
    audioKey: text("audio_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    wordCount: integer("word_count").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("notes_owner_created_idx").on(table.ownerId, table.createdAt),
    index("notes_owner_id_idx").on(table.ownerId, table.id),
  ],
);
