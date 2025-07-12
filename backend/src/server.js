import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import scanRoutes from './routes/scans.js';
import { checkScanLimit, checkFeatureAccess, checkRepositoryLimits } from './middleware/rateLimiter.js';
import { simulateAIService } from './services/aiService.js';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Plugin registration function
const registerPlugins = async () => {
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false // Disable for Swagger UI
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    skipSuccessfulRequests: true
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'whisper-super-secret-key-change-in-production'
  });

  // Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Whisper Security API',
        description: 'Backend API for Whisper CLI security platform',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
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
      }
    }
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
};

// Register routes function
const registerRoutes = async () => {
  // Add Prisma instance to fastify
  fastify.decorate('prisma', prisma);

  // Add authentication middleware
  fastify.decorate('authenticate', async function(request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });

  // Add rate limiting middleware
  fastify.decorate('checkScanLimit', await checkScanLimit(fastify));
  fastify.decorate('checkFeatureAccess', checkFeatureAccess);
  fastify.decorate('checkRepositoryLimits', await checkRepositoryLimits(fastify));

  // Health check endpoint (no auth required)
  fastify.get('/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      reply.code(503).send({ status: 'unhealthy', error: error.message });
    }
  });

  // Public routes (no authentication required)
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  // AI query route
  fastify.post('/api/v1/ai/query', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { model, prompt, temperature, maxTokens, systemPrompt } = request.body;
    const apiKey = request.user.apiKey; // Retrieve user's API key if needed

    try {
      // Simulate calling an AI service
      const aiResponse = await simulateAIService({ model, prompt, temperature, maxTokens, apiKey, systemPrompt });
      reply.send({ response: aiResponse });
    } catch (err) {
      reply.code(500).send({ error: 'AI processing failed', message: err.message });
    }
  });

  // Protected routes (authentication required)
  await fastify.register(async function (fastify) {
    // Authentication hook for protected routes
    fastify.addHook('onRequest', async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
      }
    });

    // Organization routes
    fastify.register(organizationRoutes, { prefix: '/api/v1/organizations' });
    
    // Scan routes
    fastify.register(scanRoutes, { prefix: '/api/v1/scans' });
    
    // More protected routes will be added later
    // fastify.register(userRoutes, { prefix: '/api/v1/users' });
    // fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
    // fastify.register(billingRoutes, { prefix: '/api/v1/billing' });
  });
};

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    reply.code(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    });
  } else if (error.statusCode) {
    reply.code(error.statusCode).send({
      error: error.name,
      message: error.message
    });
  } else {
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const start = async () => {
  try {
    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();
    
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Whisper Backend API listening at http://${host}:${port}`);
    fastify.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
