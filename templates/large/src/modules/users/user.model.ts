import { Schema, model } from 'mongoose';
import { schemaOptions } from '../../core/schemaOptions';

// A model describes one MongoDB collection. This is the "users" collection.
const userSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // two users cannot share an email
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: { type: String, required: true }, // stored hashed, never as plain text
  },
  schemaOptions,
);

export const User = model('User', userSchema);

/** The type of one user loaded from the database. */
export type UserDoc = InstanceType<typeof User>;
