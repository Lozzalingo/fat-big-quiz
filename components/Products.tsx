import React from "react";
import ProductItem from "./ProductItem";
import SetTotalPages from "./SetTotalPages";
import { Product } from "@/types/products";

const Products = async ({ slug }: any) => {
  // getting all data from URL slug and preparing everything for sending GET request
  // Default is true (both checked) when param is absent from URL
  const inStockNum = slug?.searchParams?.inStock === "false" ? 0 : 1;
  const outOfStockNum = slug?.searchParams?.outOfStock === "false" ? 0 : 1;
  const page = slug?.searchParams?.page ? Number(slug?.searchParams?.page) : 1;

  // Determine stock filter mode based on checkbox state
  // "lte" = show all (stock <= 1 covers both in and out of stock)
  // "equals" = in stock only (stock = 1)
  // "lt" = out of stock only (stock < 1, i.e. 0)
  // null = no filter, show everything (default when nothing is checked)
  let stockMode: string | null = null;

  if (inStockNum === 1 && outOfStockNum === 1) {
    stockMode = "lte"; // both checked - show all
  } else if (inStockNum === 1) {
    stockMode = "equals"; // in stock only
  } else if (outOfStockNum === 1) {
    stockMode = "lt"; // out of stock only
  }
  // If neither is checked, stockMode stays null - no filter applied

  // Extract quiz format, category, and search filters from URL params
  const quizFormatFilter = slug?.searchParams?.quizFormat || "";
  const categoryFilter = slug?.searchParams?.category || slug?.params?.slug || "";
  const searchFilter = slug?.searchParams?.search || "";

  // Build query string for quiz format, category, and search filters
  let extraFilters = "";
  if (quizFormatFilter) {
    extraFilters += `filters[quizFormat][$equals]=${quizFormatFilter}&`;
  }
  if (categoryFilter) {
    extraFilters += `filters[category][$equals]=${categoryFilter}&`;
  }
  if (searchFilter) {
    extraFilters += `search=${encodeURIComponent(searchFilter)}&`;
  }

  // Build stock filter segment only when a stock filter is active
  const stockFilter = stockMode ? `&filters[inStock][$${stockMode}]=1` : "";

  // sending API request with filtering, sorting and pagination for getting all products
  const data = await fetch(
   `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products?filters[price][$lte]=${
      slug?.searchParams?.price || 3000
    }&filters[rating][$gte]=${
      Number(slug?.searchParams?.rating) || 0
    }${stockFilter}&${extraFilters}sort=${slug?.searchParams?.sort}&page=${page}`
  );

  const responseData = await data.json();

  // API now returns { products, totalPages, totalCount } instead of a plain array
  const products = Array.isArray(responseData) ? responseData : responseData.products || [];
  const totalPages = responseData.totalPages || 1;

  return (
    <>
      <SetTotalPages totalPages={totalPages} />
      <div className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-5 max-[1300px]:grid-cols-3 max-lg:grid-cols-2">
        {products.length > 0 ? (
          products.map((product: Product) => (
            <ProductItem key={product.id} product={product} color="black" />
          ))
        ) : (
          <h3 className="text-3xl mt-5 text-center w-full col-span-full max-[1000px]:text-2xl max-[500px]:text-lg">
            No products found for specified query
          </h3>
        )}
      </div>
    </>
  );
};

export default Products;
