const prisma = require("../../utils/prisma");
const { deleteSpacesFile } = require("../../utils/fileManager");
const { BLOG_POST_LIST_INCLUDES } = require("../../utils/prismaIncludes");
const blogService = require("../../lib/blogServiceClient");

async function getAllBlogPosts(request, response) {
  try {
    const limit = request.query.limit ? parseInt(request.query.limit) : 10;
    const page = request.query.page ? parseInt(request.query.page) : 1;
    const categoryName = request.query.categoryName;
    const search = request.query.search;
    const published = request.query.published === 'true';
    const isAdmin = request.query.mode === "admin";

    // Admin mode always reads from the local DB (drafts, unpublished, etc.)
    if (!isAdmin) {
      const serviceResult = await blogService.getArticles({ page, limit, categoryName, search });
      if (serviceResult) {
        return response.json(serviceResult);
      }
      console.log("[BLOG] Blog service unavailable, falling back to local DB");
    }

    // Local DB fallback (or admin mode)
    let queryOptions = {
      where: {
        published: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            firstName: true,
            avatar: true,

          },
        },
        category: {
          select: {
            name: true,
          },
        },
        tags: {
          select: {
            name: true,
          },
        },
      },
    };

    if (isAdmin) {
      queryOptions.where = {};
    }

    if (categoryName) {
      queryOptions.where.category = {
        name: categoryName
      };
    }

    if (search) {
      queryOptions.where.OR = [
        { title: { contains: search} },
        { content: { contains: search} },
        { excerpt: { contains: search} }
      ];
    }

    if (request.query.published !== undefined) {
      queryOptions.where.published = published;
    }

    const [posts, totalCount] = await Promise.all([
      prisma.blogPost.findMany(queryOptions),
      prisma.blogPost.count({ where: queryOptions.where }),
    ]);

    return response.json({
      posts,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error("[Blog] Error fetching blog posts:", error);
    return response.status(500).json({ error: "Error fetching blog posts" });
  }
}

async function _getBlogPost(where, request, response) {
  try {
    const post = await prisma.blogPost.findUnique({
      where,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!post) {
      response.status(404).json({ error: "Blog post not found" });
      return null;
    }

    return post;
  } catch (error) {
    console.error("[Blog] Error fetching blog post:", error);
    response.status(500).json({ error: "Error fetching blog post" });
    return null;
  }
}

async function getBlogPostBySlug(request, response) {
  // Try blog service first
  const serviceResult = await blogService.getArticleBySlug(request.params.slug);
  if (serviceResult && serviceResult !== 'unavailable') {
    return response.json(serviceResult);
  }
  if (serviceResult === null) {
    // Blog service says it does not exist, but try local DB as fallback
    // (covers posts not yet imported to the service)
  }
  if (serviceResult === 'unavailable') {
    console.log("[BLOG] Blog service unavailable for slug, falling back to local DB");
  }

  // Local DB fallback
  const post = await _getBlogPost({ slug: request.params.slug }, request, response);
  if (post) return response.json(post);
}

async function getBlogPostById(request, response) {
  const post = await _getBlogPost({ id: request.params.id }, request, response);
  if (post) return response.json({ post });
}

async function createBlogPost(request, response) {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      coverImage,
      published,
      metaTitle,
      metaDescription,
      authorId,
      categoryId,
      tags,
    } = request.body;
    
    // Create blog post
    const blogPost = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        coverImage,
        published: published || false,
        metaTitle,
        metaDescription,
        authorId,
        categoryId,
      },
    });
    
    // If tags are provided, batch upsert and connect them
    if (tags && tags.length > 0) {
      const existing = await prisma.tag.findMany({ where: { name: { in: tags } } });
      const existingNames = new Set(existing.map(t => t.name));
      const newTags = tags.filter(t => !existingNames.has(t));
      if (newTags.length > 0) {
        await prisma.tag.createMany({
          data: newTags.map(name => ({ name })),
          skipDuplicates: true,
        });
      }
      const allTags = await prisma.tag.findMany({ where: { name: { in: tags } } });
      await prisma.blogPost.update({
        where: { id: blogPost.id },
        data: { tags: { connect: allTags.map(t => ({ id: t.id })) } },
      });
    }
    
    // Return the created post with its relationships
    const createdPost = await prisma.blogPost.findUnique({
      where: { id: blogPost.id },
      include: BLOG_POST_LIST_INCLUDES,
    });
    
    return response.status(201).json(createdPost);
  } catch (error) {
    console.error("[Blog] Error creating blog post:", error);
    return response.status(500).json({ error: "Error creating blog post" });
  }
}

async function updateBlogPost(request, response) {
  try {
    const { id } = request.params;
    const {
      title,
      slug,
      content,
      excerpt,
      coverImage,
      published,
      metaTitle,
      metaDescription,
      authorId,
      categoryId,
      tags,
    } = request.body;
    
    // Check if the post exists
    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
    });
    
    if (!existingPost) {
      return response.status(404).json({ error: "Blog post not found" });
    }
    
    // Update the blog post
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        excerpt,
        coverImage,
        published,
        metaTitle,
        metaDescription,
        authorId,
        categoryId,
      },
    });
    
    // Handle tags if provided
    if (tags) {
      // First, disconnect all existing tags
      await prisma.blogPost.update({
        where: { id },
        data: {
          tags: {
            set: [], // Remove all existing connections
          },
        },
      });
      
      // Batch upsert and connect the new tags
      const existing = await prisma.tag.findMany({ where: { name: { in: tags } } });
      const existingNames = new Set(existing.map(t => t.name));
      const newTags = tags.filter(t => !existingNames.has(t));
      if (newTags.length > 0) {
        await prisma.tag.createMany({
          data: newTags.map(name => ({ name })),
          skipDuplicates: true,
        });
      }
      const allTags = await prisma.tag.findMany({ where: { name: { in: tags } } });
      await prisma.blogPost.update({
        where: { id },
        data: { tags: { connect: allTags.map(t => ({ id: t.id })) } },
      });
    }
    
    // Return the updated post with its relationships
    const result = await prisma.blogPost.findUnique({
      where: { id },
      include: BLOG_POST_LIST_INCLUDES,
    });
    
    return response.json(result);
  } catch (error) {
    console.error("[Blog] Error updating blog post:", error);
    return response.status(500).json({ error: "Error updating blog post" });
  }
}

async function deleteBlogPost(request, response) {
  try {
    const { id } = request.params;

    // Get the post first to clean up files
    const existingPost = await prisma.blogPost.findUnique({
      where: { id },
      select: { coverImage: true },
    });

    if (!existingPost) {
      return response.status(404).json({ error: "Blog post not found" });
    }

    // Delete cover image from Spaces
    if (!existingPost.coverImage?.startsWith('http')) {
      await deleteSpacesFile(existingPost.coverImage, 'blog', 'Blog');
    }

    // Delete the blog post (comments will be cascaded due to your schema)
    await prisma.blogPost.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("[Blog] Error deleting blog post:", error);
    return response.status(500).json({ error: "Error deleting blog post" });
  }
}

async function searchBlogPosts(request, response) {
  try {
    const { query } = request.query;
    
    if (!query) {
      return response.status(400).json({ error: "Query parameter is required" });
    }
    
    const posts = await prisma.blogPost.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
            },
          },
          {
            content: {
              contains: query,
            },
          },
          {
            excerpt: {
              contains: query,
            },
          },
        ],
        AND: {
          published: true, // Only search published posts
        },
      },
      include: BLOG_POST_LIST_INCLUDES,
    });

    return response.json(posts);
  } catch (error) {
    console.error("[Blog] Error searching blog posts:", error);
    return response.status(500).json({ error: "Error searching blog posts" });
  }
}

module.exports = {
  getAllBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  searchBlogPosts,
};