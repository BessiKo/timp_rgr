const pool = require('../config/db')
const ApiError = require('../utils/ApiError')

exports.getUsers = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
  try {
    const result = await pool.query('SELECT id, email, role FROM profiles WHERE is_deleted = false ORDER BY email ASC')
    res.json(result.rows)
  } catch (err) { next(err) }
}

exports.getDeletedUsers = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
  try {
    const result = await pool.query('SELECT id, email, role FROM profiles WHERE is_deleted = true ORDER BY email ASC')
    res.json(result.rows)
  } catch (err) { next(err) }
}

exports.getContacts = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
  try {
    const result = await pool.query('SELECT id, email, role FROM profiles WHERE role != $1 AND is_deleted = false ORDER BY email ASC', ['pending'])
    res.json(result.rows.filter(row => row.id !== req.user.id))
  } catch (err) { next(err) }
}

exports.updateUserFields = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
  const { id } = req.params
  const { role, email } = req.body

  try {
    if (id === req.user.id && role !== 'admin') {
      throw ApiError.Forbidden('Запрещено понижать собственную роль администратора')
    }

    const result = await pool.query(
      'UPDATE profiles SET role = $1, email = $2 WHERE id = $3 RETURNING id, email, role',
      [role, email, id]
    )
    res.json(result.rows[0])
  } catch (err) { next(err) }
}

exports.deleteUser = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
  const { id } = req.params
  try {
    await pool.query('UPDATE profiles SET is_deleted = true WHERE id = $1', [id])
    res.json({ success: true, message: 'Пользователь удален' })
  } catch (err) { next(err) }
}

exports.restoreUser = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
  const { id } = req.params
  try {
    await pool.query('UPDATE profiles SET is_deleted = false WHERE id = $1', [id])
    res.json({ success: true, message: 'Пользователь восстановлен' })
  } catch (err) { next(err) }
}

exports.getLogs = async (req, res, next) => {
  /*
    #swagger.tags = ['Admin']
    #swagger.responses[200] = { $ref: '#/components/responses/SuccessOK' }
    #swagger.responses[400] = { $ref: '#/components/responses/BadRequest' }
    #swagger.responses[401] = { $ref: '#/components/responses/Unauthorized' }
    #swagger.responses[403] = { $ref: '#/components/responses/Forbidden' }
    #swagger.responses[404] = { $ref: '#/components/responses/NotFound' }
    #swagger.responses[429] = { $ref: '#/components/responses/TooManyRequests' }
    #swagger.responses[500] = { $ref: '#/components/responses/InternalServerError' }
    #swagger.responses[502] = { $ref: '#/components/responses/BadGateway' }
    #swagger.responses[503] = { $ref: '#/components/responses/ServiceUnavailable' }
  */
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
  } catch (err) { next(err) }
}