import { Injectable, Logger } from '@nestjs/common';
import { registerDto } from 'src/core/authentication/v1/dtos/requests/register.dto';
import {
  User,
  UserRoleValues,
  UserStatusValues,
} from 'src/core/user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository, LessThan } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { Location } from 'src/common/locations/entities/location.entity';
import {
  generateHash,
  compareHash,
} from 'src/common/utils/authentication/hash.utils';
import { MessageResponseType } from 'src/core/authentication/graphql/types/message-response.type';
import { ChangePasswordInput } from 'src/core/user/graphql/inputs/change-password.input';
import { AdminUsersArgs } from 'src/core/user/graphql/inputs/admin-users.args';
import { UserStatsResponse } from 'src/core/user/graphql/types/user-stats.type';
import { IPaginatedType } from 'src/common/graphql/types/pagination.type';
import { UserType } from 'src/core/authentication/graphql/types/user.type';
import { AdminCreateAccountInput } from 'src/core/user/graphql/inputs/admin-create-account.input';
import { Inject } from '@nestjs/common';
import appConfig from 'src/config/app.config';
import { ConfigType } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/common/constants/queues';
import { Queue } from 'bullmq';
import { MAIL_JOBS } from 'src/common/constants/jobs';
import * as crypto from 'crypto';
import { throwAppError } from 'src/common/errors';

export interface OAuthUserPayload {
  email: string;
  displayName: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @Inject(appConfig.KEY)
    private readonly applicationConfig: ConfigType<typeof appConfig>,
    @InjectQueue(QUEUE_NAME.MAIL)
    private readonly mailQueue: Queue,
  ) {}

  async getPaginatedUsers(
    args: AdminUsersArgs,
  ): Promise<IPaginatedType<UserType>> {
    const { page, limit, search, role, status } = args;
    const skip = (page - 1) * limit;

    let items: User[];
    let totalCount: number;

    if (search) {
      // Use query builder when search requires OR conditions
      const queryBuilder = this.userRepository.createQueryBuilder('user');

      queryBuilder.where(
        '(user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: `%${search}%` },
      );

      if (role) {
        queryBuilder.andWhere('user.role = :role', { role });
      }

      if (status) {
        queryBuilder.andWhere('user.status = :status', { status });
      }

      queryBuilder.skip(skip).take(limit).orderBy('user.createdAt', 'DESC');
      [items, totalCount] = await queryBuilder.getManyAndCount();
    } else {
      // Use standard repository for simple queries
      const where: Record<string, any> = {};
      if (role) where.role = role;
      if (status) where.status = status;

      [items, totalCount] = await this.userRepository.findAndCount({
        where,
        skip,
        take: limit,
      });
    }

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      items,
      totalCount,
      page,
      limit,
      hasNextPage,
      hasPreviousPage,
    };
  }
  async suspendUser(id: string): Promise<UserType> {
    this.logger.log(`Suspending user with ID: ${id}`);
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throwAppError('USER_NOT_FOUND');
    }
    if (user.status === UserStatusValues.SUSPENDED) {
      this.logger.warn(`User with ID: ${id} is already suspended`);
      return user; // No change needed, return existing user
    }
    user.status = UserStatusValues.SUSPENDED;
    await this.userRepository.save(user);
    return user;
  }

  async activateUser(id: string): Promise<UserType> {
    this.logger.log(`Activating user with ID: ${id}`);
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throwAppError('USER_NOT_FOUND');
    }
    if (user.status === UserStatusValues.ACTIVE) {
      this.logger.warn(`User with ID: ${id} is already active`);
      return user; // No change needed, return existing user
    }
    user.status = UserStatusValues.ACTIVE;
    await this.userRepository.save(user);
    return user;
  }

  async getUserStats(): Promise<UserStatsResponse> {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeAccounts,
      previousTotalUsers,
      previousActiveAccounts,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({
        where: { status: UserStatusValues.ACTIVE },
      }),
      this.userRepository.count({
        where: { createdAt: LessThan(startOfCurrentMonth) },
      }),
      this.userRepository.count({
        where: {
          status: UserStatusValues.ACTIVE,
          createdAt: LessThan(startOfCurrentMonth),
        },
      }),
    ]);

    const calculateIncrease = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      const increase = ((current - previous) / previous) * 100;
      return Math.round(increase * 100) / 100; // Round to 2 decimal places
    };

    const totalUsersIncrease = calculateIncrease(
      totalUsers,
      previousTotalUsers,
    );
    const activeAccountsIncrease = calculateIncrease(
      activeAccounts,
      previousActiveAccounts,
    );

    const reportedIssues = 0;
    const reportedIssuesIncrease = 0;

    return {
      totalUsers,
      totalUsersIncrease,
      activeAccounts,
      activeAccountsIncrease,
      reportedIssues,
      reportedIssuesIncrease,
    };
  }

  async createUser(data: registerDto): Promise<User> {
    const location = this.locationRepository.create({
      ...data.location,
    });
    const savedLocation = await this.locationRepository.save(location);

    const user = this.userRepository.create({
      email: data.email,
      displayName: data.displayName,
      passwordHash: await generateHash(data.password),
      role: UserRoleValues.USER,
      isMailVerified: true,
      location: savedLocation,
      locationId: savedLocation.id,
    });

    return this.userRepository.save(user);
  }

  async adminCreateAccount(data: AdminCreateAccountInput): Promise<User> {
    const { email, displayName, role } = data;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throwAppError('USER_ALREADY_EXISTS');
    }

    const temporaryPassword = crypto.randomBytes(8).toString('hex');

    const user = this.userRepository.create({
      email,
      displayName,
      role,
      passwordHash: await generateHash(temporaryPassword),
      isMailVerified: true,
      status: UserStatusValues.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    await this.mailQueue.add(MAIL_JOBS.SEND_ACCOUNT_CREATED_MAIL, {
      to: email,
      displayName,
      role,
      plainPassword: temporaryPassword,
      loginUrl: `${this.applicationConfig.frontUrl}/login`,
    });

    return savedUser;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    try {
      const user = await this.userRepository.findOneOrFail({
        where: { id },
        relations: ['settings', 'location'],
      });

      Object.assign(user, data);
      return await this.userRepository.save(user);
    } catch {
      throwAppError('USER_NOT_FOUND');
    }
  }

  async changePassword(
    userId: string,
    data: ChangePasswordInput,
  ): Promise<MessageResponseType> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throwAppError('USER_NOT_FOUND');
    }

    const isPasswordValid = await compareHash(
      data.oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throwAppError('USER_INVALID_PASSWORD');
    }

    user.passwordHash = await generateHash(data.newPassword);
    user.lastChangedPasswordDate = new Date();
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  createOAuthUser(data: OAuthUserPayload): Promise<User> {
    const user = this.userRepository.create({
      ...data,
      role: UserRoleValues.USER,
      passwordHash: '',
      isMailVerified: true,
    });
    return this.userRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { location: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: { location: true },
    });
  }

  async findBasicAuthedUserByEmail(email: string): Promise<User> {
    try {
      return await this.userRepository.findOneOrFail({
        where: { email, passwordHash: Not('') },
        relations: { location: true },
      });
      //eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      throwAppError('USER_NOT_FOUND');
    }
  }

  async updateUserWithoutReturn(
    id: string,
    data: UpdateUserDto,
  ): Promise<void> {
    try {
      await this.userRepository.update(id, data);
      return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      throwAppError('USER_NOT_FOUND');
    }
  }
  async getHashedPassword(
    userId: string,
  ): Promise<{ passwordHash: string; resetVersion: number }> {
    const user = await this.userRepository.findOne({
      select: { passwordHash: true, resetVersion: true },
      where: { id: userId },
    });
    if (!user) {
      throwAppError('USER_NOT_FOUND');
    }
    return { passwordHash: user.passwordHash, resetVersion: user.resetVersion };
  }
  async deleteUser(id: string): Promise<MessageResponseType> {
    const deleteResult = await this.userRepository.softDelete(id);
    if (deleteResult.affected === 0) {
      throwAppError('USER_NOT_FOUND');
    }
    return { message: 'User deleted successfully' };
  }
}
