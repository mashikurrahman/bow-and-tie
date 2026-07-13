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
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AccountPage from './pages/AccountPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrderInvoicePage from './pages/OrderInvoicePage'
import TrackOrderPage from './pages/TrackOrderPage'
import PromotionPage from './pages/PromotionPage'
import { ShippingPage, ReturnsPage, PrivacyPage, NotFoundPage } from './pages/InfoPages'
// Admin panel is code-split so the storefront bundle stays small (no recharts for shoppers).
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'))
const AdminOrders = lazy(() => import('./admin/pages/AdminOrders'))
const AdminReturns = lazy(() => import('./admin/pages/AdminReturns'))
const AdminReviews = lazy(() => import('./admin/pages/AdminReviews'))
const AdminInventory = lazy(() => import('./admin/pages/AdminInventory'))
const AdminProducts = lazy(() => import('./admin/pages/AdminProducts'))
const AdminProductForm = lazy(() => import('./admin/pages/AdminProductForm'))
const AdminImport = lazy(() => import('./admin/pages/AdminImport'))
const AdminCustomers = lazy(() => import('./admin/pages/AdminCustomers'))
const AdminReports = lazy(() => import('./admin/pages/AdminReports'))
const AdminQuestions = lazy(() => import('./admin/pages/AdminQuestions'))
const AdminStaff = lazy(() => import('./admin/pages/AdminStaff'))
const AdminOrderPrint = lazy(() => import('./admin/pages/AdminOrderPrint'))
const AdminBulkPrint = lazy(() => import('./admin/pages/AdminBulkPrint'))
const AdminCampaigns = lazy(() => import('./admin/pages/AdminCampaigns'))
const AdminCustomerDetail = lazy(() => import('./admin/pages/AdminCustomerDetail'))
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
        <Route path="/orders/:id/invoice" element={<RequireAuth><OrderInvoicePage /></RequireAuth>} />
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
        <Route path="orders/:id" element={<AdminOrderPrint />} />
        <Route path="print-slips" element={<AdminBulkPrint />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductForm />} />
        <Route path="products/:id/edit" element={<AdminProductForm />} />
        <Route path="import" element={<AdminImport />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/:id" element={<AdminCustomerDetail />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="questions" element={<AdminQuestions />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="promotions" element={<AdminPromotions />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}
