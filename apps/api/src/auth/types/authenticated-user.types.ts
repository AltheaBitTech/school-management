import { AuthContext } from './auth-context.types';

export interface AuthenticatedUser extends AuthContext {
  email: string;
}
