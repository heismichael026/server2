import { env } from '../../config/env';
import { DeliveryMethod } from './order.types';

/**
 * Calculate the delivery fee for an order.
 * pickup => 0
 * delivery => configured DELIVERY_FEE
 */
export function calculateDeliveryFee(deliveryMethod: DeliveryMethod): number {
  if (deliveryMethod === 'pickup') return 0;
  return env.deliveryFee;
}
