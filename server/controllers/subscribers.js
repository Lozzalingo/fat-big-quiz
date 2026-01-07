const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function handler(req, res) {
  const { email } = req.query;

  if (req.method === 'GET') {
    const subscriber = await prisma.subscriber.findUnique({ where: { email } });
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });
    return res.status(200).json(subscriber);
  }

  if (req.method === 'DELETE') {
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (!existing) return res.status(404).json({ error: 'Subscriber not found' });

    await prisma.subscriber.delete({ where: { email } });
    return res.status(204).end();
  }

  if (req.method === 'PUT') {
    try {
      const existing = await prisma.subscriber.findUnique({ where: { email } });
      if (!existing) return res.status(404).json({ error: 'Subscriber not found' });

      const { optIn } = req.body;
      
      // Update the subscriber
      const updatedSubscriber = await prisma.subscriber.update({
        where: { email },
        data: { 
          optIn: optIn !== undefined ? optIn : existing.optIn
        },
      });

      return res.status(200).json(updatedSubscriber);
    } catch (error) {
      console.error('Error updating subscriber:', error);
      return res.status(500).json({ error: 'Error updating subscriber' });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE', 'PUT']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

async function updateSubscriberByEmail(req, res) {
  try {
    const { email } = req.params;
    const { optIn } = req.body;

    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    const updatedSubscriber = await prisma.subscriber.update({
      where: { email },
      data: { 
        optIn: optIn !== undefined ? optIn : subscriber.optIn
      },
    });

    return res.status(200).json(updatedSubscriber);
  } catch (error) {
    console.error('Error updating subscriber by email:', error);
    return res.status(500).json({ error: 'Error updating subscriber' });
  }
}

async function deleteSubscriberByEmail(req, res) {
  try {
    const { email } = req.params;

    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    await prisma.subscriber.delete({
      where: { email },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting subscriber by email:', error);
    return res.status(500).json({ error: 'Error deleting subscriber' });
  }
}

async function updateSubscriberOptIn(request, response) {
  try {
    const { email, optIn } = request.body;

    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return response.status(404).json({ error: 'Subscriber not found' });
    }

    const updatedSubscriber = await prisma.subscriber.update({
      where: { email },
      data: { optIn },
    });

    return response.status(200).json({ message: 'Subscriber updated', subscriber: updatedSubscriber });
  } catch (error) {
    console.error('Error updating subscriber:', error);
    return response.status(500).json({ error: 'Error updating subscriber' });
  }
}

async function createSubscriber(request, response) {
  try {
    const { email } = request.body;

    // Check if email already exists
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      // If subscriber exists but optIn is false, we can update it
      if (existingSubscriber.optIn === false) {
        const updatedSubscriber = await prisma.subscriber.update({
          where: { email },
          data: { optIn: true },
        });
        return response.status(200).json({ message: 'Subscription reactivated', subscriber: updatedSubscriber });
      }
      return response.status(400).json({ error: 'Email already subscribed' });
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        email,
        subscribedAt: new Date(),
        optIn: true, // GDPR compliance
      },
    });

    return response.status(201).json({ message: 'Subscribed successfully', subscriber });
  } catch (error) {
    console.error('Error creating subscriber:', error);
    return response.status(500).json({ error: 'Error subscribing' });
  }
}

async function getAllSubscribers(request, response) {
  try {
    const subscribers = await prisma.subscriber.findMany();
    return response.json(subscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return response.status(500).json({ error: 'Error fetching subscribers' });
  }
}

async function getSubscriberByEmail(request, response) {
  try {
    const { email } = request.params;
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return response.status(404).json({ error: 'Subscriber not found' });
    }

    return response.status(200).json(subscriber);
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    return response.status(500).json({ error: 'Error fetching subscriber' });
  }
}

async function deleteSubscriber(request, response) {
  try {
    const { id } = request.params;
    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return response.status(404).json({ error: 'Subscriber not found' });
    }

    await prisma.subscriber.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return response.status(500).json({ error: 'Error deleting subscriber' });
  }
}

module.exports = {
  createSubscriber,
  getAllSubscribers,
  getSubscriberByEmail,
  updateSubscriberByEmail,
  deleteSubscriber,
  handler,
  updateSubscriberOptIn,
  deleteSubscriberByEmail,
};