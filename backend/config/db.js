const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
})

pool.on('error', (err) => {
  console.error('Ошибка пула подключений:', err)
})

module.exports = pool