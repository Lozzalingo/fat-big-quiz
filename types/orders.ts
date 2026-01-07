export interface Order {
  id: string;
  address: string;
  apartment: string;
  company: string;
  dateTime: string;
  email: string;
  lastname: string;
  name: string;
  phone: string;
  postalCode: string;
  status: "processing" | "canceled" | "delivered";
  city: string;
  country: string;
  orderNotice?: string;
  total: number;
}

export interface OrderProduct {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  product?: {
    title: string;
    price: number;
    mainImage: string;
  };
}
