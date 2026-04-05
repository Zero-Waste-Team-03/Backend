import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/decorators/roles.decorator';
import { UserRoleValues } from '../user/entities/user.entity';
import { CategoryType } from './graphql/types/category.type';
import { PaginatedCategories } from './graphql/types/paginated-categories.type';
import { CreateCategoryInput } from './graphql/inputs/create-category.input';
import { UpdateCategoryInput } from './graphql/inputs/update-category.input';
import { CategoryService } from './v1/category.service';
import { PaginationInput } from '../../common/graphql/inputs/pagination.input';
import { MessageResponseType } from '../authentication/graphql/types/message-response.type';

@Resolver(() => CategoryType)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  /**
   * Retrieves all categories with pagination.
   * Publicly accessible query.
   *
   * @param pagination - Pagination arguments
   * @returns PaginatedCategories
   */
  @Query(() => PaginatedCategories, {
    name: 'categories',
    description: 'Retrieve a paginated list of all categories.',
  })
  async findAll(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<PaginatedCategories> {
    return await this.categoryService.findAll(pagination);
  }

  /**
   * Retrieves a single category by its ID.
   * Publicly accessible query.
   *
   * @param id - The ID of the category
   * @returns CategoryType
   */
  @Query(() => CategoryType, {
    name: 'category',
    description: 'Retrieve a single category by its ID.',
  })
  async findOne(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CategoryType> {
    return await this.categoryService.findOne(id);
  }

  /**
   * Creates a new category.
   * Restricted to Administrators only.
   *
   * @param input - Category creation data
   * @returns The newly created CategoryType
   */
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => CategoryType, {
    name: 'createCategory',
    description: 'Create a new category (Administrator only).',
  })
  async createCategory(
    @Args('input') input: CreateCategoryInput,
  ): Promise<CategoryType> {
    return await this.categoryService.create(input);
  }

  /**
   * Updates an existing category.
   * Restricted to Administrators only.
   *
   * @param id - The ID of the category to update
   * @param input - Category update data
   * @returns The updated CategoryType
   */
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => CategoryType, {
    name: 'updateCategory',
    description: 'Update an existing category (Administrator only).',
  })
  async updateCategory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<CategoryType> {
    return await this.categoryService.update(id, input);
  }

  /**
   * Deletes a category by its ID.
   * Restricted to Administrators only.
   *
   * @param id - The ID of the category to delete
   * @returns The deleted CategoryType
   */
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRoleValues.ADMINISTRATOR)
  @Mutation(() => MessageResponseType, {
    name: 'deleteCategory',
    description: 'Delete a category by its ID (Administrator only).',
  })
  async deleteCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<MessageResponseType> {
    return await this.categoryService.remove(id);
  }
}
