/**
 * Zod Schemas for API validation
 */

const { z } = require('zod');

const email = z.string().email().transform(e => e.toLowerCase().trim());

const userCreate = z.object({
  email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
});

const userUpdate = z.object({
  email: email.optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' });

const subscriberCreate = z.object({
  email,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
  sourcePath: z.string().max(255).optional(),
  marketingOptIn: z.boolean().optional(),
  _ts: z.number().optional(), // Anti-spam timestamp from popup
});

const subscriberUnsubscribe = z.object({
  email,
});

const campaignCreate = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  heading: z.string().max(200).optional(),
  body: z.string().min(1, 'Body is required'),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  ctaText: z.string().max(100).optional(),
});

const campaignUpdate = z.object({
  subject: z.string().min(1).max(200).optional(),
  heading: z.string().max(200).optional(),
  body: z.string().min(1).optional(),
  ctaUrl: z.string().url().optional().or(z.literal('')),
  ctaText: z.string().max(100).optional(),
});

const forgotPassword = z.object({
  email,
});

const resetPassword = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const blogPostCreate = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500).optional(),
  coverImage: z.string().optional(),
  published: z.boolean().optional().default(false),
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(300).optional(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const checkout = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  price: z.number().positive('Price must be positive'),
  email: email.optional(),
  productType: z.string().optional(),
  slug: z.string().optional(),
  imageUrl: z.string().optional(),
});

module.exports = {
  userCreate,
  userUpdate,
  subscriberCreate,
  subscriberUnsubscribe,
  campaignCreate,
  campaignUpdate,
  forgotPassword,
  resetPassword,
  blogPostCreate,
  checkout,
};
