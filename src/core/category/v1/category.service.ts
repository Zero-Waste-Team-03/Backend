import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryInput } from '../graphql/inputs/create-category.input';
import { UpdateCategoryInput } from '../graphql/inputs/update-category.input';
import { PaginationInput } from '../../../common/graphql/inputs/pagination.input';
import { PaginatedCategories } from '../graphql/types/paginated-categories.type';
import { throwAppError } from '../../../common/errors/throw-app-error';
import { MessageResponseType } from '../../authentication/graphql/types/message-response.type';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Creates a new category.
   * Only accessible by administrators.
   *
   * @param input - Data for creating a category
   * @returns The created category
   */
  async create(input: CreateCategoryInput): Promise<Category> {
    const category = this.categoryRepository.create(input);
    return await this.categoryRepository.save(category);
  }

  /**
   * Retrieves all categories with pagination.
   * Publicly accessible.
   *
   * @param pagination - Pagination settings
   * @returns A paginated list of categories
   */
  async findAll(pagination?: PaginationInput): Promise<PaginatedCategories> {
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.categoryRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage: page * limit < totalCount,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Retrieves a single category by its ID.
   *
   * @param id - The ID of the category
   * @returns The category if found
   * @throws NotFoundException if the category is not found
   */
  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throwAppError('CATEGORY_NOT_FOUND', { id });
    }
    return category;
  }

  /**
   * Fetches multiple categories by their IDs in a single query.
   *
   * @param ids - Array of category IDs
   * @returns Array of Category entities
   */
  async findByIds(ids: string[]): Promise<Category[]> {
    if (!ids.length) return [];
    return this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id IN (:...ids)', { ids })
      .getMany();
  }

  /**
   * Updates an existing category.
   * Only accessible by administrators.
   *
   * @param id - The ID of the category to update
   * @param input - Data for updating the category
   * @returns The updated category
   * @throws NotFoundException if the category is not found
   */
  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, input);
    return await this.categoryRepository.save(category);
  }

  /**
   * Deletes a category by its ID.
   * Only accessible by administrators.
   *
   * @param id - The ID of the category to delete
   * @returns The deleted category
   * @throws NotFoundException if the category is not found
   */
  async remove(id: string): Promise<MessageResponseType> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
    return { message: `Category with ID "${id}" has been deleted.` };
  }
}
