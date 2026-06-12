const pool = require('../config/db')

exports.getBoilers = async (req, res) => {
  try {
    if (req.user.role === 'chief' || req.user.role === 'admin') {
      const result = await pool.query(`
        SELECT b.*,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'email', p.email)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as operators
        FROM boilers b
        LEFT JOIN operator_assignments oa ON b.id = oa.boiler_id
        LEFT JOIN profiles p ON oa.operator_id = p.id
        WHERE b.is_deleted = FALSE
        GROUP BY b.id
        ORDER BY b.id ASC
      `)
      return res.json(result.rows)
    } else {
      const result = await pool.query(`
        SELECT b.*
        FROM boilers b
        JOIN operator_assignments oa ON b.id = oa.boiler_id
        WHERE oa.operator_id = $1 AND b.is_deleted = FALSE
        ORDER BY b.id ASC
      `, [req.user.id])
      return res.json(result.rows)
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.createBoiler = async (req, res) => {
  const { name, type, max_pressure, network_address } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO boilers (name, type, max_pressure, network_address) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, type, max_pressure, network_address]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.updateBoiler = async (req, res) => {
  const { id } = req.params
  const { name, type, max_pressure, network_address, is_blocked } = req.body
  try {
    if (is_blocked !== undefined) {
       const result = await pool.query('UPDATE boilers SET is_blocked = $1 WHERE id = $2 RETURNING *', [is_blocked, id])
       return res.json(result.rows[0])
    }
    const result = await pool.query(
      'UPDATE boilers SET name = $1, type = $2, max_pressure = $3, network_address = $4 WHERE id = $5 RETURNING *',
      [name, type, max_pressure, network_address, id]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.deleteBoiler = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('UPDATE boilers SET is_deleted = TRUE WHERE id = $1', [id])
    await pool.query('DELETE FROM operator_assignments WHERE boiler_id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.getDeletedBoilers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM boilers WHERE is_deleted = TRUE ORDER BY id ASC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.restoreBoiler = async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query('UPDATE boilers SET is_deleted = FALSE WHERE id = $1 RETURNING *', [id])
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.getAssignments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM operator_assignments')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.assignOperator = async (req, res) => {
  const { operator_id, boiler_id } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO operator_assignments (operator_id, boiler_id) VALUES ($1, $2) RETURNING *',
      [operator_id, boiler_id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.removeAssignment = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM operator_assignments WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.getStopRequests = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stop_requests')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.createStopRequest = async (req, res) => {
  const { boilerId, reason } = req.body
  try {
    const result = await pool.query(
      "INSERT INTO stop_requests (boiler_id, operator_id, reason, status) VALUES ($1, $2, $3, 'pending') RETURNING *",
      [boilerId, req.user.id, reason]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.deleteStopRequest = async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM stop_requests WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
