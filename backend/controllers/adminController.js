const pool = require('../config/db')

exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, role FROM profiles WHERE is_deleted = false ORDER BY email ASC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

exports.getDeletedUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, role FROM profiles WHERE is_deleted = true ORDER BY email ASC')
    res.json(result.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

exports.getContacts = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, role FROM profiles WHERE role != $1 AND is_deleted = false ORDER BY email ASC', ['pending'])
    res.json(result.rows.filter(row => row.id !== req.user.id))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.updateUserFields = async (req, res) => {
  const { id } = req.params
  const { role, email } = req.body

  if (id === req.user.id && role !== 'admin') {
    return res.status(403).json({ error: 'Запрещено понижать собственную роль администратора' })
  }

  try {
    const result = await pool.query(
      'UPDATE profiles SET role = $1, email = $2 WHERE id = $3 RETURNING id, email, role',
      [role, email, id]
    )
    res.json(result.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
}

exports.deleteUser = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('UPDATE profiles SET is_deleted = true WHERE id = $1', [id])
    res.json({ success: true, message: 'Пользователь удален' })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

exports.restoreUser = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('UPDATE profiles SET is_deleted = false WHERE id = $1', [id])
    res.json({ success: true, message: 'Пользователь восстановлен' })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

exports.getLogs = async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 100)
    const result = await pool.query(
      `SELECT l.*, p.email AS user_email
       FROM logs l
       LEFT JOIN profiles p ON p.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT $1`,
      [limit]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}