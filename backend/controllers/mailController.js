const nodemailer = require('nodemailer')
const pool = require('../config/db')
const ApiError = require('../utils/ApiError')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: 1025,
  secure: false,
  ignoreTLS: true
})

exports.sendMessage = async (req, res, next) => {
  /*
    #swagger.tags = ['Mail']
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
    const { recipientId, subject, body } = req.body
    const senderId = req.user.id

    if (!recipientId || !body || !subject) throw ApiError.BadRequest('Укажите получателя, тему и текст')
    if (recipientId === senderId) throw ApiError.BadRequest('Нельзя отправить письмо себе')

    const recipientRes = await pool.query('SELECT email FROM profiles WHERE id = $1', [recipientId])
    if (recipientRes.rows.length === 0) throw ApiError.NotFound('Получатель не найден')

    const recipientEmail = recipientRes.rows[0].email

    await transporter.sendMail({
      from: `"${req.user.email}" <${req.user.email}>`,
      to: recipientEmail,
      subject: subject.trim(),
      text: body.trim()
    })

    await pool.query('INSERT INTO logs (user_id, action, metadata) VALUES ($1, $2, $3)', [senderId, 'Отправлен email', JSON.stringify({ recipientEmail, subject, ip: req.ip })])
    res.json({ success: true, message: 'Письмо отправлено' })
  } catch (err) { next(err) }
}

exports.getInbox = async (req, res, next) => {
  /*
    #swagger.tags = ['Mail']
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
    const userEmail = req.user.email.toLowerCase()
    const mailpitUrl = process.env.MAIL_API_URL
    const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=500`)
    
    if (!response.ok) throw ApiError.Internal('Ошибка связи с почтовым сервером')
    
    const data = await response.json()
    const messages = (data.messages || [])
      .filter(msg => {
        const fromEmail = (msg.From?.Address || '').toLowerCase()
        const toEmails = (msg.To || []).map(t => (t.Address || '').toLowerCase())
        return toEmails.includes(userEmail) && fromEmail !== userEmail
      })
      .map(msg => ({
        id: msg.ID,
        subject: msg.Subject,
        from: msg.From?.Address,
        to: msg.To && msg.To[0] ? msg.To[0].Address : '',
        snippet: msg.Snippet,
        date: msg.Created
      }))

    res.json(messages)
  } catch (err) { next(err) }
}

exports.getSent = async (req, res, next) => {
  /*
    #swagger.tags = ['Mail']
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
    const userEmail = req.user.email.toLowerCase()
    const mailpitUrl = process.env.MAIL_API_URL
    const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=500`)
    
    if (!response.ok) throw ApiError.Internal('Ошибка связи с почтовым сервером')
    
    const data = await response.json()
    const messages = (data.messages || [])
      .filter(msg => {
        const fromEmail = (msg.From?.Address || '').toLowerCase()
        return fromEmail === userEmail
      })
      .map(msg => ({
        id: msg.ID,
        subject: msg.Subject,
        from: msg.From?.Address,
        to: msg.To && msg.To[0] ? msg.To[0].Address : '',
        snippet: msg.Snippet,
        date: msg.Created
      }))

    res.json(messages)
  } catch (err) { next(err) }
}

exports.getMessageById = async (req, res, next) => {
  /*
    #swagger.tags = ['Mail']
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
    const mailpitUrl = process.env.MAIL_API_URL
    const response = await fetch(`${mailpitUrl}/api/v1/message/${req.params.id}`)
    
    if (!response.ok) throw ApiError.NotFound('Письмо не найдено')
    
    const data = await response.json()
    res.json({
      id: data.ID,
      subject: data.Subject,
      from: data.From?.Address,
      to: data.To && data.To[0] ? data.To[0].Address : '',
      body: data.Text || data.Snippet,
      date: data.Date || data.Created
    })
  } catch (err) { next(err) }
}