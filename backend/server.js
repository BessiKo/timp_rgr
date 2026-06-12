require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const apiRoutes = require('./routes/api')
const pool = require('./config/db')

const app = express()

app.set('trust proxy', 1)

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

app.use(cookieParser())
app.use(express.json())

app.use('/api', apiRoutes)

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()')
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date() })
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', database: err.message })
  }
})

app.use((err, req, res) => {
  res.status(500).json({ error: 'Internal Server Error' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {})