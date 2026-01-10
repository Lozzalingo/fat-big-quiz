export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  Breadcrumb,
  Filters,
  Pagination,
  Products,
  SortBy,
  ShopSearch,
} from "@/components";
import React, { Suspense } from "react";

// improve readabillity of category text, for example category text "smart-watches" will be "smart watches"
const improveCategoryText = (text: string): string => {
  if (text.indexOf("-") !== -1) {
    let textArray = text.split("-");

    return textArray.join(" ");
  } else {
    return text;
  }
};

const ShopPage = (slug: any) => {
  
  return (
    <div className="text-black bg-white">
      <div className=" max-w-screen-2xl mx-auto px-10 max-sm:px-5">
        <Breadcrumb />
        <div className="grid grid-cols-[200px_1fr] gap-x-10 max-md:grid-cols-1 max-md:gap-y-5">
          <Filters />
          <div>
            <div className="flex justify-between items-center max-lg:flex-col max-lg:gap-y-5 mb-4">
              <h2 className="text-2xl font-bold max-sm:text-xl max-[400px]:text-lg uppercase">
                {slug?.params?.slug && slug?.params?.slug[0]?.length > 0
                  ? improveCategoryText(slug?.params?.slug[0])
                  : "All products"}
              </h2>

              <div className="flex items-center gap-4 max-lg:flex-col max-lg:w-full">
                <Suspense fallback={<div className="w-full max-w-md h-10 bg-gray-100 animate-pulse" />}>
                  <ShopSearch />
                </Suspense>
                <SortBy />
              </div>
            </div>
            <div className="divider"></div>
            <Products slug={slug} />
            <Pagination />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
