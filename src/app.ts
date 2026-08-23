import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import expressMongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Route modules
import userRoutes from './modules/users/user.routes';
import productRoutes from './modules/products/product.routes';
import cartRoutes from './modules/cart/cart.routes';
import favoriteRoutes from './modules/favorites/favorite.routes';
import orderRoutes from './modules/orders/order.routes';
import paymentRoutes from './modules/payments/payment.routes';
import blogRoutes from './modules/blogs/blog.routes';
import contactRoutes from './modules/contact/contact.routes';

const app = express();

// Trust proxy (needed for rate limiting and secure cookies behind a reverse proxy)
app.set('trust proxy', 1);

// Security: Helmet headers
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction ? undefined : false,
  })
);

// CORS
app.use(
  cors({
    origin: env.clientOrigin === '*' ? true : env.clientOrigin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'Apikey'],
  })
);

// Rate limiting (global, per-IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', globalLimiter);

// Stricter rate limiter for the contact endpoint (public, prevents spam)
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many contact messages, please try again later' },
});

// Body parsing — capture raw body for Paystack webhook signature verification
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      // Store the raw body so the webhook handler can verify the Paystack signature
      if (req.url === '/api/v1/payments/webhook') {
        (req as unknown as { rawBody: string }).rawBody = buf.toString();
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization
app.use(expressMongoSanitize());
app.use(hpp());

// Compression
app.use(compression());

// Clerk middleware — populates req.auth from the Clerk session token
app.use(
  clerkMiddleware({
    secretKey: env.clerkSecretKey || undefined,
    publishableKey: env.clerkPublishableKey || undefined,
  })
);

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/contact', contactLimiter, contactRoutes);

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
