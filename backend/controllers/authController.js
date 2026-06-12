const pool = require('../config/db')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const speakeasy = require('speakeasy')
const ApiError = require('../utils/ApiError')

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
}

const setAuthCookie = (res, token) => { res.cookie('scada_token', token, cookieOptions) }
const clearAuthCookie = (res) => { res.clearCookie('scada_token', { httpOnly: true, secure: true, sameSite: 'lax', path: '/' }) }

exports.register = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.responses[201] = { $ref: '#/components/responses/SuccessCreated' }
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
    const { email, password } = req.body
    if (!email || !password) throw ApiError.BadRequest('Заполните все поля')
    const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passRegex.test(password)) throw ApiError.BadRequest('Пароль должен быть не менее 8 символов, содержать хотя бы одну заглавную букву и одну цифру.')

    const normalizedEmail = email.trim().toLowerCase()
    const userExist = await pool.query('SELECT id FROM profiles WHERE email = $1', [normalizedEmail])
    if (userExist.rows.length > 0) throw ApiError.BadRequest('Пользователь с таким email уже зарегистрирован')

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)
    const newProfile = await pool.query(
      'INSERT INTO profiles (email, role, password_hash, mfa_enabled, mfa_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role',
      [normalizedEmail, 'pending', passwordHash, false, null]
    )
    res.status(201).json({ success: true, message: 'Регистрация успешна', user: newProfile.rows[0] })
  } catch (err) { next(err) }
}

exports.login = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    const { email, password } = req.body
    if (!email || !password) throw ApiError.BadRequest('Введите email и пароль')

    const normalizedEmail = email.trim().toLowerCase()
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1 AND is_deleted = false', [normalizedEmail])
    if (result.rows.length === 0) throw ApiError.BadRequest('Неверный логин или пароль')

    const user = result.rows[0]
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) throw ApiError.BadRequest('Неверный логин или пароль')
    
    if (user.mfa_enabled) return res.json({ status: 'mfa_pending', factorId: user.id, email: user.email, role: user.role })

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })
    await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [user.id, 'Успешная авторизация', JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] })])

    setAuthCookie(res, token)
    res.json({ user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) { next(err) }
}

exports.verifyMfa = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    const { userId, code } = req.body
    if (!userId || !code) throw ApiError.BadRequest('Требуются оба поля: userId и код 2FA')

    const result = await pool.query('SELECT * FROM profiles WHERE id = $1 AND is_deleted = false', [userId])
    if (result.rows.length === 0) throw ApiError.BadRequest('Пользователь не найден')

    const user = result.rows[0]
    const valid = user.mfa_secret && speakeasy.totp.verify({ secret: user.mfa_secret, encoding: 'base32', token: String(code).trim(), window: 1 })
    if (!valid) throw ApiError.BadRequest('Неверный код 2FA')

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' })
    await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [user.id, 'Успешная 2FA авторизация', JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] })])

    setAuthCookie(res, token)
    res.json({ user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) { next(err) }
}

exports.me = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    if (!req.user || !req.user.id) throw ApiError.Unauthorized('Пользователь не авторизован')
    const result = await pool.query('SELECT id, email, role, mfa_enabled FROM profiles WHERE id = $1 AND is_deleted = false', [req.user.id])
    if (result.rows.length === 0) throw ApiError.NotFound('Пользователь не найден')
    res.json({ user: result.rows[0] })
  } catch (err) { next(err) }
}

exports.logout = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    clearAuthCookie(res)
    if (req.user && req.user.id) {
      await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [req.user.id, 'Выход из системы', JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] })])
    }
    res.json({ success: true, message: 'Сессия завершена' })
  } catch (err) {
    clearAuthCookie(res)
    res.json({ success: true, message: 'Сессия завершена' })
  }
}

exports.setupMfa = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    const { rows } = await pool.query('SELECT mfa_enabled FROM profiles WHERE id = $1', [req.user.id])
    if (rows.length === 0) throw ApiError.NotFound('Пользователь не найден')
    if (rows[0].mfa_enabled) throw ApiError.BadRequest('2FA уже включена')

    const secret = speakeasy.generateSecret({ name: `SCADA (${req.user.email})` })
    await pool.query('UPDATE profiles SET mfa_temp_secret = $1 WHERE id = $2', [secret.base32, req.user.id])
    res.json({ secret: secret.base32, otpauth_url: secret.otpauth_url })
  } catch (err) { next(err) }
}

exports.enableMfa = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    const { code } = req.body
    if (!code) throw ApiError.BadRequest('Требуется код 2FA')

    const result = await pool.query('SELECT mfa_temp_secret, mfa_enabled FROM profiles WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) throw ApiError.NotFound('Пользователь не найден')
    if (result.rows[0].mfa_enabled) throw ApiError.BadRequest('2FA уже включена')
    if (!result.rows[0].mfa_temp_secret) throw ApiError.BadRequest('Сначала запросите настройку 2FA')

    const valid = speakeasy.totp.verify({ secret: result.rows[0].mfa_temp_secret, encoding: 'base32', token: String(code).trim(), window: 1 })
    if (!valid) throw ApiError.BadRequest('Неверный код 2FA')

    await pool.query('UPDATE profiles SET mfa_secret = $1, mfa_enabled = true, mfa_temp_secret = NULL WHERE id = $2', [result.rows[0].mfa_temp_secret, req.user.id])
    await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [req.user.id, 'Включена 2FA', JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] })])
    res.json({ success: true, message: '2FA успешно включена' })
  } catch (err) { next(err) }
}

exports.disableMfa = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    const result = await pool.query('SELECT mfa_enabled FROM profiles WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) throw ApiError.NotFound('Пользователь не найден')
    if (!result.rows[0].mfa_enabled) throw ApiError.BadRequest('2FA не включена')

    await pool.query('UPDATE profiles SET mfa_secret = NULL, mfa_enabled = false, mfa_temp_secret = NULL WHERE id = $1', [req.user.id])
    await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [req.user.id, 'Отключена 2FA', JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] })])
    res.json({ success: true, message: '2FA успешно отключена' })
  } catch (err) { next(err) }
}

exports.changePassword = async (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
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
    const { oldPassword, newPassword } = req.body
    const userId = req.user.id
    if (!oldPassword || !newPassword) throw ApiError.BadRequest('Укажите старый и новый пароль')

    const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passRegex.test(newPassword)) throw ApiError.BadRequest('Новый пароль должен быть не менее 8 символов, содержать заглавную букву и цифру')

    const result = await pool.query('SELECT password_hash FROM profiles WHERE id = $1', [userId])
    if (result.rows.length === 0) throw ApiError.NotFound('Пользователь не найден')

    const user = result.rows[0]
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash)
    if (!isMatch) throw ApiError.BadRequest('Старый пароль указан неверно')

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(newPassword, salt)
    
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
    await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [userId, 'Смена пароля', JSON.stringify({ ip: req.ip, user_agent: req.headers['user-agent'] })])
    res.json({ success: true, message: 'Пароль успешно изменен' })
  } catch (err) { next(err) }
}