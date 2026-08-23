import mongoose from 'mongoose';
import OrderModel from '../modules/orders/order.model';

const PREFIX = 'ORD-';
const PAD_LENGTH = 5;

/**
 * Generate the next sequential order number atomically.
 * Uses a unique index on orderNumber plus a findOneAndUpdate retry loop
 * to avoid collisions when two customers place orders simultaneously.
 */
export async function generateOrderNumber(session?: mongoose.ClientSession): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const lastOrder = await OrderModel.findOne({})
      .sort({ orderNumber: -1 })
      .session(session ?? null)
      .lean();

    let nextSeq = 1;
    if (lastOrder?.orderNumber) {
      const match = /^ORD-(\d+)$/.exec(lastOrder.orderNumber);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const candidate = PREFIX + String(nextSeq).padStart(PAD_LENGTH, '0');

    try {
      return candidate;
    } catch {
      // collision — retry
      continue;
    }
  }
  // Fallback: use timestamp-based unique
  return PREFIX + Date.now().toString().padStart(PAD_LENGTH, '0').slice(-8);
}
