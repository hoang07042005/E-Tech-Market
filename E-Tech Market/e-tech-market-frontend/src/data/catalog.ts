import heroImg from '../assets/unnamed (1).png'
import cpuImg from '../assets/unnamed.png'
import headphonesImg from '../assets/headphones.png'
import smarthomeImg from '../assets/smarthome.png'

export type ProductCategory =
  | 'laptops'
  | 'smartphones'
  | 'audio'
  | 'smart-home'
  | 'gaming'
  | 'accessories'

export type CatalogProduct = {
  id: number
  name: string
  category: ProductCategory
  /** Giá hiển thị */
  price: string
  /** Giá số (USD) để sắp xếp */
  priceValue: number
  originalPrice?: string
  image: string
  rating: number
  isNew?: boolean
  discount?: string
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  laptops: 'Laptop',
  smartphones: 'Điện thoại',
  audio: 'Âm thanh',
  'smart-home': 'Nhà thông minh',
  gaming: 'Gaming',
  accessories: 'Phụ kiện',
}

export const CATEGORY_ORDER: ProductCategory[] = [
  'laptops',
  'smartphones',
  'audio',
  'smart-home',
  'gaming',
  'accessories',
]

/** Danh sách đầy đủ cho trang sản phẩm */
export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 1,
    name: 'MacBook Pro M3 Max 14"',
    category: 'laptops',
    price: '$3,199.00',
    priceValue: 3199,
    originalPrice: '$3,499.00',
    image: heroImg,
    rating: 5,
    isNew: true,
    discount: '-9%',
  },
  {
    id: 2,
    name: 'Titan CPU X-1 Pro Gen 5',
    category: 'gaming',
    price: '$599.00',
    priceValue: 599,
    image: cpuImg,
    rating: 4.8,
  },
  {
    id: 3,
    name: 'Studio Monitor X-Pro',
    category: 'accessories',
    price: '$899.00',
    priceValue: 899,
    originalPrice: '$1,099.00',
    image: heroImg,
    rating: 4.9,
    discount: '-18%',
  },
  {
    id: 4,
    name: 'iPhone 15 Pro Max 512GB',
    category: 'smartphones',
    price: '$1,299.00',
    priceValue: 1299,
    image: heroImg,
    rating: 5,
    isNew: true,
  },
  {
    id: 5,
    name: 'Sony WH-1000XM5',
    category: 'audio',
    price: '$399.00',
    priceValue: 399,
    image: headphonesImg,
    rating: 4.7,
  },
  {
    id: 6,
    name: 'Apple AirPods Pro 2',
    category: 'audio',
    price: '$249.00',
    priceValue: 249,
    image: headphonesImg,
    rating: 4.6,
  },
  {
    id: 7,
    name: 'Nest Hub Max',
    category: 'smart-home',
    price: '$229.00',
    priceValue: 229,
    image: smarthomeImg,
    rating: 4.5,
  },
  {
    id: 8,
    name: 'Philips Hue Starter Kit',
    category: 'smart-home',
    price: '$199.00',
    priceValue: 199,
    image: smarthomeImg,
    rating: 4.4,
  },
  {
    id: 9,
    name: 'RTX 4080 Founders Edition',
    category: 'gaming',
    price: '$1,199.00',
    priceValue: 1199,
    image: cpuImg,
    rating: 4.9,
  },
  {
    id: 10,
    name: 'Logitech MX Master 3S',
    category: 'accessories',
    price: '$99.00',
    priceValue: 99,
    image: heroImg,
    rating: 4.8,
  },
  {
    id: 11,
    name: 'Samsung Galaxy S24 Ultra',
    category: 'smartphones',
    price: '$1,199.00',
    priceValue: 1199,
    image: heroImg,
    rating: 4.8,
    isNew: true,
  },
  {
    id: 12,
    name: 'Keychron Q1 Pro',
    category: 'accessories',
    price: '$199.00',
    priceValue: 199,
    image: heroImg,
    rating: 4.7,
  },
]
