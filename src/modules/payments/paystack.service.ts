import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import crypto from 'crypto';

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // 'success' | 'failed' | 'abandoned' | 'pending'
    reference: string;
    amount: number; // in kobo
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    metadata: {
      order_id?: string;
      order_number?: string;
      custom_fields?: Array<{ display_name: string; variable_name: string; value: string }>;
    };
    customer: {
      email: string;
    };
  };
}

class PaystackService {
  private get secretKey(): string {
    if (!env.paystackSecretKey) {
      throw ApiError.internal('Paystack secret key is not configured');
    }
    return env.paystackSecretKey;
  }

  async initializeTransaction(params: {
    email: string;
    amount: number; // in naira
    reference: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitializeResponse> {
    const body = {
      email: params.email,
      amount: Math.round(params.amount * 100), // convert naira to kobo
      reference: params.reference,
      callback_url: `${env.clientOrigin}/payment/callback`,
      metadata: params.metadata,
    };

    const response = await fetch(`${env.paystackBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as PaystackInitializeResponse;

    if (!response.ok || !data.status) {
      throw ApiError.badRequest(`Paystack initialization failed: ${data.message ?? 'Unknown error'}`);
    }

    return data;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    const response = await fetch(`${env.paystackBaseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json() as PaystackVerifyResponse;

    if (!response.ok || !data.status) {
      throw ApiError.badRequest(`Payment verification failed: ${data.message ?? 'Unknown error'}`);
    }

    return data;
  }

  /**
   * Verify Paystack webhook signature.
   * Paystack computes an HMAC SHA512 hash of the raw request body using the webhook secret.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.paystackWebhookSecret) {
      console.warn('[paystack] PAYSTACK_WEBHOOK_SECRET not configured — webhook signature verification skipped');
      return false;
    }
    const expected = crypto
      .createHmac('sha512', env.paystackWebhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      );
    } catch {
      return false;
    }
  }
}

export default new PaystackService();
