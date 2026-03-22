import { Injectable, NotFoundException } from '@nestjs/common';
import { registerDto } from 'src/core/authentication/v1/dtos/requests/register.dto';
import { User, UserRoleValues } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { Location } from 'src/common/locations/entities/location.entity';
import { generateHash } from 'src/common/utils/authentication/hash.utils';

export interface OAuthUserPayload {
  email: string;
  displayName: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

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

  async updateUser(id: string, data: UpdateUserDto) {
    try {
      await this.userRepository.update(id, { ...data });
      return await this.userRepository.findOneOrFail({ where: { id } });
      //eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      throw new NotFoundException({ errCode: 'user_not_found' });
    }
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
      throw new NotFoundException({ errCode: 'user_not_found' });
    }
  }

  async updateUserWithoutReturn(
    id: string,
    data: UpdateUserDto,
  ): Promise<void> {
    try {
      await this.userRepository.update(id, data);
      return;
      //eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      throw new NotFoundException({ errCode: 'user_not_found' });
    }
  }
}
