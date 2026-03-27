import { Module } from '@nestjs/common';
import { UserService } from './v1/user.service';
import { UserResolver } from './user.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Location } from 'src/common/locations/entities/location.entity';

/**
 * User module
 *
 * Provides user management functionality including:
 * - User CRUD operations
 * - Profile management
 * - GraphQL queries and mutations for user operations
 *
 * Note: All user endpoints are now GraphQL-based (see user.resolver.ts)
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Location])],
  controllers: [],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
