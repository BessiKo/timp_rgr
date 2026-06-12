const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const tokenFromHeader = authHeader && authHeader.split(' ')[1]
  const token = tokenFromHeader || req.cookies?.scada_token

  if (!token) {
    return res.status(401).json({ error: 'Доступ запрещен. Токен отсутствует.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Невалидный или просроченный токен.' })
  }
}

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции.' })
    }
    next()
  }
}

module.exports = { verifyToken, checkRole }