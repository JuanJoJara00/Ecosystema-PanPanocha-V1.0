import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
    schema: './electron/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    driver: 'better-sqlite', // Using better-sqlite3 for migrations
    dbCredentials: {
        url: process.env.DATABASE_URL || 'pos-main-v2.db',
    },
    verbose: true,
    strict: true,
} satisfies Config;
