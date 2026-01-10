"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlistStore } from "@/app/store/wishlistStore";
import CartElement from "@/components/CartElement";
import HeartElement from "@/components/HeartElement";
import { getUserAvatarUrl } from "@/utils/cdn";

import {
  FaRegUser,
  FaShoppingCart,
  FaHeart,
  FaBars,
  FaTimes,
  FaHome,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaCog,
  FaUserEdit,
  FaBook,
  FaRocket,
  FaDownload
} from "react-icons/fa";

const EnhancedHeader = () => {
  const { data: session }: any = useSession();
  const pathname = usePathname();
  const { wishlist, setWishlist, wishQuantity } = useWishlistStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const isAdminPage = pathname?.startsWith("/admin") === true;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setTimeout(() => signOut(), 800);
    toast.success("Logout successful!");
  };

  const getWishlistByUserId = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wishlist/${id}`, {
        cache: "no-store",
      });
      const wishlist = await response.json();
      const productArray: {
        id: string;
        title: string;
        price: number;
        image: string;
        slug: string;
        stockAvailability: number;
      }[] = [];

      wishlist.map((item: any) =>
        productArray.push({
          id: item?.product?.id,
          title: item?.product?.title,
          price: item?.product?.price,
          image: item?.product?.mainImage,
          slug: item?.product?.slug,
          stockAvailability: item?.product?.inStock,
        })
      );

      setWishlist(productArray);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const getUserByEmail = async () => {
    if (session?.user?.email) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${session?.user?.email}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (data?.id) {
          setUserId(data.id);
          setAvatar(data.avatar || null);
          setRole(data.role || "user");
          getWishlistByUserId(data.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
  };

  useEffect(() => {
    getUserByEmail();
  }, [session?.user?.email, wishlist.length]);

  const getImageSrc = (avatar: string | null) => {
    return avatar ? getUserAvatarUrl(avatar) : "/default-avatar.png";
  };

  const navLinks = [
    { href: "/", label: "Home", icon: FaHome },
    { href: "/shop", label: "Quizzes", icon: FaShoppingCart },
    { href: "/blog", label: "Blog", icon: FaBook },
  ];

  // Don't render main header on admin pages (admin has its own sidebar)
  if (isAdminPage) {
    return null;
  }

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'shadow-xl' : 'shadow-lg'}`}>
      {/* Main Navigation */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 transition-transform group-hover:scale-110">
                <Image
                  src="/logo.png"
                  alt="Fat Big Quiz"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-white font-bold text-base sm:text-xl">
                Fat Big Quiz
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-white/90 hover:text-white font-medium transition-colors ${
                    pathname === link.href ? 'text-white' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://app.fatbigquiz.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-primary font-semibold px-4 py-2 rounded-lg hover:bg-white/90 transition-all"
              >
                <FaRocket className="text-sm" />
                Launch App
              </a>
            </nav>

            {/* Desktop Auth & Cart */}
            <div className="hidden lg:flex items-center gap-4">
              {!session ? (
                <>
                  <Link
                    href="/login"
                    className="text-white/90 hover:text-white font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-white/20 text-white font-medium px-4 py-2 rounded-lg hover:bg-white/30 transition-all"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  {role === "admin" && (
                    <Link
                      href="/admin"
                      className="text-white/90 hover:text-white font-medium transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/purchases"
                    className="text-white/90 hover:text-white font-medium transition-colors"
                  >
                    My Purchases
                  </Link>
                  <Link href="/profile/edit" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50">
                      <img
                        src={getImageSrc(avatar)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    data-track-button="Header:Logout"
                    className="text-white/90 hover:text-white font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
              <div className="flex items-center gap-3 ml-2">
                <HeartElement wishQuantity={wishQuantity} />
                <CartElement />
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-track-button="Header:Toggle Mobile Menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <FaTimes className="text-2xl" />
              ) : (
                <FaBars className="text-2xl" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-primary-dark border-t border-white/10"
          >
            <div className="max-w-screen-2xl mx-auto px-4 py-4">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <link.icon className="text-lg" />
                    {link.label}
                  </Link>
                ))}

                <a
                  href="https://app.fatbigquiz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white text-primary font-semibold px-4 py-3 rounded-lg mt-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FaRocket />
                  Launch App
                </a>

                <div className="border-t border-white/10 mt-2 pt-2">
                  {!session ? (
                    <>
                      <Link
                        href="/login"
                        className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FaSignInAlt />
                        Login
                      </Link>
                      <Link
                        href="/register"
                        className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FaUserPlus />
                        Register
                      </Link>
                    </>
                  ) : (
                    <>
                      {role === "admin" && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <FaCog />
                          Admin Panel
                        </Link>
                      )}
                      <Link
                        href="/purchases"
                        className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FaDownload />
                        My Purchases
                      </Link>
                      <Link
                        href="/profile/edit"
                        className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FaUserEdit />
                        Edit Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        data-track-button="Header:Logout Mobile"
                        className="flex items-center gap-3 text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all w-full"
                      >
                        <FaSignOutAlt />
                        Logout
                      </button>
                    </>
                  )}
                </div>

                <div className="flex gap-4 justify-center mt-4 pt-4 border-t border-white/10">
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-white/90 hover:text-white"
                  >
                    <FaHeart />
                    <span>Wishlist ({wishQuantity})</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-white/90 hover:text-white"
                  >
                    <FaShoppingCart />
                    <span>Cart</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default EnhancedHeader;
