export type Review = {
  name: string
  rating: number
  title?: string
  date: string
  text: string
  images?: string[]
  verified?: boolean
}

export type Variant = {
  id: string
  label: string
  color?: string
  size?: string
  price: number
  stock: number
  image?: string
  inStock: boolean
}

export type Product = {
  id: string
  name: string
  category: string
  price: number
  originalPrice: number
  rating: number
  reviews: number
  badge: string
  description: string
  fabric: string
  delivery: string
  palette?: [string, string]
  colors: string[]
  sizes: string[]
  inStock: boolean
  featured?: boolean
  image: string
  gallery?: string[]
  reviewList?: Review[]
  stock?: number
  createdAt?: string
  variants?: Variant[]
  sale?: { price: number; percent: number; title: string; promotionId: string } | null
}

export const storeName = 'Bow Clips and Hair Accessories'
export const whatsappNumber = '8801XXXXXXXXX' // TODO: replace with the real WhatsApp business number

export const storeIntro = {
  tagline: 'Elegant accessories for everyday styling and special moments.',
  description:
    'Handcrafted boutique bows, clips, silk pieces, and custom-made hair accessories, made with love in Dhaka, Bangladesh.',
}

export const categories = ['All', 'Bows', 'Clips', 'Silk', 'Sets', 'Custom']

const sampleReviews = (base: string): Review[] => [
  {
    name: 'Nusrat J.',
    rating: 5,
    date: '2026-05-12',
    text: `The ${base} came exactly like the photos and the packaging felt premium.`,
  },
  {
    name: 'Sadia M.',
    rating: 5,
    date: '2026-04-28',
    text: 'Beautiful quality and my daughter loves it. Will order again!',
  },
  {
    name: 'Arif H.',
    rating: 4,
    date: '2026-04-02',
    text: 'Great value and fast delivery inside Dhaka. Recommended.',
  },
]

export const products: Product[] = [
  {
    id: 'satin-cloud-bow',
    name: 'Satin Cloud Bow Clip',
    category: 'Bows',
    price: 450,
    originalPrice: 550,
    rating: 4.9,
    reviews: 128,
    badge: 'Best Seller',
    description:
      'Soft satin bow with a secure clip for school days, gifting, and daily wear. Double-layered for a full, cloud-like shape that holds through the day.',
    fabric: 'Double-layer satin',
    delivery: '2-4 days in Dhaka',
    palette: ['#F7DDE4', '#F2B5C8'],
    colors: ['Blush Pink', 'Ivory', 'Sky Blue', 'Lavender'],
    sizes: ['Small', 'Medium', 'Large'],
    inStock: true,
    featured: true,
    image: '/satin-cloud-bow.png',
    reviewList: sampleReviews('satin bow'),
  },
  {
    id: 'velvet-heart-set',
    name: 'Velvet Heart Set',
    category: 'Sets',
    price: 890,
    originalPrice: 1080,
    rating: 4.8,
    reviews: 91,
    badge: 'New',
    description:
      'Matching bow pair designed for twins, siblings, or a polished matching look. Rich velvet with a soft satin lining that is gentle on hair.',
    fabric: 'Velvet with satin lining',
    delivery: 'Custom colors available',
    palette: ['#5F355E', '#D7A1C3'],
    colors: ['Wine', 'Emerald', 'Navy'],
    sizes: ['One Size'],
    inStock: true,
    featured: true,
    image: '/velvet-heart-set.png',
    reviewList: sampleReviews('velvet set'),
  },
  {
    id: 'rose-garden-clip',
    name: 'Rose Garden Clip',
    category: 'Clips',
    price: 320,
    originalPrice: 380,
    rating: 4.7,
    reviews: 74,
    badge: 'Popular',
    description:
      'Floral accent clip with a lightweight hold for festive and casual outfits. Delicate organza flower detail that stands out in photos.',
    fabric: 'Organza flower detail',
    delivery: 'Delivery across Bangladesh',
    palette: ['#F7C3B4', '#E97A77'],
    colors: ['Coral', 'White', 'Peach'],
    sizes: ['Small', 'Medium'],
    inStock: true,
    image: '/rose-garden-clip.png',
    reviewList: sampleReviews('rose clip'),
  },
  {
    id: 'silk-ribbon-bow',
    name: 'Silk Ribbon Bow',
    category: 'Silk',
    price: 520,
    originalPrice: 620,
    rating: 4.9,
    reviews: 56,
    badge: 'Premium',
    description:
      'Lustrous silk bow with a smooth finish, made for premium gift-ready packaging. A timeless piece that pairs with both casual and formal looks.',
    fabric: 'Silk ribbon',
    delivery: 'Made to order in 24 hours',
    palette: ['#D9C0A5', '#9F6D58'],
    colors: ['Champagne', 'Rose Gold', 'Pearl'],
    sizes: ['Medium', 'Large'],
    inStock: true,
    image: '/silk-ribbon-bow.png',
    reviewList: sampleReviews('silk bow'),
  },
  {
    id: 'everyday-mini-clips',
    name: 'Everyday Mini Clips',
    category: 'Clips',
    price: 290,
    originalPrice: 360,
    rating: 4.6,
    reviews: 143,
    badge: 'Value Pack',
    description:
      'Small everyday clips in a versatile set designed for daily school styling. Comes as a pack of six in mixed complementary shades.',
    fabric: 'Mix fabric finish',
    delivery: 'Budget-friendly shipping',
    palette: ['#A7C7E7', '#E5F0FB'],
    colors: ['Pastel Mix', 'Neutral Mix', 'Bright Mix'],
    sizes: ['One Size'],
    inStock: true,
    image: '/everyday-mini-clips.png',
    reviewList: sampleReviews('mini clips'),
  },
  {
    id: 'custom-name-bow',
    name: 'Custom Name Bow',
    category: 'Custom',
    price: 650,
    originalPrice: 800,
    rating: 5.0,
    reviews: 39,
    badge: 'Custom',
    description:
      'Personalized bow with name styling. Great for birthdays, events, and gifts. Approve the design digitally before we start production.',
    fabric: 'Satin with printed lettering',
    delivery: 'Approve design before production',
    palette: ['#FAD6A5', '#FFB56B'],
    colors: ['Pink + Gold', 'Blue + Silver', 'Custom'],
    sizes: ['Medium', 'Large'],
    inStock: true,
    featured: true,
    image: '/satin-cloud-bow.png',
    reviewList: sampleReviews('custom bow'),
  },
  {
    id: 'festival-gift-box',
    name: 'Festival Gift Box',
    category: 'Sets',
    price: 1250,
    originalPrice: 1480,
    rating: 4.8,
    reviews: 62,
    badge: 'Gift Ready',
    description:
      'Curated trio set with matching accessories packaged for gifting and events. Arrives gift-wrapped with a handwritten note option.',
    fabric: 'Mixed premium materials',
    delivery: 'Gift wrap included',
    palette: ['#F6E7B7', '#D9B66F'],
    colors: ['Festive Red', 'Golden', 'Pastel'],
    sizes: ['One Size'],
    inStock: true,
    image: '/hero-boutique.png',
    reviewList: sampleReviews('gift box'),
  },
  {
    id: 'moonlight-bow',
    name: 'Moonlight Bow',
    category: 'Bows',
    price: 410,
    originalPrice: 500,
    rating: 4.7,
    reviews: 52,
    badge: 'Elegant',
    description:
      'Minimal satin bow with a soft shine that pairs easily with everyday outfits. Understated and elegant for those who love a classic look.',
    fabric: 'Matte satin',
    delivery: 'Ships from Dhaka',
    palette: ['#DDE6EF', '#AFC1D3'],
    colors: ['Silver Grey', 'Powder Blue', 'White'],
    sizes: ['Small', 'Medium', 'Large'],
    inStock: false,
    image: '/satin-cloud-bow.png',
    reviewList: sampleReviews('moonlight bow'),
  },
]

// Give every product a small gallery for the detail page. Uses existing
// boutique images so thumbnails work out of the box; replace per-product later.
const galleryPool = [
  '/satin-cloud-bow.png',
  '/velvet-heart-set.png',
  '/rose-garden-clip.png',
  '/silk-ribbon-bow.png',
  '/everyday-mini-clips.png',
  '/hero-boutique.png',
]
for (const p of products) {
  if (!p.gallery) {
    const others = galleryPool.filter((img) => img !== p.image).slice(0, 3)
    p.gallery = [p.image, ...others]
  }
}

export const getProduct = (id: string) => products.find((p) => p.id === id)

export const getRelated = (product: Product, limit = 4) =>
  products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, limit)

export const trustPoints = [
  { icon: '🚚', title: 'Nationwide Delivery', text: 'Fast courier delivery across Bangladesh, 2-4 days in Dhaka.' },
  { icon: '💵', title: 'Cash on Delivery', text: 'Pay when you receive, plus bKash & Nagad support.' },
  { icon: '🎀', title: 'Handmade Quality', text: 'Every piece is handcrafted with premium, kid-safe materials.' },
  { icon: '✨', title: 'Custom Orders', text: 'Personalized name bows and matching sets for any occasion.' },
]

export const testimonials = [
  {
    name: 'Nusrat J.',
    text: 'The bows came exactly like the photos and the packaging felt premium.',
  },
  {
    name: 'Arif H.',
    text: 'Great for custom orders. The team was quick to confirm the design.',
  },
  {
    name: 'Sadia M.',
    text: 'The site feels polished and makes the shop look much more trustworthy.',
  },
]

export const faqs = [
  {
    question: 'How do I place an order?',
    answer:
      'Browse the shop, add items to your cart, and go to checkout. Fill in your delivery details and choose Cash on Delivery, bKash, or Nagad. You can also order directly on WhatsApp.',
  },
  {
    question: 'What are the delivery charges?',
    answer:
      'Delivery is 120 BDT inside and outside Dhaka. Orders above 2,500 BDT get free delivery. Dhaka orders usually arrive in 2-4 days.',
  },
  {
    question: 'Can I order a custom or name bow?',
    answer:
      'Yes! Use the Custom Order page to share your design, colors, and name text. We send you a digital preview to approve before production.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Cash on Delivery, bKash, and Nagad. For bKash/Nagad, send payment to our merchant number and share the transaction ID during checkout.',
  },
  {
    question: 'Do you accept returns or exchanges?',
    answer:
      'Yes, within 3 days of delivery for unused items in original condition. Custom-made items are non-returnable unless they arrive damaged.',
  },
]

export const promoCodes: Record<string, number> = {
  EID25: 0.25,
  WELCOME10: 0.1,
  BOW15: 0.15,
}
