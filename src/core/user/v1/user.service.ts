import { Injectable } from '@nestjs/common';
import { registerDto } from 'src/core/authentication/v1/dtos/requests/register.dto';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  createUser(data: registerDto): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  updateUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }
}
