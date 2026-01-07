// Global type declarations
// For new code, import from @/types instead

// Re-export types for backwards compatibility
import type {
  Product,
  SingleProductPageProps,
  ProductInWishlist,
  OtherImages,
  SingleProductBtnProps,
  WishListItem,
} from "@/types/products";

import type { Category } from "@/types/categories";
import type { User } from "@/types/user";
import type { Order, OrderProduct } from "@/types/orders";

// Make types globally available
declare global {
  interface Product extends import("@/types/products").Product {}
  interface Category extends import("@/types/categories").Category {}
  interface User extends import("@/types/user").User {}
  interface Order extends import("@/types/orders").Order {}
}
