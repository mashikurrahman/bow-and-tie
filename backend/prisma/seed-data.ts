// Seed catalog — mirrors the storefront's initial products, plus a costPrice
// (buying cost) per item so the future admin panel can compute profit.

export const promoSeed = [
  { code: 'EID25', rate: 0.25 },
  { code: 'WELCOME10', rate: 0.1 },
  { code: 'BOW15', rate: 0.15 },
]

const gallery = (main: string) =>
  [main, '/velvet-heart-set.png', '/rose-garden-clip.png', '/silk-ribbon-bow.png']
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4)

const reviewsFor = (base: string) => [
  { name: 'Nusrat J.', rating: 5, date: '2026-05-12', text: `The ${base} came exactly like the photos and the packaging felt premium.` },
  { name: 'Sadia M.', rating: 5, date: '2026-04-28', text: 'Beautiful quality and my daughter loves it. Will order again!' },
  { name: 'Arif H.', rating: 4, date: '2026-04-02', text: 'Great value and fast delivery inside Dhaka. Recommended.' },
]

export const productSeed = [
  {
    id: 'satin-cloud-bow', name: 'Satin Cloud Bow Clip', category: 'Bows',
    price: 450, originalPrice: 550, costPrice: 260, stock: 40, rating: 4.9, reviewsCount: 128,
    badge: 'Best Seller', description: 'Soft satin bow with a secure clip for school days, gifting, and daily wear. Double-layered for a full, cloud-like shape that holds through the day.',
    fabric: 'Double-layer satin', delivery: '2-4 days in Dhaka',
    colors: ['Blush Pink', 'Ivory', 'Sky Blue', 'Lavender'], sizes: ['Small', 'Medium', 'Large'],
    image: '/satin-cloud-bow.png', gallery: gallery('/satin-cloud-bow.png'), inStock: true, featured: true, reviews: reviewsFor('satin bow'),
  },
  {
    id: 'velvet-heart-set', name: 'Velvet Heart Set', category: 'Sets',
    price: 890, originalPrice: 1080, costPrice: 520, stock: 25, rating: 4.8, reviewsCount: 91,
    badge: 'New', description: 'Matching bow pair designed for twins, siblings, or a polished matching look. Rich velvet with a soft satin lining that is gentle on hair.',
    fabric: 'Velvet with satin lining', delivery: 'Custom colors available',
    colors: ['Wine', 'Emerald', 'Navy'], sizes: ['One Size'],
    image: '/velvet-heart-set.png', gallery: gallery('/velvet-heart-set.png'), inStock: true, featured: true, reviews: reviewsFor('velvet set'),
  },
  {
    id: 'rose-garden-clip', name: 'Rose Garden Clip', category: 'Clips',
    price: 320, originalPrice: 380, costPrice: 170, stock: 60, rating: 4.7, reviewsCount: 74,
    badge: 'Popular', description: 'Floral accent clip with a lightweight hold for festive and casual outfits. Delicate organza flower detail that stands out in photos.',
    fabric: 'Organza flower detail', delivery: 'Delivery across Bangladesh',
    colors: ['Coral', 'White', 'Peach'], sizes: ['Small', 'Medium'],
    image: '/rose-garden-clip.png', gallery: gallery('/rose-garden-clip.png'), inStock: true, featured: false, reviews: reviewsFor('rose clip'),
  },
  {
    id: 'silk-ribbon-bow', name: 'Silk Ribbon Bow', category: 'Silk',
    price: 520, originalPrice: 620, costPrice: 300, stock: 30, rating: 4.9, reviewsCount: 56,
    badge: 'Premium', description: 'Lustrous silk bow with a smooth finish, made for premium gift-ready packaging. A timeless piece that pairs with both casual and formal looks.',
    fabric: 'Silk ribbon', delivery: 'Made to order in 24 hours',
    colors: ['Champagne', 'Rose Gold', 'Pearl'], sizes: ['Medium', 'Large'],
    image: '/silk-ribbon-bow.png', gallery: gallery('/silk-ribbon-bow.png'), inStock: true, featured: false, reviews: reviewsFor('silk bow'),
  },
  {
    id: 'everyday-mini-clips', name: 'Everyday Mini Clips', category: 'Clips',
    price: 290, originalPrice: 360, costPrice: 140, stock: 100, rating: 4.6, reviewsCount: 143,
    badge: 'Value Pack', description: 'Small everyday clips in a versatile set designed for daily school styling. Comes as a pack of six in mixed complementary shades.',
    fabric: 'Mix fabric finish', delivery: 'Budget-friendly shipping',
    colors: ['Pastel Mix', 'Neutral Mix', 'Bright Mix'], sizes: ['One Size'],
    image: '/everyday-mini-clips.png', gallery: gallery('/everyday-mini-clips.png'), inStock: true, featured: false, reviews: reviewsFor('mini clips'),
  },
  {
    id: 'custom-name-bow', name: 'Custom Name Bow', category: 'Custom',
    price: 650, originalPrice: 800, costPrice: 350, stock: 999, rating: 5.0, reviewsCount: 39,
    badge: 'Custom', description: 'Personalized bow with name styling. Great for birthdays, events, and gifts. Approve the design digitally before we start production.',
    fabric: 'Satin with printed lettering', delivery: 'Approve design before production',
    colors: ['Pink + Gold', 'Blue + Silver', 'Custom'], sizes: ['Medium', 'Large'],
    image: '/satin-cloud-bow.png', gallery: gallery('/satin-cloud-bow.png'), inStock: true, featured: true, reviews: reviewsFor('custom bow'),
  },
  {
    id: 'festival-gift-box', name: 'Festival Gift Box', category: 'Sets',
    price: 1250, originalPrice: 1480, costPrice: 720, stock: 18, rating: 4.8, reviewsCount: 62,
    badge: 'Gift Ready', description: 'Curated trio set with matching accessories packaged for gifting and events. Arrives gift-wrapped with a handwritten note option.',
    fabric: 'Mixed premium materials', delivery: 'Gift wrap included',
    colors: ['Festive Red', 'Golden', 'Pastel'], sizes: ['One Size'],
    image: '/hero-boutique.png', gallery: gallery('/hero-boutique.png'), inStock: true, featured: false, reviews: reviewsFor('gift box'),
  },
  {
    id: 'moonlight-bow', name: 'Moonlight Bow', category: 'Bows',
    price: 410, originalPrice: 500, costPrice: 230, stock: 0, rating: 4.7, reviewsCount: 52,
    badge: 'Elegant', description: 'Minimal satin bow with a soft shine that pairs easily with everyday outfits. Understated and elegant for those who love a classic look.',
    fabric: 'Matte satin', delivery: 'Ships from Dhaka',
    colors: ['Silver Grey', 'Powder Blue', 'White'], sizes: ['Small', 'Medium', 'Large'],
    image: '/satin-cloud-bow.png', gallery: gallery('/satin-cloud-bow.png'), inStock: false, featured: false, reviews: reviewsFor('moonlight bow'),
  },
]
