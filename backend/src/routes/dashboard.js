const dashboardRoutes = async (fastify, options) => {
  const { prisma } = fastify;

  // Get user dashboard overview
  fastify.get('/overview', async (request, reply) => {
    const { userId } = request.user;

    try {
      // Get user subscription info
      const subscription = await prisma.subscription.findFirst({
        where: { userId }
      });

      // Get scan statistics
      const totalScans = await prisma.scan.count({
        where: { userId }
      });

      const scansThisMonth = await prisma.scan.count({
        where: {
          userId,
          startedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      });

      // Get critical findings
      const criticalFindings = await prisma.finding.count({
        where: {
          scan: { userId },
          severity: 'CRITICAL'
        }
      });

      // Get high severity findings
      const highFindings = await prisma.finding.count({
        where: {
          scan: { userId },
          severity: 'HIGH'
        }
      });

      // Get projects count
      const totalProjects = await prisma.project.count({
        where: {
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
        }
      });

      // Get recent scans
      const recentScans = await prisma.scan.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          project: {
            select: {
              name: true,
              repositoryUrl: true
            }
          }
        }
      });

      // Get scan trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const scanTrends = await prisma.scan.groupBy({
        by: ['status'],
        where: {
          userId,
          startedAt: {
            gte: thirtyDaysAgo
          }
        },
        _count: true
      });

      // Get findings by severity
      const findingsBySeverity = await prisma.finding.groupBy({
        by: ['severity'],
        where: {
          scan: { userId }
        },
        _count: true
      });

      // Get organizations user belongs to
      const organizations = await prisma.organizationMember.findMany({
        where: { userId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              _count: {
                select: {
                  projects: true,
                  members: true
                }
              }
            }
          }
        }
      });

      reply.send({
        subscription: subscription || {
          plan: 'FREE',
          status: 'INACTIVE',
          scansUsed: scansThisMonth,
          scansLimit: 10
        },
        stats: {
          totalScans,
          scansThisMonth,
          criticalFindings,
          highFindings,
          totalProjects
        },
        recentScans,
        scanTrends,
        findingsBySeverity,
        organizations: organizations.map(om => om.organization)
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to fetch dashboard data'
      });
    }
  });

  // Get security insights and recommendations
  fastify.get('/insights', async (request, reply) => {
    const { userId } = request.user;

    try {
      // Get most common vulnerability types
      const commonVulnerabilities = await prisma.finding.groupBy({
        by: ['type'],
        where: {
          scan: { userId }
        },
        _count: true,
        orderBy: {
          _count: {
            type: 'desc'
          }
        },
        take: 10
      });

      // Get projects with most critical issues
      const riskiestProjects = await prisma.project.findMany({
        where: {
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
        },
        include: {
          _count: {
            select: {
              scans: {
                where: {
                  findings: {
                    some: {
                      severity: { in: ['CRITICAL', 'HIGH'] }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          scans: {
            _count: 'desc'
          }
        },
        take: 5
      });

      // Get security score trend (based on findings ratio)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const securityTrend = [];
      for (const date of last30Days) {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const scansCount = await prisma.scan.count({
          where: {
            userId,
            startedAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        });

        const criticalCount = await prisma.finding.count({
          where: {
            scan: {
              userId,
              startedAt: {
                gte: dayStart,
                lte: dayEnd
              }
            },
            severity: 'CRITICAL'
          }
        });

        const score = scansCount > 0 ? Math.max(0, 100 - (criticalCount * 20)) : 100;
        securityTrend.push({
          date,
          score,
          scans: scansCount,
          criticalFindings: criticalCount
        });
      }

      // Generate AI-powered recommendations
      const recommendations = [];
      
      if (commonVulnerabilities.length > 0) {
        const topVuln = commonVulnerabilities[0];
        recommendations.push({
          type: 'vulnerability',
          priority: 'high',
          title: `Address ${topVuln.type} vulnerabilities`,
          description: `You have ${topVuln._count} instances of ${topVuln.type}. This is your most common security issue.`,
          action: `Run \`whisper scan --fix\` to get AI-powered fixes for ${topVuln.type} issues.`
        });
      }

      if (riskiestProjects.length > 0 && riskiestProjects[0]._count.scans > 3) {
        recommendations.push({
          type: 'project',
          priority: 'medium',
          title: 'Focus on high-risk project',
          description: `Project "${riskiestProjects[0].name}" has the most security issues.`,
          action: 'Consider implementing stricter code review processes for this project.'
        });
      }

      const subscription = await prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription || subscription.plan === 'FREE') {
        recommendations.push({
          type: 'upgrade',
          priority: 'low',
          title: 'Upgrade for AI-powered fixes',
          description: 'Pro plan includes automatic security fix suggestions.',
          action: 'Upgrade to Pro plan to unlock AI-powered code fixes.'
        });
      }

      reply.send({
        commonVulnerabilities,
        riskiestProjects,
        securityTrend,
        recommendations
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to fetch security insights'
      });
    }
  });

  // Get team dashboard (for team plans)
  fastify.get('/team/:organizationId', async (request, reply) => {
    const { organizationId } = request.params;
    const { userId } = request.user;

    try {
      // Verify user is a member of the organization
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId
        }
      });

      if (!membership) {
        return reply.code(403).send({
          error: 'Access denied',
          message: 'You are not a member of this organization'
        });
      }

      // Get organization info
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          },
          subscription: true
        }
      });

      // Get team projects
      const projects = await prisma.project.findMany({
        where: { organizationId },
        include: {
          owner: {
            select: {
              username: true
            }
          },
          _count: {
            select: {
              scans: true
            }
          }
        }
      });

      // Get team scan statistics
      const totalScans = await prisma.scan.count({
        where: {
          project: {
            organizationId
          }
        }
      });

      // Get team findings by member
      const memberActivity = await prisma.scan.groupBy({
        by: ['userId'],
        where: {
          project: {
            organizationId
          }
        },
        _count: true,
        _sum: {
          issuesFound: true
        }
      });

      // Get recent team activity
      const recentActivity = await prisma.scan.findMany({
        where: {
          project: {
            organizationId
          }
        },
        include: {
          user: {
            select: {
              username: true
            }
          },
          project: {
            select: {
              name: true
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        take: 20
      });

      reply.send({
        organization,
        projects,
        stats: {
          totalScans,
          totalMembers: organization.members.length,
          totalProjects: projects.length
        },
        memberActivity,
        recentActivity
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to fetch team dashboard'
      });
    }
  });
};

export default dashboardRoutes;
