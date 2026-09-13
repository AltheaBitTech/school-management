import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  effectivePermissions?: string[];
}
