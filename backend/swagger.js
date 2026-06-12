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
      description: 'Production (Nginx)'
    },
    {
      url: `http://localhost:${process.env.PORT || 3001}`,
      description: 'Local Backend'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }]
}

swaggerAutogen('./swagger-output.json', ['./server.js'], doc)