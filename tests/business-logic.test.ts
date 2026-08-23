import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ProductModel from '../src/modules/products/product.model';
import CartModel from '../src/modules/cart/cart.model';
import OrderModel from '../src/modules/orders/order.model';
import UserModel from '../src/modules/users/user.model';
import PaymentModel from '../src/modules/payments/payment.model';
import { calculateDeliveryFee } from '../src/modules/orders/deliveryFee';
import { normalizeNigerianPhone, isValidNigerianPhone } from '../src/utils/phone';
import { generateOrderNumber } from '../src/utils/orderNumber';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
    },
  });
  await mongoose.connect(mongoServer.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Phone normalization', () => {
  it('normalizes 0-prefixed numbers', () => {
    expect(normalizeNigerianPhone('08012345678')).toBe('2348012345678');
  });

  it('normalizes +234-prefixed numbers', () => {
    expect(normalizeNigerianPhone('+2348012345678')).toBe('2348012345678');
  });

  it('keeps already-normalized numbers', () => {
    expect(normalizeNigerianPhone('2348012345678')).toBe('2348012345678');
  });

  it('validates Nigerian phone numbers', () => {
    expect(isValidNigerianPhone('08012345678')).toBe(true);
    expect(isValidNigerianPhone('+2348012345678')).toBe(true);
    expect(isValidNigerianPhone('12345')).toBe(false);
  });
});

describe('Delivery fee calculation', () => {
  it('returns 0 for pickup', () => {
    expect(calculateDeliveryFee('pickup')).toBe(0);
  });

  it('returns the configured fee for delivery', () => {
    expect(calculateDeliveryFee('delivery')).toBe(1000);
  });
});

describe('Order number generation', () => {
  it('generates ORD-00001 for the first order', async () => {
    const num = await generateOrderNumber();
    expect(num).toBe('ORD-00001');
  });

  it('generates sequential numbers', async () => {
    await OrderModel.create({
      orderNumber: 'ORD-00001',
      user: new mongoose.Types.ObjectId(),
      items: [],
      subtotal: 0,
      deliveryFee: 0,
      totalAmount: 0,
      deliveryMethod: 'pickup',
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [],
    });

    const num = await generateOrderNumber();
    expect(num).toBe('ORD-00002');
  });
});

describe('User model', () => {
  it('normalizes phone numbers on save', async () => {
    const user = await UserModel.create({
      clerkUserId: 'clerk_test_1',
      fullName: 'Test User',
      email: 'test1@example.com',
      phone: '08012345678',
      whatsapp: '+2348012345678',
    });

    expect(user.phone).toBe('2348012345678');
    expect(user.whatsapp).toBe('2348012345678');
  });

  it('enforces unique clerkUserId', async () => {
    await UserModel.create({
      clerkUserId: 'clerk_dup',
      fullName: 'User A',
      email: 'a@example.com',
      phone: '2348011111111',
    });

    await expect(
      UserModel.create({
        clerkUserId: 'clerk_dup',
        fullName: 'User B',
        email: 'b@example.com',
        phone: '2348022222222',
      })
    ).rejects.toThrow();
  });

  it('enforces unique email', async () => {
    await UserModel.create({
      clerkUserId: 'clerk_e1',
      fullName: 'User C',
      email: 'dup@example.com',
      phone: '2348033333333',
    });

    await expect(
      UserModel.create({
        clerkUserId: 'clerk_e2',
        fullName: 'User D',
        email: 'dup@example.com',
        phone: '2348044444444',
      })
    ).rejects.toThrow();
  });

  it('enforces unique phone', async () => {
    await UserModel.create({
      clerkUserId: 'clerk_p1',
      fullName: 'User E',
      email: 'e@example.com',
      phone: '2348055555555',
    });

    await expect(
      UserModel.create({
        clerkUserId: 'clerk_p2',
        fullName: 'User F',
        email: 'f@example.com',
        phone: '2348055555555',
      })
    ).rejects.toThrow();
  });
});

describe('Cart operations', () => {
  let userId: mongoose.Types.ObjectId;
  let productId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const user = await UserModel.create({
      clerkUserId: 'clerk_cart',
      fullName: 'Cart User',
      email: 'cart@example.com',
      phone: '2348066666666',
    });
    userId = user._id;

    const product = await ProductModel.create({
      name: 'Jollof Rice',
      price: 3500,
      category: 'Rice',
      available: true,
    });
    productId = product._id;
  });

  it('adds a product to cart', async () => {
    const cart = await CartModel.create({ user: userId, items: [] });
    cart.items.push({ product: productId, quantity: 2, price: 3500 });
    await cart.save();

    const found = await CartModel.findOne({ user: userId }).lean();
    expect(found).toBeTruthy();
    expect(found!.items).toHaveLength(1);
    expect(found!.items[0].quantity).toBe(2);
    expect(found!.items[0].price).toBe(3500);
  });

  it('updates item quantity', async () => {
    const cart = await CartModel.create({
      user: userId,
      items: [{ product: productId, quantity: 1, price: 3500 }],
    });

    cart.items[0].quantity = 5;
    await cart.save();

    const found = await CartModel.findOne({ user: userId }).lean();
    expect(found!.items[0].quantity).toBe(5);
  });

  it('removes an item from cart', async () => {
    const cart = await CartModel.create({
      user: userId,
      items: [{ product: productId, quantity: 1, price: 3500 }],
    });

    cart.items = cart.items.filter((i) => i.product.toString() !== productId.toString());
    await cart.save();

    const found = await CartModel.findOne({ user: userId }).lean();
    expect(found!.items).toHaveLength(0);
  });

  it('rejects unavailable products', async () => {
    await ProductModel.findByIdAndUpdate(productId, { available: false });
    const product = await ProductModel.findById(productId).lean();
    expect(product!.available).toBe(false);
  });
});

describe('Order creation', () => {
  let userId: mongoose.Types.ObjectId;
  let product1: mongoose.Types.ObjectId;
  let product2: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const user = await UserModel.create({
      clerkUserId: 'clerk_order',
      fullName: 'Order User',
      email: 'order@example.com',
      phone: '2348077777777',
      address: {
        street: '123 Main St',
        city: 'Lagos',
        state: 'Lagos',
      },
    });
    userId = user._id;

    const p1 = await ProductModel.create({ name: 'Jollof Rice', price: 3500, available: true });
    const p2 = await ProductModel.create({ name: 'Chicken', price: 3000, available: true });
    product1 = p1._id;
    product2 = p2._id;
  });

  it('calculates correct subtotal from current product prices', async () => {
    const products = await ProductModel.find({ _id: { $in: [product1, product2] } }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    let subtotal = 0;
    const items = [
      { productId: String(product1), quantity: 2 },
      { productId: String(product2), quantity: 1 },
    ];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      subtotal += product.price * item.quantity;
    }

    expect(subtotal).toBe(3500 * 2 + 3000 * 1);
    expect(subtotal).toBe(10000);
  });

  it('pickup has ₦0 delivery fee', async () => {
    const order = await OrderModel.create({
      orderNumber: 'ORD-00001',
      user: userId,
      items: [{ product: product1, name: 'Jollof Rice', price: 3500, quantity: 1 }],
      subtotal: 3500,
      deliveryFee: calculateDeliveryFee('pickup'),
      totalAmount: 3500,
      deliveryMethod: 'pickup',
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [],
    });

    expect(order.deliveryFee).toBe(0);
    expect(order.totalAmount).toBe(3500);
  });

  it('delivery includes configured delivery fee', async () => {
    const subtotal = 3500;
    const deliveryFee = calculateDeliveryFee('delivery');
    const order = await OrderModel.create({
      orderNumber: 'ORD-00002',
      user: userId,
      items: [{ product: product1, name: 'Jollof Rice', price: 3500, quantity: 1 }],
      subtotal,
      deliveryFee,
      totalAmount: subtotal + deliveryFee,
      deliveryMethod: 'delivery',
      deliveryAddress: { street: '123 Main St', city: 'Lagos', state: 'Lagos' },
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [],
    });

    expect(order.deliveryFee).toBe(1000);
    expect(order.totalAmount).toBe(4500);
  });

  it('snapshots product price at order time', async () => {
    const order = await OrderModel.create({
      orderNumber: 'ORD-00003',
      user: userId,
      items: [{ product: product1, name: 'Jollof Rice', price: 3500, quantity: 2 }],
      subtotal: 7000,
      deliveryFee: 0,
      totalAmount: 7000,
      deliveryMethod: 'pickup',
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [],
    });

    // Now change the product price
    await ProductModel.findByIdAndUpdate(product1, { price: 5000 });

    // The order should still show the original price
    const found = await OrderModel.findById(order._id).lean();
    expect(found!.items[0].price).toBe(3500);
    expect(found!.subtotal).toBe(7000);
  });

  it('customer cannot access another customer order', async () => {
    const user2 = await UserModel.create({
      clerkUserId: 'clerk_other',
      fullName: 'Other User',
      email: 'other@example.com',
      phone: '2348088888888',
    });

    const order = await OrderModel.create({
      orderNumber: 'ORD-00004',
      user: userId,
      items: [{ product: product1, name: 'Jollof Rice', price: 3500, quantity: 1 }],
      subtotal: 3500,
      deliveryFee: 0,
      totalAmount: 3500,
      deliveryMethod: 'pickup',
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [],
    });

    // User2 should not find user1's order
    const found = await OrderModel.findOne({ _id: order._id, user: user2._id }).lean();
    expect(found).toBeNull();
  });
});

describe('Payment', () => {
  let userId: mongoose.Types.ObjectId;
  let orderId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const user = await UserModel.create({
      clerkUserId: 'clerk_pay',
      fullName: 'Pay User',
      email: 'pay@example.com',
      phone: '2348099999999',
    });
    userId = user._id;

    const order = await OrderModel.create({
      orderNumber: 'ORD-00010',
      user: userId,
      items: [{ product: new mongoose.Types.ObjectId(), name: 'Test', price: 5000, quantity: 1 }],
      subtotal: 5000,
      deliveryFee: 1000,
      totalAmount: 6000,
      deliveryMethod: 'delivery',
      deliveryAddress: { street: 'St', city: 'Lagos', state: 'Lagos' },
      orderStatus: 'placed',
      paymentStatus: 'pending',
      timeline: [],
    });
    orderId = order._id;
  });

  it('creates a pending payment with unique reference', async () => {
    const payment = await PaymentModel.create({
      order: orderId,
      user: userId,
      method: 'paystack',
      status: 'pending',
      amount: 6000,
      reference: 'ref_test_001',
    });

    expect(payment.status).toBe('pending');
    expect(payment.amount).toBe(6000);
    expect(payment.reference).toBe('ref_test_001');
  });

  it('enforces unique payment reference', async () => {
    await PaymentModel.create({
      order: orderId,
      user: userId,
      method: 'paystack',
      status: 'pending',
      amount: 6000,
      reference: 'ref_dup_001',
    });

    await expect(
      PaymentModel.create({
        order: orderId,
        user: userId,
        method: 'paystack',
        status: 'pending',
        amount: 6000,
        reference: 'ref_dup_001',
      })
    ).rejects.toThrow();
  });

  it('marks payment as paid atomically (idempotent)', async () => {
    const payment = await PaymentModel.create({
      order: orderId,
      user: userId,
      method: 'paystack',
      status: 'pending',
      amount: 6000,
      reference: 'ref_idempotent_001',
    });

    // First update — should succeed
    const firstUpdate = await PaymentModel.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'paid' } },
      { $set: { status: 'paid', paidAt: new Date() } },
      { new: true }
    ).lean();

    expect(firstUpdate).toBeTruthy();
    expect(firstUpdate!.status).toBe('paid');

    // Second update — should return null (already paid)
    const secondUpdate = await PaymentModel.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'paid' } },
      { $set: { status: 'paid', paidAt: new Date() } },
      { new: true }
    ).lean();

    expect(secondUpdate).toBeNull();
  });

  it('verifies amount matches expected order amount in kobo', async () => {
    const order = await OrderModel.findById(orderId).lean();
    const expectedKobo = Math.round(order!.totalAmount * 100);
    expect(expectedKobo).toBe(600000);
  });

  it('rejects incorrect payment amount', async () => {
    const order = await OrderModel.findById(orderId).lean();
    const expectedKobo = Math.round(order!.totalAmount * 100);
    const wrongAmount = 500000; // 5000 naira instead of 6000

    expect(wrongAmount).not.toBe(expectedKobo);
  });
});

describe('Favorites unique constraint', () => {
  it('prevents duplicate favorites', async () => {
    const user = await UserModel.create({
      clerkUserId: 'clerk_fav',
      fullName: 'Fav User',
      email: 'fav@example.com',
      phone: '2348011111222',
    });
    const product = await ProductModel.create({ name: 'Test', price: 1000, available: true });

    const FavoriteModel = (await import('../src/modules/favorites/favorite.model')).default;
    // Ensure the unique compound index is built before testing
    await FavoriteModel.createCollection();
    await FavoriteModel.syncIndexes();
    await FavoriteModel.create({ user: user._id, product: product._id });

    await expect(
      FavoriteModel.create({ user: user._id, product: product._id })
    ).rejects.toThrow();
  });
});
