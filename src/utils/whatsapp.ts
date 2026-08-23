import { env } from '../config/env';
import { formatPhoneForDisplay } from './phone';
import { IOrder } from '../modules/orders/order.model';

export interface WhatsappMessageParts {
  recipient: string;
  message: string;
  whatsappUrl: string;
}

function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function buildOrderWhatsappMessage(order: IOrder): WhatsappMessageParts {
  const itemsText = order.items
    .map((item) => `${item.name} x${item.quantity} — ${formatMoney(item.price * item.quantity)}`)
    .join('\n');

  const deliveryText =
    order.deliveryMethod === 'pickup'
      ? 'Pickup'
      : `Home Delivery
Address: ${order.deliveryAddress?.street ?? ''}, ${order.deliveryAddress?.city ?? ''}, ${order.deliveryAddress?.state ?? ''}${order.deliveryAddress?.additionalInfo ? ` (${order.deliveryAddress.additionalInfo})` : ''}`;

  const message = [
    `Order: ${order.orderNumber}`,
    '',
    'Customer:',
    order.customerName ?? 'Customer',
    '',
    'Items:',
    itemsText,
    '',
    `Subtotal: ${formatMoney(order.subtotal)}`,
    `Delivery: ${deliveryText}`,
    `Delivery Fee: ${formatMoney(order.deliveryFee)}`,
    `Total: ${formatMoney(order.totalAmount)}`,
    '',
    `Payment: ${order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}`,
  ].join('\n');

  const recipient = env.restaurantWhatsappNumber;
  const url = `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;

  return { recipient, message, whatsappUrl: url };
}

/** Lightweight variant used in tests where a full populate is not available. */
export function buildWhatsappUrl(recipient: string, message: string): string {
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}

export { formatMoney, formatPhoneForDisplay };
