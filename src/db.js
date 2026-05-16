require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);

async function query(text, params = []) {
  try {
    const result = await sql(text, params);
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    throw err;
  }
}

async function getCities() {
  return query('SELECT * FROM cities ORDER BY id');
}

async function getProjectsByCity(cityId) {
  return query('SELECT * FROM projects WHERE city_id = $1 ORDER BY id', [cityId]);
}

async function getProjectById(projectId) {
  const rows = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  return rows[0] || null;
}

async function getMediaByProject(projectId, mediaType) {
  return query(
    'SELECT * FROM project_media WHERE project_id = $1 AND media_type = $2',
    [projectId, mediaType]
  );
}

async function runSeed() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await sql(statement);
  }

  console.log('[DB] Seed complete.');
}

module.exports = { query, getCities, getProjectsByCity, getProjectById, getMediaByProject, runSeed };
