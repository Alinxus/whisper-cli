import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const authRoutes = async (fastify, options) => {
  const { prisma } = fastify;
  
  // Make prisma available globally for passport strategies
  global.prisma = prisma;

  // User registration
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 20 },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', maxLength: 50 },
          lastName: { type: 'string', maxLength: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, username, password, firstName, lastName } = request.body;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        return reply.code(400).send({
          error: 'User already exists',
          message: 'A user with this email or username already exists'
        });
      }

      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            firstName,
            lastName
          }
        }
      });

      if (authError) {
        return reply.code(400).send({
          error: 'Registration failed',
          message: authError.message
        });
      }

      // Generate API key
      const apiKey = `wsk_${nanoid(32)}`;

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          id: authData.user.id, // Use Supabase user ID
          email,
          username,
          password: '', // Not needed with Supabase Auth
          firstName,
          lastName,
          apiKey,
          isVerified: authData.user.email_confirmed_at ? true : false
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
          apiKey: true,
          createdAt: true
        }
      });

      // Create free subscription
      await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: 'FREE',
          status: 'ACTIVE',
          scansLimit: 10
        }
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      reply.send({
        message: 'User registered successfully',
        user,
        token
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Registration failed',
        message: 'Internal server error'
      });
    }
  });

  // User login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          subscription: true
        }
      });

      if (!user) {
        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return reply.code(401).send({
          error: 'Account suspended',
          message: 'Your account has been suspended. Please contact support.'
        });
      }

      // Login with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate JWT token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      reply.send({
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Login failed',
        message: 'Internal server error'
      });
    }
  });

  // Refresh token
  fastify.post('/refresh', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user;

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return reply.code(401).send({
          error: 'Invalid user',
          message: 'User not found or inactive'
        });
      }

      // Generate new token
      const token = fastify.jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      reply.send({
        message: 'Token refreshed successfully',
        token
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Token refresh failed',
        message: 'Internal server error'
      });
    }
  });

  // Get current user profile
  fastify.get('/me', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
          apiKey: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              scansUsed: true,
              scansLimit: true,
              currentPeriodEnd: true
            }
          }
        }
      });

      if (!user) {
        return reply.code(404).send({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      reply.send({
        user
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Profile fetch failed',
        message: 'Internal server error'
      });
    }
  });

  // Generate new API key
  fastify.post('/api-key/regenerate', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const { userId } = request.user;

      const newApiKey = `wsk_${nanoid(32)}`;

      const user = await prisma.user.update({
        where: { id: userId },
        data: { apiKey: newApiKey },
        select: {
          id: true,
          apiKey: true
        }
      });

      reply.send({
        message: 'API key regenerated successfully',
        apiKey: user.apiKey
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'API key regeneration failed',
        message: 'Internal server error'
      });
    }
  });

  // Logout (primarily for logging purposes)
  fastify.post('/logout', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token. This endpoint is mainly for logging.
    
    fastify.log.info(`User ${request.user.userId} logged out`);
    
    reply.send({
      message: 'Logout successful'
    });
  });
};

// Authentication middleware
const authenticate = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing token'
    });
  }
};

// Register the authenticate function
authRoutes.authenticate = authenticate;

export default authRoutes;
