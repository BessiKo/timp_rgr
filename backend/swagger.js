const path = require('path')
require('dotenv').config()
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' })

const doc = {
  info: {
    title: 'SCADA API',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'https://energy-secure-system.duckdns.org:8443',
      description: 'Production'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    responses: {
      SuccessOK: { description: 'Успешное выполнение (Код 200)' },
      SuccessCreated: { description: 'Успешно создано (Код 201)' },
      BadRequest: {
        description: 'Неверный синтаксис (Код 400)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Сервер не понял запрос' } } } } }
      },
      Unauthorized: {
        description: 'Необходима аутентификация (Код 401)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Необходима аутентификация' } } } } }
      },
      Forbidden: {
        description: 'Доступ запрещен (Код 403)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Доступ запрещен' } } } } }
      },
      NotFound: {
        description: 'Запрашиваемый ресурс не найден (Код 404)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Ресурс не найден' } } } } }
      },
      TooManyRequests: {
        description: 'Превышен лимит запросов (Код 429)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Превышен лимит запросов' } } } } }
      },
      InternalServerError: {
        description: 'Внутренняя ошибка сервера (Код 500)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Внутренняя ошибка сервера' } } } } }
      },
      BadGateway: {
        description: 'Шлюз получил некорректный ответ (Код 502)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Устройство недоступно' } } } } }
      },
      ServiceUnavailable: {
        description: 'Сервер временно недоступен (Код 503)',
        content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string', example: 'Сервер на обслуживании' } } } } }
      }
    }
  },
  security: [{ bearerAuth: [] }]
}

swaggerAutogen('./swagger-output.json', ['./server.js'], doc)