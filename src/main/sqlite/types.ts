import type { Database as SqlJsDatabase } from "sql.js";

export interface EncryptedVaultMeta {
  hasPassword: boolean;
  isUnlocked: boolean;
}

export interface SchemaMigration {
  version: number;
  name: string;
  up: (db: SqlJsDatabase) => void;
}
