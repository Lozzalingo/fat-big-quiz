"use client";
import Link from 'next/link'
import React from 'react'
import { FaCartShopping } from 'react-icons/fa6'
import { useProductStore } from "@/app/store/store";

const CartElement = () => {
    const { allQuantity } = useProductStore();
  return (
    <div className="relative">
            <Link href="/cart">
              <FaCartShopping className="text-base text-white" />
              <span className="block w-3 h-3 font-bold bg-red-600 text-white rounded-full flex justify-center items-center absolute top-[-8px] right-[-6px] text-[9px]">
                { allQuantity }
              </span>
            </Link>
          </div>
  )
}

export default CartElement