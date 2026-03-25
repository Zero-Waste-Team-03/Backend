import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/core/user/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator used to declare required roles for route handlers or resolvers.
 *
 * @param roles - Allowed roles to access the decorated handler
 *
 * @example
 * @UseGuards(AccessTokenGuard, RolesGuard)
 * @Roles(UserRoleValues.ADMINISTRATOR)
 * @Query(() => UserType)
 * adminOnlyQuery() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
