import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoryService } from './v1/category.service';
import { CategoryResolver } from './category.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  providers: [CategoryService, CategoryResolver],
  exports: [TypeOrmModule, CategoryService],
})
export class CategoryModule {}
