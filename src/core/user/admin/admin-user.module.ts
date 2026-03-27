import { Module } from '@nestjs/common';
import { AdminUserResolver } from './admin-user.resolver';
import { UserModule } from '../user.module';

@Module({
  imports: [UserModule],
  providers: [AdminUserResolver],
})
export class AdminUserModule {}
