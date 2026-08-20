import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run all pending migrations
 */
async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get all migration files
    const migrationDir = __dirname;
    const files = fs
      .readdirSync(migrationDir)
      .filter((f) => f.match(/^\d+_.*\.js$/))
      .sort();

    console.log(`\n[Migrations] Found ${files.length} migration files`);

    for (const file of files) {
      const migrationName = file.replace('.js', '');
      
      // Check if already executed
      const result = await client.query(
        'SELECT id FROM migrations WHERE name = $1',
        [migrationName]
      );

      if (result.rows.length > 0) {
        console.log(`[Migrations] ✓ ${migrationName} (already executed)`);
        continue;
      }

      // Load and execute migration
      const migration = await import(`./${file}`);
      console.log(`[Migrations] → Executing ${migrationName}...`);

      try {
        await client.query('BEGIN');
        await client.query(migration.up);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );
        await client.query('COMMIT');
        console.log(`[Migrations] ✓ ${migrationName} (completed)`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrations] ✗ ${migrationName} failed:`, err.message);
        throw err;
      }
    }

    console.log('\n[Migrations] All migrations completed successfully!\n');
  } catch (err) {
    console.error('[Migrations] Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if executed directly
runMigrations().catch(console.error);
