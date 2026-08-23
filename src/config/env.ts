import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    // In development, allow missing optional integrations (Clerk/Paystack/Email)
    // but still surface the missing key so it is obvious.
    console.warn(`[env] Missing env var: ${key}`);
  }
  return value as string;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5000', 10),
  isProduction: process.env.NODE_ENV === 'production',

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/restaurant_ordering'),

  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? '',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? '',

  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET ?? '',

  deliveryFee: parseInt(process.env.DELIVERY_FEE ?? '1000', 10),

  restaurantWhatsappNumber: process.env.RESTAURANT_WHATSAPP_NUMBER ?? '',

  emailHost: process.env.EMAIL_HOST ?? '',
  emailPort: parseInt(process.env.EMAIL_PORT ?? '587', 10),
  emailUser: process.env.EMAIL_USER ?? '',
  emailPassword: process.env.EMAIL_PASSWORD ?? '',
  restaurantEmail: process.env.RESTAURANT_EMAIL ?? '',

  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
};

export type Env = typeof env;
