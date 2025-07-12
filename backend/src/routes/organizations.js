import { nanoid } from 'nanoid';

const organizationRoutes = async (fastify, options) => {
  const { prisma } = fastify;

  // Create organization
  fastify.post('/create', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 3 },
          description: { type: 'string', maxLength: 250 },
        }
      }
    }
  }, async (request, reply) => {
    const { name, description } = request.body;
    try {
      const slug = nanoid(10);
      const organization = await prisma.organization.create({
        data: {
          name,
          description,
          slug
        }
      });
      reply.send({ organization });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to create organization' });
    }
  });

  // Join organization
  fastify.post('/join', {
    schema: {
      body: {
        type: 'object',
        required: ['organizationId'],
        properties: {
          organizationId: { type: 'string' },
          role: { type: 'string', enum: ['MEMBER', 'ADMIN'], default: 'MEMBER' }
        }
      }
    }
  }, async (request, reply) => {
    const { organizationId, role } = request.body;
    const { userId } = request.user;
    try {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!organization) {
        return reply.code(404).send({ error: 'Organization not found' });
      }
      const membership = await prisma.organizationMember.create({
        data: {
          userId,
          organizationId,
          role
        }
      });
      reply.send({ membership });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to join organization' });
    }
  });

  // List organization members
  fastify.get('/:organizationId/members', async (request, reply) => {
    const { organizationId } = request.params;
    try {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: true
            }
          },
          role: true,
          joinedAt: true
        }
      });
      reply.send({ members });
    } catch (error) {
      reply.code(500).send({ error: 'Failed to list members' });
    }
  });

};

export default organizationRoutes;
