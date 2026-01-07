const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { deleteFromSpaces, getKey } = require("../utils/spaces");

async function getAllBlogPosts(request, response) {
  try {
    const limit = request.query.limit ? parseInt(request.query.limit) : 10;
    const page = request.query.page ? parseInt(request.query.page) : 1;
    const categoryName = request.query.categoryName;
    const search = request.query.search;
    const published = request.query.published === 'true';
    
    // Base query options
    let queryOptions = {
      where: {
        published: true, // By default, only show published posts
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc', // Most recent posts first
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
    
    // Check if we're in admin mode
    if (request.query.mode === "admin") {
      // In admin mode, show all posts including unpublished
      queryOptions.where = {};
    }
    
    // Filter by category name if specified
    if (categoryName) {
      queryOptions.where.category = {
        name: categoryName
      };
    }
    
    // Filter by search if specified
    if (search) {
      queryOptions.where.OR = [
        { title: { contains: search} },
        { content: { contains: search} },
        { excerpt: { contains: search} }
      ];
    }
    
    // Override published filter if specifically requested
    if (request.query.published !== undefined) {
      queryOptions.where.published = published;
    }
    
    const posts = await prisma.blogPost.findMany(queryOptions);
    
    // Get total count for pagination
    const totalCount = await prisma.blogPost.count({
      where: queryOptions.where,
    });
    
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
    console.error("Error fetching blog posts:", error);
    return response.status(500).json({ error: "Error fetching blog posts" });
  }
}

async function getBlogPostBySlug(request, response) {
  try {
    const { slug } = request.params;
    const post = await prisma.blogPost.findUnique({
      where: {
        slug,
      },
      include: {
        author: {
          select: {
            firstName: true,
            avatar: true,
            bio: true,
            name: true,
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
            createdAt: 'desc',
          },
        },
      },
    });
    
    if (!post) {
      return response.status(404).json({ error: "Blog post not found" });
    }
    
    return response.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return response.status(500).json({ error: "Error fetching blog post" });
  }
}

async function getBlogPostById(request, response) {
    try {
      const { id } = request.params;
      const post = await prisma.blogPost.findUnique({
        where: {
          id,
        },
        include: {
          author: {
            select: {
              firstName: true,
              avatar: true,
              bio: true,
              name: true,
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
        return response.status(404).json({ error: "Blog post not found" });
      }
  
      response.json({ post });
    } catch (error) {
      console.error("Error fetching blog post:", error);
      response.status(500).json({ error: "Error fetching blog post" });
    }
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
    
    // If tags are provided, connect them
    if (tags && tags.length > 0) {
      // For each tag, connect or create it
      for (const tagName of tags) {
        await prisma.tag.upsert({
          where: { name: tagName },
          update: {
            posts: {
              connect: { id: blogPost.id },
            },
          },
          create: {
            name: tagName,
            posts: {
              connect: { id: blogPost.id },
            },
          },
        });
      }
    }
    
    // Return the created post with its relationships
    const createdPost = await prisma.blogPost.findUnique({
      where: { id: blogPost.id },
      include: {
        author: {
          select: {
            firstName: true,
            name: true,
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
    });
    
    return response.status(201).json(createdPost);
  } catch (error) {
    console.error("Error creating blog post:", error);
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
      
      // Then, connect or create the new tags
      for (const tagName of tags) {
        await prisma.tag.upsert({
          where: { name: tagName },
          update: {
            posts: {
              connect: { id },
            },
          },
          create: {
            name: tagName,
            posts: {
              connect: { id },
            },
          },
        });
      }
    }
    
    // Return the updated post with its relationships
    const result = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            firstName: true,
            name: true,
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
    });
    
    return response.json(result);
  } catch (error) {
    console.error("Error updating blog post:", error);
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
    if (existingPost.coverImage && !existingPost.coverImage.startsWith('http')) {
      try {
        const imageKey = getKey(existingPost.coverImage, 'blog');
        await deleteFromSpaces(imageKey);
        console.log(`Deleted blog cover image from Spaces: ${imageKey}`);
      } catch (err) {
        console.error(`Error deleting blog cover image: ${err.message}`);
      }
    }

    // Delete the blog post (comments will be cascaded due to your schema)
    await prisma.blogPost.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting blog post:", error);
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
      include: {
        author: {
          select: {
            firstName: true,
            name: true,
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
    });
    
    return response.json(posts);
  } catch (error) {
    console.error("Error searching blog posts:", error);
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