import { checkScanLimit } from '../middleware/rateLimiter.js';

const scanRoutes = async (fastify, options) => {
  const { prisma } = fastify;

  // Submit a new scan
  fastify.post('/', {
    preHandler: fastify.checkScanLimit,
    schema: {
      body: {
        type: 'object',
        required: ['projectPath', 'totalFiles', 'issuesFound', 'findings'],
        properties: {
          projectPath: { type: 'string' },
          totalFiles: { type: 'number' },
          issuesFound: { type: 'number' },
          findings: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                file: { type: 'string' },
                issues: { type: 'array' },
                confidence: { type: 'number' },
                lens: { type: 'object' }
              }
            }
          },
          metadata: { type: 'object' },
          branch: { type: 'string' },
          commit: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.user;
    const { projectPath, totalFiles, issuesFound, findings, metadata, branch, commit } = request.body;

    try {
      // Create or find project
      let project = await prisma.project.findFirst({
        where: {
          ownerId: userId,
          repositoryUrl: projectPath
        }
      });

      if (!project) {
        project = await prisma.project.create({
          data: {
            name: projectPath.split('/').pop() || 'Unnamed Project',
            repositoryUrl: projectPath,
            ownerId: userId,
            branch: branch || 'main'
          }
        });
      }

      // Create scan record
      const scan = await prisma.scan.create({
        data: {
          projectId: project.id,
          userId,
          status: 'COMPLETED',
          branch: branch || 'main',
          commit,
          totalFiles,
          issuesFound,
          metadata
        }
      });

      // Create findings
      for (const finding of findings) {
        for (const issue of finding.issues) {
          await prisma.finding.create({
            data: {
              scanId: scan.id,
              file: finding.file,
              line: issue.line,
              column: issue.column,
              type: issue.type,
              severity: issue.severity || 'MEDIUM',
              message: issue.message,
              description: issue.description,
              fix: issue.fix,
              confidence: issue.confidence || finding.confidence || 0.5,
              code: issue.code
            }
          });
        }
      }

      reply.send({
        message: 'Scan submitted successfully',
        scanId: scan.id,
        projectId: project.id
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Scan submission failed',
        message: 'Internal server error'
      });
    }
  });

  // Get scan by ID
  fastify.get('/:scanId', async (request, reply) => {
    const { scanId } = request.params;
    const { userId } = request.user;

    try {
      const scan = await prisma.scan.findUnique({
        where: { id: scanId },
        include: {
          project: true,
          findings: true
        }
      });

      if (!scan) {
        return reply.code(404).send({
          error: 'Scan not found'
        });
      }

      // Check if user has access to this scan
      if (scan.userId !== userId && scan.project.ownerId !== userId) {
        return reply.code(403).send({
          error: 'Access denied'
        });
      }

      reply.send({ scan });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to retrieve scan'
      });
    }
  });

  // Get user's scans
  fastify.get('/', async (request, reply) => {
    const { userId } = request.user;
    const { page = 1, limit = 20, severity } = request.query;

    try {
      const where = { userId };
      
      const scans = await prisma.scan.findMany({
        where,
        include: {
          project: {
            select: {
              name: true,
              repositoryUrl: true
            }
          },
          _count: {
            select: {
              findings: severity ? {
                where: { severity: severity.toUpperCase() }
              } : true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: parseInt(limit)
      });

      const total = await prisma.scan.count({ where });

      reply.send({
        scans,
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
        error: 'Failed to retrieve scans'
      });
    }
  });

  // Get scan statistics (main endpoint)
  const getStatsHandler = async (request, reply) => {
    const { userId } = request.user;

    try {
      const stats = await prisma.scan.groupBy({
        by: ['status'],
        where: { userId },
        _count: true
      });

      const totalScans = await prisma.scan.count({
        where: { userId }
      });

      const criticalFindings = await prisma.finding.count({
        where: {
          scan: { userId },
          severity: 'CRITICAL'
        }
      });

      const recentScans = await prisma.scan.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          project: {
            select: { name: true }
          }
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
  };

  // Register both endpoints with same handler
  fastify.get('/stats/overview', getStatsHandler);
  fastify.get('/stats', getStatsHandler);

};

export default scanRoutes;
