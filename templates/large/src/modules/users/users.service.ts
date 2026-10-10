import { AppError } from '../../core/utils/errors';
import { User } from './user.model';

// A service holds the business rules of a feature. It talks to the model, not to Express.

export async function listUsers() {
  return User.find().sort({ createdAt: -1 }).limit(100); // add paging here when you have many users
}

export async function getUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'User not found');
  return user;
}
