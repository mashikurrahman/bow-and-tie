import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import WishlistPage from './pages/WishlistPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import FaqPage from './pages/FaqPage'
import CustomOrderPage from './pages/CustomOrderPage'
import LoginPage from './pages/LoginPage'
import AccountPage from './pages/AccountPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import TrackOrderPage from './pages/TrackOrderPage'
import PromotionPage from './pages/PromotionPage'
import { ShippingPage, ReturnsPage, PrivacyPage, NotFoundPage } from './pages/InfoPages'
// Admin panel is code-split so the storefront bundle stays small (no recharts for shoppers).
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'))
const AdminOrders = lazy(() => import('./admin/pages/AdminOrders'))
const AdminProducts = lazy(() => import('./admin/pages/AdminProducts'))
const AdminProductForm = lazy(() => import('./admin/pages/AdminProductForm'))
const AdminCustomers = lazy(() => import('./admin/pages/AdminCustomers'))
const AdminPromotions = lazy(() => import('./admin/pages/AdminPromotions'))
const AdminCoupons = lazy(() => import('./admin/pages/AdminCoupons'))
const AdminSettings = lazy(() => import('./admin/pages/AdminSettings'))

export default function App() {
  return (
    <Routes>
      {/* Storefront */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="/track" element={<TrackOrderPage />} />
        <Route path="/promotions/:id" element={<PromotionPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/custom-order" element={<CustomOrderPage />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin panel (lazy-loaded) */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Suspense fallback={<div className="admin-loading">Loading admin…</div>}>
              <AdminLayout />
            </Suspense>
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="promotions" element={<AdminPromotions />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
