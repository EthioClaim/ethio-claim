const { Client } = require('pg');

const connStr = "postgresql://neondb_owner:npg_F9nHIWL2qApw@ep-sweet-art-b4c1g04y-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

async function testPg() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting with pg client...');
    await client.connect();
    console.log('Connected!');
    const res = await client.query('SELECT current_database(), current_user, count(*) from "User"');
    console.log('Query result:', res.rows);
    await client.end();
  } catch (e) {
    console.error('PG Error:', e.message);
  }
}

testPg();
