import { Schema, model } from 'mongoose';
import { schemaOptions } from '../../core/schemaOptions';

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // who placed the order
    item: { type: String, required: [true, 'Item is required'], trim: true, maxlength: 100 },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
      max: [1000, 'Quantity must be at most 1000'],
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
    status: { type: String, enum: ['pending', 'cancelled'], default: 'pending' },
  },
  schemaOptions,
);

export const Order = model('Order', orderSchema);
