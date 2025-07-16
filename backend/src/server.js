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
import projectRoutes from './routes/projects.js';
import { checkScanLimit, checkFeatureAccess, checkRepositoryLimits } from './middleware/rateLimiter.js';
import { simulateAIService } from './services/aiService.js';
import billingRoutes from './routes/billing.js';

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
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000'],
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
          url: 'http://localhost:5000',
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
    const { userId } = request.user;

    try {
      // Create AI service instance
      const aiService = new (await import('./services/aiService.js')).AIService();
      const availableModels = aiService.getAvailableModels();

      // Check if the requested model is available
      if (!aiService.isModelAvailable(model)) {
        // Try to find a suitable alternative from the same provider
        let alternativeModel = null;
        if (model.startsWith('gpt-') && availableModels.some(m => m.startsWith('gpt-'))) {
          alternativeModel = availableModels.find(m => m.startsWith('gpt-')) || 'gpt-4o';
        } else if (model.startsWith('claude-') && availableModels.some(m => m.startsWith('claude-'))) {
          alternativeModel = availableModels.find(m => m.startsWith('claude-')) || 'claude-3.5-sonnet-20241022';
        } else if (model.startsWith('gemini-') && availableModels.some(m => m.startsWith('gemini-'))) {
          alternativeModel = availableModels.find(m => m.startsWith('gemini-')) || 'gemini-2.5-pro';
        } else if (availableModels.length > 0) {
          // Default to the first available model
          alternativeModel = availableModels[0];
        }

        if (!alternativeModel) {
          return reply.code(400).send({
            error: 'No AI models available',
            message: 'No AI API keys configured. Please add API keys to your .env file.',
            availableModels: []
          });
        }

        // Use the alternative model
        const actualModel = alternativeModel;
        const aiResponse = await aiService.query({
          model: actualModel,
          prompt,
          temperature,
          maxTokens,
          systemPrompt
        });

        // Log AI usage
        await prisma.aiUsage.create({
          data: {
            userId,
            model: actualModel,
            prompt: prompt.substring(0, 500),
            tokensUsed: maxTokens || 1000,
            cost: 0.01
          }
        });

        reply.send({
          response: aiResponse,
          modelUsed: actualModel,
          requestedModel: model
        });
      } else {
        // Use the requested model
        const aiResponse = await aiService.query({
          model,
          prompt,
          temperature,
          maxTokens,
          systemPrompt
        });

        // Log AI usage
        await prisma.aiUsage.create({
          data: {
            userId,
            model,
            prompt: prompt.substring(0, 500),
            tokensUsed: maxTokens || 1000,
            cost: 0.01
          }
        });

        reply.send({ response: aiResponse });
      }
    } catch (err) {
      reply.code(500).send({ error: 'AI processing failed', message: err.message });
    }
  });

  // AI data endpoint
  fastify.get('/api/v1/ai/data', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { userId } = request.user;
    const { page = 1, limit = 20 } = request.query;

    try {
      const aiData = await prisma.aiUsage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit),
        select: {
          id: true,
          model: true,
          prompt: true,
          tokensUsed: true,
          cost: true,
          createdAt: true
        }
      });

      const total = await prisma.aiUsage.count({ where: { userId } });

      reply.send({
        data: aiData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      reply.code(500).send({ error: 'Failed to fetch AI data', message: err.message });
    }
  });

  // AI usage statistics endpoint
  fastify.get('/api/v1/ai/usage', { preHandler: fastify.authenticate }, async (request, reply) => {
    const { userId } = request.user;
    const { period = 'month' } = request.query;

    try {
      let startDate;
      const now = new Date();
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const usage = await prisma.aiUsage.aggregate({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        _sum: {
          tokensUsed: true,
          cost: true
        },
        _count: {
          id: true
        }
      });

      const modelUsage = await prisma.aiUsage.groupBy({
        by: ['model'],
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        _sum: {
          tokensUsed: true,
          cost: true
        },
        _count: {
          id: true
        }
      });

      reply.send({
        period,
        totalRequests: usage._count.id || 0,
        totalTokens: usage._sum.tokensUsed || 0,
        totalCost: usage._sum.cost || 0,
        modelBreakdown: modelUsage.map(item => ({
          model: item.model,
          requests: item._count.id,
          tokens: item._sum.tokensUsed,
          cost: item._sum.cost
        }))
      });
    } catch (err) {
      reply.code(500).send({ error: 'Failed to fetch AI usage', message: err.message });
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
    
    // Project routes
    fastify.register(projectRoutes, { prefix: '/api/v1/projects' });

    //Billing Routes
    fastify.register(billingRoutes, { prefix: '/api/v1/billing' });
    
    // More protected routes will be added later
    // fastify.register(userRoutes, { prefix: '/api/v1/users' });
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
    
    const port = process.env.PORT || 5000;
    const host = process.env.HOST || 'localhost';
    
    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Whisper Backend API listening at http://${host}:${port}`);
    fastify.log.info(`📚 API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
