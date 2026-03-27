import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import { AdminUserModule } from './user/admin/admin-user.module';

@Module({
  imports: [UserModule, AuthenticationModule, AdminUserModule],
  exports: [UserModule, AuthenticationModule, AdminUserModule],
})
export class CoreModule {}
