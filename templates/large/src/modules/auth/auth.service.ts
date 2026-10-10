import { AppError } from '../../core/utils/errors';
import { hashPassword, verifyPassword } from '../../core/utils/password';
import { signToken } from '../../core/utils/token';
import { User } from '../users/user.model';

export async function registerUser(name: string, email: string, password: string) {
  if (password.length < 8) throw new AppError(400, 'Password must be at least 8 characters');

  const user = await User.create({ name, email, password: await hashPassword(password) });
  return { user, token: signToken(user.id) };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  // Same message for "no such email" and "wrong password", so nobody can find out which emails exist.
  if (!user || !(await verifyPassword(password, user.password))) throw new AppError(401, 'Wrong email or password');

  return { user, token: signToken(user.id) };
}
