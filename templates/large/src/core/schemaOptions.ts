// Options shared by every Mongoose schema in this project.
export const schemaOptions = {
  timestamps: true, // adds createdAt and updatedAt
  toJSON: {
    virtuals: true, // include "id" (a string copy of _id)
    versionKey: false,
    // Runs whenever a document is sent as JSON: tidy the shape and never leak a password hash.
    // (The parameter types are written out on purpose: without them TypeScript cannot work out the model's field types.)
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      const { _id, password, ...safe } = ret; // drop the raw _id and the password hash
      return safe;
    },
  },
};
