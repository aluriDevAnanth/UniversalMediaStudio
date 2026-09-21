import type { SchemaMigration } from "./types";

export const MIGRATIONS: SchemaMigration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          duration REAL NOT NULL,
          resolution TEXT NOT NULL,
          tags TEXT NOT NULL,
          bundle_path TEXT NOT NULL,
          created_at TEXT NOT NULL,
          play_count INTEGER DEFAULT 0,
          last_watched_at TEXT,
          file_size INTEGER
        );
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);`);

      db.run(`
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          video_ids TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS tag_metadata (
          tag TEXT PRIMARY KEY,
          color TEXT NOT NULL,
          category TEXT
        );
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS category_colors (
          category TEXT PRIMARY KEY,
          color TEXT NOT NULL
        );
      `);
    },
  },
];
