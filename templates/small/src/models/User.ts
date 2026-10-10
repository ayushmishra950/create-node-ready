import { Schema, model } from 'mongoose';

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
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: {
      virtuals: true, // include "id" (a string copy of _id)
      versionKey: false,
      // Runs whenever a user is sent as JSON: tidy the shape and never leak the password hash.
      // (The parameter types are written out on purpose: without them TypeScript cannot work out the model's field types.)
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        const { _id, password, ...safe } = ret; // drop the raw _id and the password hash
        return safe;
      },
    },
  },
);

export const User = model('User', userSchema);

/** The type of one user loaded from the database. */
export type UserDoc = InstanceType<typeof User>;
