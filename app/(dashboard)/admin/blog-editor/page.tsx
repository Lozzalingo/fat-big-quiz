"use client";
import { DashboardSidebar } from "@/components";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { getBlogImageUrl } from "@/utils/cdn";

const DashboardBlog = () => {
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: 10,
  });

  const handlePageChange = (pageNumber: number) => {
    setPagination(prev => ({...prev, currentPage: pageNumber}));
    // Fetch data for the selected page
    fetchBlogPosts(pageNumber);
  };
  
  // Update fetchBlogPosts to accept page parameter
  const fetchBlogPosts = async (page = 1) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog?mode=admin&page=${page}&perPage=${pagination.perPage}`);
      const data = await response.json();
      setBlogPosts(data.posts);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    }
  };

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Blog Posts</h1>
            <Link href="/admin/blog-editor/new">
              <button
                type="button"
                className="uppercase bg-blue-500 px-6 py-2 text-lg border border-black border-gray-300 font-bold text-white shadow-sm hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2"
              >
                Add New Post
              </button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
            <thead>
              <tr>
                <th>Title</th>
                <th>Cover Image</th>
                <th>Published</th>
                <th>Created</th>
                <th>Author</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogPosts.map((post) => {
                const imageSrc = getBlogImageUrl(post.coverImage);

                return (
                  <tr key={nanoid()}>
                    <td>{post.title}</td>
                    <td>
                    <img
                        src={imageSrc}
                        alt={post.title}
                        style={{ width: "60px", height: "40px", objectFit: "cover" }}
                      />
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          post.published ? "badge-success" : "badge-error"
                        }`}
                      >
                        {post.published ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                    <td>{post.author?.firstName || "Unknown"}</td>
                    <td>{post.category?.name || "Uncategorized"}</td>
                    <td>
                      <Link href={`/admin/blog-editor/${post.id}`}>
                        <button className="btn-edit btn btn-sm">Edit</button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="join">
                {Array.from({ length: pagination.pages }, (_, i) => (
                    <button
                    key={i}
                    className={`join-item btn ${pagination.currentPage === i + 1 ? "btn-active" : ""}`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardBlog;