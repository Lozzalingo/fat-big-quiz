export interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  rating: number;
  description: string;
  mainImage: string;
  manufacturer: string;
  categoryId: string;
  category?: { name: string };
  inStock: number;
}

export interface SingleProductPageProps {
  params: {
    productSlug: string;
  };
}

export type ProductInWishlist = {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailability: number;
};

export interface OtherImages {
  imageID: number;
  productID: number;
  image: string;
}

export interface SingleProductBtnProps {
  product: Product;
  quantityCount: number;
}

export interface WishListItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
}
