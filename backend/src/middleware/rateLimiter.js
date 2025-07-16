
// Rate limiting middleware based on subscription plans
const PLAN_LIMITS = {
  FREE: {
    scansPerMonth: 10,
    maxRepos: 1,
    maxFilesPerRepo: 2500,
    aiFixesEnabled: false,
    teamFeaturesEnabled: false,
    cicdEnabled: false
  },
  PRO: {
    scansPerMonth: 1000,
    maxRepos: 10,
    maxFilesPerRepo: 50000,
    aiFixesEnabled: true,
    teamFeaturesEnabled: false,
    cicdEnabled: false
  },
  TEAM: {
    scansPerMonth: 100000,
    maxRepos: 25,
    maxFilesPerRepo: 100000,
    aiFixesEnabled: true,
    teamFeaturesEnabled: true,
    cicdEnabled: true
  },
  ENTERPRISE: {
    scansPerMonth: -1, // Unlimited
    maxRepos: -1, // Unlimited
    maxFilesPerRepo: -1, // Unlimited
    aiFixesEnabled: true,
    teamFeaturesEnabled: true,
    cicdEnabled: true
  }
};

const FEATURE_MATRIX = {
  FREE: {
    'AI-Powered Code Fixes': false,
    'AI Documentation': false,
    'Heuristic Scans': true,
    'Markdown/HTML Reports': true,
    'Shared Team Dashboard': false,
    'CLI Auth Guard': false,
    'CI/CD Integration': false,
    'Team Config Sync': false,
    'Usage Analytics': false,
    'Priority Support': false
  },
  PRO: {
    'AI-Powered Code Fixes': true,
    'AI Documentation': true,
    'Heuristic Scans': true,
    'Markdown/HTML Reports': true,
    'Shared Team Dashboard': false,
    'CLI Auth Guard': true,
    'CI/CD Integration': false,
    'Team Config Sync': true,
    'Usage Analytics': false,
    'Priority Support': false
  },
  TEAM: {
    'GPT-Powered Code Fixes': true,
    'AI Documentation': true,
    'Heuristic Scans': true,
    'Markdown/HTML Reports': true,
    'Shared Team Dashboard': true,
    'CLI Auth Guard': true,
    'CI/CD Integration': true,
    'Team Config Sync': true,
    'Usage Analytics': true,
    'Priority Support': true
  },
  ENTERPRISE: {
    'GPT-Powered Code Fixes': true,
    'AI Documentation': true,
    'Heuristic Scans': true,
    'Markdown/HTML Reports': true,
    'Shared Team Dashboard': true,
    'CLI Auth Guard': true,
    'CI/CD Integration': true,
    'Team Config Sync': true,
    'Usage Analytics': true,
    'Priority Support': true
  }
};

export const checkScanLimit = async (fastify) => {
  return async (request, reply) => {
    try {
      const { userId } = request.user;
      
      // Get user's subscription
      const subscription = await fastify.prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription) {
        return reply.code(402).send({
          error: 'No active subscription',
          message: 'Please subscribe to a plan to continue scanning'
        });
      }

      const planLimits = PLAN_LIMITS[subscription.plan];
      
      // Check if plan allows unlimited scans
      if (planLimits.scansPerMonth === -1) {
        return; // Unlimited, proceed
      }

      // Check current month usage
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const scansThisMonth = await fastify.prisma.scan.count({
        where: {
          userId,
          startedAt: {
            gte: startOfMonth
          }
        }
      });

      if (scansThisMonth >= planLimits.scansPerMonth) {
        return reply.code(429).send({
          error: 'Scan limit exceeded',
          message: `You have reached your monthly limit of ${planLimits.scansPerMonth} scans. Please upgrade your plan or wait until next month.`,
          currentUsage: scansThisMonth,
          limit: planLimits.scansPerMonth,
          plan: subscription.plan
        });
      }

      // Update scan count
      await fastify.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          scansUsed: scansThisMonth + 1
        }
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Rate limit check failed',
        message: 'Unable to verify scan limits'
      });
    }
  };
};

export const checkFeatureAccess = (feature) => {
  return async (request, reply) => {
    try {
      const { userId } = request.user;
      
      // Get user's subscription
      const subscription = await reply.context.prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription) {
        return reply.code(402).send({
          error: 'No active subscription',
          message: 'Please subscribe to a plan to access this feature'
        });
      }

      const hasAccess = FEATURE_MATRIX[subscription.plan][feature];
      
      if (!hasAccess) {
        return reply.code(403).send({
          error: 'Feature not available',
          message: `This feature requires a higher subscription plan. Current plan: ${subscription.plan}`,
          feature,
          plan: subscription.plan
        });
      }

    } catch (error) {
      return reply.code(500).send({
        error: 'Feature access check failed',
        message: 'Unable to verify feature access'
      });
    }
  };
};

export const checkRepositoryLimits = async (fastify) => {
  return async (request, reply) => {
    try {
      const { userId } = request.user;
      
      // Get user's subscription
      const subscription = await fastify.prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription) {
        return reply.code(402).send({
          error: 'No active subscription'
        });
      }

      const planLimits = PLAN_LIMITS[subscription.plan];
      
      // Check if plan allows unlimited repos
      if (planLimits.maxRepos === -1) {
        return; // Unlimited, proceed
      }

      // Count user's current repositories
      const repoCount = await fastify.prisma.project.count({
        where: { ownerId: userId }
      });

      if (repoCount >= planLimits.maxRepos) {
        return reply.code(429).send({
          error: 'Repository limit exceeded',
          message: `You have reached your repository limit of ${planLimits.maxRepos}. Please upgrade your plan or remove existing repositories.`,
          currentUsage: repoCount,
          limit: planLimits.maxRepos,
          plan: subscription.plan
        });
      }

    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Repository limit check failed'
      });
    }
  };
};

export const getUserLimits = async (fastify, userId) => {
  try {
    const subscription = await fastify.prisma.subscription.findFirst({
      where: { userId }
    });

    if (!subscription) {
      return PLAN_LIMITS.FREE; // Default to free plan limits
    }

    return {
      ...PLAN_LIMITS[subscription.plan],
      plan: subscription.plan,
      features: FEATURE_MATRIX[subscription.plan]
    };
  } catch (error) {
    return PLAN_LIMITS.FREE; // Default to free plan limits on error
  }
};

export { PLAN_LIMITS, FEATURE_MATRIX };
