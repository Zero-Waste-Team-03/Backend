import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { CloudinaryModuleWrapper } from './cloudinary/cloudinary.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from 'nestjs-redis-client';
import redisConfig from 'src/config/redis.config';
import { FirebaseModule } from './firebase/firebase.module';
import firebaseConfig from 'src/config/firebase.config';

@Module({
  imports: [
    DbModule,
    CloudinaryModuleWrapper,
    QueueModule,
    RedisModule.registerAsync(redisConfig.asProvider()),
    FirebaseModule.forRootAsync(firebaseConfig.asProvider()),
  ],
  exports: [
    RedisModule,
    QueueModule,
    CloudinaryModuleWrapper,
    DbModule,
    FirebaseModule,
  ],
})
export class InfrastructureModule {}
