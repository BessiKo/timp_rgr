const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });

const doc = {
  info: {
    title: 'SCADA API',
    description: 'API Documentation',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'https://energy-secure-system.duckdns.org',
      description: 'Production'
    },
    {
      url: `http://localhost:${process.env.PORT || 3001}`,
      description: 'Local'
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
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js'];

swaggerAutogen(outputFile, endpointsFiles, doc);