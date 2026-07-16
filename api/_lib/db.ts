import { neon } from '@neondatabase/serverless';

export type Sql = ReturnType<typeof neon>;

let schemaReady: Promise<void> | null = null;

export const getSql = (): Sql => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not configured');
  }
  return neon(databaseUrl);
};

export const ensureSchema = (sql: Sql): Promise<void> => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS app_users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE NOT NULL,
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS user_backups (
          user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
          payload jsonb NOT NULL,
          client_created_at timestamptz,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
};
