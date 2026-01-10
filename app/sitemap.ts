import { MetadataRoute } from 'next';

const BASE_URL = 'https://fatbigquiz.com';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fatbigquiz.com';

interface Product {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
}

interface BlogPost {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
  published: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Fetch products
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const productsRes = await fetch(`${API_BASE_URL}/api/products`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (productsRes.ok) {
      const products: Product[] = await productsRes.json();
      productPages = products.map((product) => ({
        url: `${BASE_URL}/product/${product.slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  // Fetch blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const blogRes = await fetch(`${API_BASE_URL}/api/blog`, {
      next: { revalidate: 3600 },
    });
    if (blogRes.ok) {
      const data = await blogRes.json();
      // API returns { posts: [...] } structure
      const posts: BlogPost[] = Array.isArray(data) ? data : (data.posts || []);
      blogPages = posts
        .filter((post) => post.published)
        .map((post) => ({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
    }
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error);
  }

  // Fetch categories for shop filter pages
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categoriesRes = await fetch(`${API_BASE_URL}/api/categories?type=PRODUCT`, {
      next: { revalidate: 3600 },
    });
    if (categoriesRes.ok) {
      const categories: Category[] = await categoriesRes.json();
      categoryPages = categories.map((category) => ({
        url: `${BASE_URL}/shop?category=${encodeURIComponent(category.name)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
  }

  return [...staticPages, ...productPages, ...blogPages, ...categoryPages];
}
