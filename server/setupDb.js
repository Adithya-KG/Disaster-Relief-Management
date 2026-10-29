import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupDatabase() {
  const schemaPath = path.resolve(__dirname, '../database/schema.sql');
  const triggersPath = path.resolve(__dirname, '../database/triggers.sql');
  const seedPath = path.resolve(__dirname, '../database/seed.sql');

  console.log('--- Initializing Disaster Relief Database ---');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  console.log('✓ Executed schema.sql (tables created)');

  const triggersSql = fs.readFileSync(triggersPath, 'utf8');
  db.exec(triggersSql);
  console.log('✓ Executed triggers.sql (triggers created)');

  const seedSql = fs.readFileSync(seedPath, 'utf8');
  db.exec(seedSql);
  console.log('✓ Executed seed.sql (seed data inserted)');

  // Print summary of seeded tables
  const tables = [
    'Relief_Camp',
    'Supply_Hub',
    'Inventory',
    'Volunteer',
    'Request',
    'Dispatch',
    'Dispatch_Item',
    'Camp_Inventory',
    'App_User',
  ];

  console.log('\nDatabase Record Counts:');
  for (const table of tables) {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    console.log(`  - ${table}: ${row.count} records`);
  }

  console.log('\nDatabase setup complete!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupDatabase();
}
