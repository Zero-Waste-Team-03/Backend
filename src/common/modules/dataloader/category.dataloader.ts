import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { CategoryService } from '../../../core/category/v1/category.service';
import { Category } from '../../../core/category/entities/category.entity';

@Injectable()
export class CategoryDataLoader {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Creates a new DataLoader instance for batching category queries by ID
   *
   * @returns DataLoader instance for Category entities
   */
  createLoader(): DataLoader<string, Category | null> {
    return new DataLoader<string, Category | null>(
      async (categoryIds: readonly string[]) => {
        const categories = await this.categoryService.findByIds(
          categoryIds as string[],
        );

        // Map categories back to the order of requested IDs
        const categoryMap = categories.reduce(
          (map, category) => {
            map[category.id] = category;
            return map;
          },
          {} as Record<string, Category>,
        );

        return categoryIds.map((id) => categoryMap[id] || null);
      },
      {
        cache: true,
        batch: true,
      },
    );
  }
}
