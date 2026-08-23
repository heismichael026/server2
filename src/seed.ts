import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database';
import ProductModel from './modules/products/product.model';
import BlogModel from './modules/blogs/blog.model';

const products = [
  {
    name: 'Jollof Rice',
    description: 'Smoky Nigerian jollof rice cooked with fresh tomatoes, peppers, and spices.',
    price: 3500,
    category: 'Rice',
    available: true,
    image: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg',
  },
  {
    name: 'Fried Rice',
    description: 'Colorful fried rice with vegetables, liver, and seasoning.',
    price: 3500,
    category: 'Rice',
    available: true,
    image: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg',
  },
  {
    name: 'Grilled Chicken',
    description: 'Juicy grilled chicken marinated in our special spice blend.',
    price: 3000,
    category: 'Protein',
    available: true,
    image: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg',
  },
  {
    name: 'Beef Suya',
    description: 'Spicy skewered beef coated in yaji pepper and groundnuts.',
    price: 2500,
    category: 'Protein',
    available: true,
    image: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg',
  },
  {
    name: 'Pepper Soup',
    description: 'Aromatic Nigerian pepper soup with catfish and traditional herbs.',
    price: 4000,
    category: 'Soups',
    available: true,
    image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg',
  },
  {
    name: 'Pounded Yam & Egusi',
    description: 'Smooth pounded yam served with rich egusi soup and assorted meat.',
    price: 5000,
    category: 'Swallow',
    available: true,
    image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg',
  },
  {
    name: 'Plantain (Dodo)',
    description: 'Sweet fried ripe plantain — a Nigerian classic.',
    price: 1500,
    category: 'Sides',
    available: true,
    image: 'https://images.pexels.com/photos/2255925/pexels-photo-2255925.jpeg',
  },
  {
    name: 'Meat Pie',
    description: 'Flaky pastry filled with seasoned minced beef and vegetables.',
    price: 1000,
    category: 'Snacks',
    available: true,
    image: 'https://images.pexels.com/photos/2255925/pexels-photo-2255925.jpeg',
  },
  {
    name: 'Chapman',
    description: 'Refreshing Nigerian cocktail with citrus, grenadine, and cucumber.',
    price: 1500,
    category: 'Drinks',
    available: true,
    image: 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg',
  },
  {
    name: 'Zobo Drink',
    description: 'Chilled hibiscus drink infused with ginger and pineapple.',
    price: 1000,
    category: 'Drinks',
    available: true,
    image: 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg',
  },
];

const blogs = [
  {
    title: 'The History of Jollof Rice: A West African Icon',
    slug: 'history-of-jollof-rice',
    excerpt: 'Discover the origins of one of West Africa’s most beloved dishes and why it sparks friendly rivalries between nations.',
    content: `Jollof rice is more than just a meal — it is a cultural phenomenon that unites and divides West Africa in equal measure.

## Origins

The dish traces its roots to the Wolof people of the Senegambian region. Over centuries, it spread across West Africa, with each country adding its own twist.

## The Jollof Wars

Nigeria and Ghana have a long-standing, good-natured rivalry over who makes the best jollof rice. Nigerians pride themselves on the smoky, party-style jollof cooked over firewood, while Ghanaians argue for their own aromatic version.

## Our Recipe

At our restaurant, we use a blend of fresh tomatoes, red bell peppers, scotch bonnet, and a secret spice mix that gives our jollof its signature smoky flavor. Come taste the difference today.`,
    image: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg',
    published: true,
    publishedAt: new Date('2025-01-15'),
  },
  {
    title: '5 Nigerian Snacks You Need to Try',
    slug: '5-nigerian-snacks-you-need-to-try',
    excerpt: 'From meat pies to puff puff, here are five Nigerian snacks that will change the way you think about street food.',
    content: `Nigerian snacks are packed with flavor and perfect for any time of day.

## 1. Meat Pie
A flaky pastry filled with minced beef, potatoes, and carrots.

## 2. Puff Puff
Sweet, golden fried dough balls — impossible to eat just one.

## 3. Suya
Spicy grilled meat coated in yaji pepper.

## 4. Chin Chin
Crunchy fried dough bites, sweet and slightly nutmeggy.

## 5. Boli
Roasted plantain, best enjoyed with groundnuts.

Visit us to try these snacks fresh from our kitchen!`,
    image: 'https://images.pexels.com/photos/2255925/pexels-photo-2255925.jpeg',
    published: true,
    publishedAt: new Date('2025-02-10'),
  },
  {
    title: 'How We Source Our Ingredients',
    slug: 'how-we-source-our-ingredients',
    excerpt: 'Quality starts with ingredients. Learn how we partner with local farmers to bring you the freshest meals.',
    content: `We believe great food starts with great ingredients.

## Local Partnerships

We work directly with local farmers and markets to source fresh produce daily. This ensures our vegetables are always crisp and our proteins are always fresh.

## Sustainability

By sourcing locally, we reduce our carbon footprint and support the community that supports us.

## Quality You Can Taste

Every dish we serve is a reflection of our commitment to quality. Taste the difference in every bite.`,
    image: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg',
    published: true,
    publishedAt: new Date('2025-03-05'),
  },
];

async function seed() {
  console.info('[seed] Connecting to database...');
  await connectDatabase();

  console.info('[seed] Clearing existing products and blogs...');
  await ProductModel.deleteMany({});
  await BlogModel.deleteMany({});

  console.info('[seed] Inserting products...');
  await ProductModel.insertMany(products);

  console.info('[seed] Inserting blogs...');
  await BlogModel.insertMany(blogs);

  console.info('[seed] Seed complete!');
  console.info(`[seed] Inserted ${products.length} products and ${blogs.length} blog posts.`);

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
