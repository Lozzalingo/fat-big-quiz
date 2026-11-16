import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ProductInCart = {
  id: string;
  title: string;
  price: number;
  image: string;
  amount: number;
  slug?: string;
};

export type AppliedDiscount = {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
};

export type State = {
  products: ProductInCart[];
  allQuantity: number;
  total: number;
  sidebarOpen: boolean;
  discount: AppliedDiscount | null;
  discountedTotal: number;
};

export type Actions = {
  addToCart: (newProduct: ProductInCart) => void;
  removeFromCart: (id: string) => void;
  updateCartAmount: (id: string, quantity: number) => void;
  calculateTotals: () => void;
  clearCart: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  applyDiscount: (discount: AppliedDiscount) => void;
  removeDiscount: () => void;
};

export const useProductStore = create<State & Actions>()(
  persist(
    (set) => ({
      products: [],
      allQuantity: 0,
      total: 0,
      sidebarOpen: false,
      discount: null,
      discountedTotal: 0,
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      addToCart: (newProduct) => {
        set((state) => {
          const cartItem = state.products.find(
            (item) => item.id === newProduct.id
          );
          if (!cartItem) {
            return { products: [...state.products, newProduct] };
          } else {
            state.products.map((product) => {
              if (product.id === cartItem.id) {
                product.amount += newProduct.amount;
              }
            });
          }
          return { products: [...state.products] };
        });
      },
      clearCart: () => {
        set(() => ({
          products: [],
          allQuantity: 0,
          total: 0,
          discount: null,
          discountedTotal: 0,
        }));
      },
      removeFromCart: (id) => {
        set((state) => {
          state.products = state.products.filter(
            (product: ProductInCart) => product.id !== id
          );
          return { products: state.products };
        });
      },

      calculateTotals: () => {
        set((state) => {
          let amount = 0;
          let total = 0;
          state.products.forEach((item) => {
            amount += item.amount;
            total += item.amount * item.price;
          });

          // Recalculate discount amount based on new total
          let discountedTotal = total;
          let updatedDiscount = state.discount;
          if (updatedDiscount) {
            let discountAmount = 0;
            if (updatedDiscount.discountType === 'PERCENTAGE') {
              discountAmount = Math.round((total * updatedDiscount.discountValue) / 100 * 100) / 100;
            } else {
              discountAmount = Math.min(updatedDiscount.discountValue, total);
            }
            updatedDiscount = { ...updatedDiscount, discountAmount };
            discountedTotal = Math.max(total - discountAmount, 0);
          }

          return {
            products: state.products,
            allQuantity: amount,
            total: total,
            discount: updatedDiscount,
            discountedTotal,
          };
        });
      },
      applyDiscount: (discount) => {
        set((state) => {
          const total = state.total;
          const discountedTotal = Math.max(total - discount.discountAmount, 0);
          return { discount, discountedTotal };
        });
      },
      removeDiscount: () => {
        set((state) => ({
          discount: null,
          discountedTotal: state.total,
        }));
      },
      updateCartAmount: (id, amount) => {
        set((state) => {
          const cartItem = state.products.find((item) => item.id === id);

          if (!cartItem) {
            return { products: [...state.products] };
          } else {
            state.products.map((product) => {
              if (product.id === cartItem.id) {
                product.amount = amount;
              }
            });
          }

          return { products: [...state.products] };
        });
      },
    }),
    {
      name: "products-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
