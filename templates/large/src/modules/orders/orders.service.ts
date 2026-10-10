import { AppError } from '../../core/utils/errors';
import { Order } from './order.model';

export async function listOrders(userId: string) {
  return Order.find({ user: userId }).sort({ createdAt: -1 });
}

export async function createOrder(userId: string, item: string, quantity?: number) {
  return Order.create({ user: userId, item, quantity }); // the model checks quantity (1 to 1000, whole number)
}

// Business rule: you can only see your own orders.
export async function getOrder(id: string, userId: string) {
  const order = await Order.findById(id);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.user.toString() !== userId) throw new AppError(403, 'This is not your order');
  return order;
}

export async function cancelOrder(id: string, userId: string) {
  const order = await getOrder(id, userId);
  if (order.status === 'cancelled') throw new AppError(409, 'The order is already cancelled');

  order.status = 'cancelled';
  return order.save();
}
