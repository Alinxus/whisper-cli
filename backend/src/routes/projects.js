import { checkRepositoryLimits } from '../middleware/rateLimiter.js';

const projectRoutes = async (fastify, options) => {
  const { prisma } = fastify;

  // Create a new project
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.checkRepositoryLimits],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          repositoryUrl: { type: 'string' },
          branch: { type: 'string', default: 'main' },
          organizationId: { type: 'string' },
          config: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.user;
    const { name, description, repositoryUrl, branch, organizationId, config } = request.body;

    try {
      // Verify organization membership if organizationId is provided
      if (organizationId) {
        const membership = await prisma.organizationMember.findFirst({
          where: {
            userId,
            organizationId,
            role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
          }
        });

        if (!membership) {
          return reply.code(403).send({
            error: 'Access denied',
            message: 'You are not a member of this organization'
          });
        }
      }

      const project = await prisma.project.create({
        data: {
          name,
          description,
          repositoryUrl,
          branch: branch || 'main',
          ownerId: userId,
          organizationId,
          config: config || {}
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      reply.send({
        message: 'Project created successfully',
        project
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Project creation failed',
        message: 'Internal server error'
      });
    }
  });

  // Get user's projects
  fastify.get('/', async (request, reply) => {
    const { userId } = request.user;
    const { page = 1, limit = 20, organizationId } = request.query;

    try {
      const where = {
        OR: [
          { ownerId: userId },
          {
            organization: {
              members: {
                some: { userId }
              }
            }
          }
        ]
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      const projects = await prisma.project.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          _count: {
            select: {
              scans: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.project.count({ where });

      reply.send({
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to retrieve projects'
      });
    }
  });

  // Get project by ID
  fastify.get('/:projectId', async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = request.user;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              members: {
                where: { userId },
                select: { role: true }
              }
            }
          },
          scans: {
            orderBy: { startedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              status: true,
              branch: true,
              commit: true,
              totalFiles: true,
              issuesFound: true,
              startedAt: true,
              completedAt: true
            }
          }
        }
      });

      if (!project) {
        return reply.code(404).send({
          error: 'Project not found'
        });
      }

      // Check access permissions
      const hasAccess = project.ownerId === userId || 
        project.organization?.members.length > 0;

      if (!hasAccess) {
        return reply.code(403).send({
          error: 'Access denied'
        });
      }

      reply.send({ project });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to retrieve project'
      });
    }
  });

  // Update project
  fastify.put('/:projectId', async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = request.user;
    const { name, description, repositoryUrl, branch, config } = request.body;

    try {
      // Check if user has permission to update
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          organization: {
            select: {
              members: {
                where: { userId },
                select: { role: true }
              }
            }
          }
        }
      });

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const isOwner = project.ownerId === userId;
      const isOrgAdmin = project.organization?.members.some(m => 
        ['OWNER', 'ADMIN'].includes(m.role)
      );

      if (!isOwner && !isOrgAdmin) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(repositoryUrl && { repositoryUrl }),
          ...(branch && { branch }),
          ...(config && { config })
        },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });

      reply.send({
        message: 'Project updated successfully',
        project: updatedProject
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Project update failed'
      });
    }
  });

  // Delete project
  fastify.delete('/:projectId', async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = request.user;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          organization: {
            select: {
              members: {
                where: { userId },
                select: { role: true }
              }
            }
          }
        }
      });

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const isOwner = project.ownerId === userId;
      const isOrgOwner = project.organization?.members.some(m => m.role === 'OWNER');

      if (!isOwner && !isOrgOwner) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      await prisma.project.delete({
        where: { id: projectId }
      });

      reply.send({
        message: 'Project deleted successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Project deletion failed'
      });
    }
  });

  // Get project statistics
  fastify.get('/:projectId/stats', async (request, reply) => {
    const { projectId } = request.params;
    const { userId } = request.user;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Check access (simplified)
      const hasAccess = project.ownerId === userId;
      if (!hasAccess) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const stats = await prisma.scan.groupBy({
        by: ['status'],
        where: { projectId },
        _count: true
      });

      const totalScans = await prisma.scan.count({
        where: { projectId }
      });

      const criticalFindings = await prisma.finding.count({
        where: {
          scan: { projectId },
          severity: 'CRITICAL'
        }
      });

      const recentScans = await prisma.scan.findMany({
        where: { projectId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          totalFiles: true,
          issuesFound: true,
          startedAt: true
        }
      });

      reply.send({
        totalScans,
        criticalFindings,
        scansByStatus: stats,
        recentScans
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to retrieve statistics'
      });
    }
  });
};

export default projectRoutes;
