import { Product } from "./products";

export interface ProductInCart {
  id: string;
  title: string;
  price: number;
  image: string;
  amount: number;
  slug: string;
}

export interface CartState {
  cart: ProductInCart[];
  allQuantity: number;
  totalPrice: number;
}

export interface CartActions {
  addToCart: (product: Product, amount: number) => void;
  removeFromCart: (id: string) => void;
  incrementQuantity: (id: string) => void;
  decrementQuantity: (id: string) => void;
  clearCart: () => void;
  calculateTotals: () => void;
}

export interface WishlistState {
  wishlist: string[];
}

export interface WishlistActions {
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

export interface SortState {
  sortBy: string;
}

export interface SortActions {
  setSortBy: (sort: string) => void;
}

export interface PaginationState {
  currentPage: number;
}

export interface PaginationActions {
  setCurrentPage: (page: number) => void;
}
