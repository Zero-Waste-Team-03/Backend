import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { registerDto } from 'src/core/authentication/v1/dtos/requests/register.dto';
import { User, UserRoleValues } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface OAuthUserPayload {
  email: string;
  displayName: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(data: registerDto): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async updateUser(data: Partial<User>) {
    const { id } = data;
    if (!id) throw new BadRequestException('id not included');
    const { affected } = await this.userRepository.update(id, { ...data });
    if (!affected) throw new BadRequestException('failed to update');
    return await this.userRepository.findOneOrFail({ where: { id } });
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
    return this.userRepository.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUserWithoutReturn(
    id: string,
    data: Partial<User>,
  ): Promise<void> {
    const { affected } = await this.userRepository.update(id, data);
    if (affected === 0) {
      throw new NotFoundException('User not found');
    }
    return;
  }
}
