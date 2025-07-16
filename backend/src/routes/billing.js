import { lemonSqueezyApiInstance } from '../services/lemonSqueezy.js';

const billingRoutes = async (fastify, options) => {
  const { prisma } = fastify;

  // Get available plans
  fastify.get('/plans', async (request, reply) => {
    try {
      const plans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          interval: 'month',
          features: [
            '10 scans per month',
            '1 repository',
            'Up to 5,000 files per repo',
            'Basic security scanning',
            'Markdown/HTML reports'
          ],
          limits: {
            scansPerMonth: 10,
            maxRepos: 1,
            maxFilesPerRepo: 2500,
            aiFixesEnabled: false,
            teamFeaturesEnabled: false
          }
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 15,
          interval: 'month',
          annual_price: 150,
          features: [
            '300 scans per month',
            'AI-powered code fixes',
            'Up to 20 private repos',
            '50,000 files per repo',
            'CLI Auth Guard',
            'Team config sync',
            'Priority email support'
          ],
          limits: {
            scansPerMonth: 300,
            maxRepos: 20,
            maxFilesPerRepo: 50000,
            aiFixesEnabled: true,
            teamFeaturesEnabled: false
          }
        },
        {
          id: 'team',
          name: 'TEAM',
          price: 25,
          interval: '/user/month',
          annual_price: 220,
          features: [
            '1,000 scans per month (shared)',
            'All Pro features',
            'Shared team dashboard',
            'CI/CD integration',
            'Up to 50 repos',
            '100,000 files per repo',
            'Usage analytics',
            'Priority support'
          ],
          limits: {
            scansPerMonth: 3000,
            maxRepos: 50,
            maxFilesPerRepo: 100000,
            aiFixesEnabled: true,
            teamFeaturesEnabled: true
          }
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 'Custom',
          interval: 'month',
          features: [
            'Unlimited scans',
            'Unlimited repositories',
            'Private LLM deployment',
            'On-premises installation',
            'Custom integrations',
            'Dedicated support',
            'SLA guarantees'
          ],
          limits: {
            scansPerMonth: -1,
            maxRepos: -1,
            maxFilesPerRepo: -1,
            aiFixesEnabled: true,
            teamFeaturesEnabled: true
          }
        }
      ];

      reply.send({ plans });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch plans' });
    }
  });

  // Create checkout session
  fastify.post('/checkout', async (request, reply) => {
    const { userId } = request.user;
    const { planId, interval = 'month', organizationId } = request.body;

    try {
      if (planId === 'free') {
        // Handle free plan subscription
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: 'FREE',
            status: 'ACTIVE',
            scansLimit: 10
          },
          update: {
            plan: 'FREE',
            status: 'ACTIVE',
            scansLimit: 10
          }
        });

        return reply.send({
          success: true,
          message: 'Successfully subscribed to free plan'
        });
      }

      if (planId === 'enterprise') {
        return reply.send({
          success: false,
          message: 'Please contact sales for Enterprise plan',
          contactEmail: 'sales@whisper-cli.dev'
        });
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      let variantId = process.env[`LEMON_SQUEEZY_${planId.toUpperCase()}_${interval.toUpperCase()}_VARIANT_ID`];
      let quantity = 1;
      let custom = { user_id: userId };

      if (planId === 'team') {
        if (!organizationId) {
          return reply.code(400).send({ error: 'organizationId is required for team plan' });
        }
        // Count team members
        const memberCount = await prisma.organizationMember.count({
          where: { organizationId }
        });
        if (memberCount < 1) {
          return reply.code(400).send({ error: 'No members found in organization' });
        }
        quantity = memberCount;
        custom.organization_id = organizationId;
      }

      if (!variantId) {
        return reply.code(400).send({
          error: 'Invalid plan configuration'
        });
      }

      const checkoutData = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              custom,
              ...(planId === 'team' ? { quantity } : {})
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: process.env.LEMON_SQUEEZY_STORE_ID
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId
              }
            }
          }
        }
      };

      const response = await lemonSqueezyApiInstance.post('/checkouts', checkoutData);
      const checkoutUrl = response.data.data.attributes.url;

      reply.send({
        success: true,
        checkoutUrl
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to create checkout session',
        message: error.message
      });
    }
  });

  // Handle Lemon Squeezy webhooks
  fastify.post('/webhook', {
    config: {
      rawBody: true
    }
  }, async (request, reply) => {
    try {
      const signature = request.headers['x-signature'];
      const body = request.rawBody;

      // Verify webhook signature
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET);
      hmac.update(body, 'utf8');
      const digest = Buffer.from('sha256=' + hmac.digest('hex'), 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
        return reply.code(401).send({ error: 'Invalid signature' });
      }

      const payload = JSON.parse(body);
      const eventName = payload.meta.event_name;
      const data = payload.data;

      switch (eventName) {
        case 'subscription_created':
          await handleSubscriptionCreated(data);
          break;
        case 'subscription_updated':
          await handleSubscriptionUpdated(data);
          break;
        case 'subscription_cancelled':
          await handleSubscriptionCancelled(data);
          break;
        case 'subscription_expired':
          await handleSubscriptionExpired(data);
          break;
        default:
          fastify.log.info(`Unhandled webhook event: ${eventName}`);
      }

      reply.send({ received: true });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Webhook processing failed' });
    }
  });

  // Get current subscription
  fastify.get('/subscription', async (request, reply) => {
    const { userId } = request.user;

    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription) {
        return reply.send({
          plan: 'FREE',
          status: 'INACTIVE',
          scansUsed: 0,
          scansLimit: 10
        });
      }

      reply.send(subscription);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch subscription' });
    }
  });

  // Cancel subscription
  fastify.post('/cancel', async (request, reply) => {
    const { userId } = request.user;

    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId }
      });

      if (!subscription || !subscription.lemonSqueezyId) {
        return reply.code(404).send({ error: 'No active subscription found' });
      }

      // Cancel subscription in Lemon Squeezy
      await lemonSqueezyApiInstance.patch(`/subscriptions/${subscription.lemonSqueezyId}`, {
        data: {
          type: 'subscriptions',
          id: subscription.lemonSqueezyId,
          attributes: {
            cancelled: true
          }
        }
      });

      // Update local subscription
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          canceledAt: new Date()
        }
      });

      reply.send({
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to cancel subscription' });
    }
  });

  // Helper functions for webhook handling
  async function handleSubscriptionCreated(data) {
    const userId = data.attributes.custom_data?.user_id;
    if (!userId) return;

    const planMapping = {
      'pro': 'PRO',
      'team': 'TEAM',
      'enterprise': 'ENTERPRISE'
    };

    const planName = data.attributes.product_name?.toLowerCase();
    const plan = planMapping[planName] || 'PRO';

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: 'ACTIVE',
        lemonSqueezyId: data.id,
        variantId: data.attributes.variant_id,
        customerId: data.attributes.customer_id,
        currentPeriodStart: new Date(data.attributes.created_at),
        currentPeriodEnd: new Date(data.attributes.renews_at),
        scansLimit: getPlanLimits(plan).scansPerMonth
      },
      update: {
        plan,
        status: 'ACTIVE',
        lemonSqueezyId: data.id,
        currentPeriodStart: new Date(data.attributes.created_at),
        currentPeriodEnd: new Date(data.attributes.renews_at),
        scansLimit: getPlanLimits(plan).scansPerMonth
      }
    });
  }

  async function handleSubscriptionUpdated(data) {
    await prisma.subscription.updateMany({
      where: { lemonSqueezyId: data.id },
      data: {
        status: data.attributes.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        currentPeriodEnd: new Date(data.attributes.renews_at)
      }
    });
  }

  async function handleSubscriptionCancelled(data) {
    await prisma.subscription.updateMany({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'CANCELLED',
        canceledAt: new Date()
      }
    });
  }

  async function handleSubscriptionExpired(data) {
    await prisma.subscription.updateMany({
      where: { lemonSqueezyId: data.id },
      data: {
        status: 'INACTIVE'
      }
    });
  }

  function getPlanLimits(plan) {
    const limits = {
      FREE: { scansPerMonth: 10 },
      PRO: { scansPerMonth: 300 },
      TEAM: { scansPerMonth: 3000 },
      ENTERPRISE: { scansPerMonth: -1 }
    };
    return limits[plan] || limits.FREE;
  }
};

export default billingRoutes;
