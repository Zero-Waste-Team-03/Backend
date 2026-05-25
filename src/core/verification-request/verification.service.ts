import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, ILike, Repository } from 'typeorm';
import { VerificationRequest } from './verification-request.entity';
import {
  PaginatedVerificationRequests,
  VerificationRequestType,
} from './graphql/types/verification-request.type';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { UserService } from '../user/v1/user.service';
import { UpdateVerificationStatusInput } from './graphql/input/update-verification-status.input';
import { throwAppError } from 'src/common/errors/throw-app-error';

@Injectable()
export class VerificationRequestsService {
  constructor(
    @InjectRepository(VerificationRequest)
    private readonly verificationRequestRepository: Repository<VerificationRequest>,
    private readonly userService: UserService,
  ) {}

  async createVerificationRequest(
    requesterId: string,
    targetFoodSaverId: string,
  ): Promise<VerificationRequestType> {
    const isFoodSaver = await this.userService.isFoodSaver(targetFoodSaverId);
    if (!isFoodSaver) {
      throwAppError('VERIFICATION_TARGET_NOT_FOOD_SAVER');
    }
    const newRequest = this.verificationRequestRepository.create({
      requesterId,
      targetFoodSaverId,
      status: 'Pending',
    });
    return this.verificationRequestRepository.save(newRequest);
  }
  async getVerificationRequestForFoodSaver(
    foodSaverId: string,
    { page, limit }: PaginationInput,
    query?: string,
  ): Promise<PaginatedVerificationRequests> {
    const skip = (page - 1) * limit;
    const where: FindManyOptions<VerificationRequest>['where'] = {
      targetFoodSaverId: foodSaverId,
    };
    if (query) {
      where.requester = { displayName: ILike(`%${query}%`) };
    }
    const [requests, totalCount] =
      await this.verificationRequestRepository.findAndCount({
        skip,
        take: limit,
        where,
        order: { createdAt: 'DESC' },
      });
    return {
      items: requests,
      totalCount,
      hasNextPage: page * limit < totalCount,
      page,
      limit,
      hasPreviousPage: page > 1,
    };
  }
  async updateVerificationRequestStatus(
    { id, status }: UpdateVerificationStatusInput,
    foodSaverId: string,
  ): Promise<VerificationRequestType> {
    const request = await this.verificationRequestRepository.findOne({
      where: { id },
    });
    //TODO add args to this errors
    if (!request) {
      throwAppError('VERIFICATION_REQUEST_NOT_FOUND');
    }
    if (request.targetFoodSaverId !== foodSaverId) {
      throwAppError('VERIFICATION_REQUEST_FORBIDDEN');
    }
    if (request.status !== 'Pending') {
      throwAppError('VERIFICATION_REQUEST_NOT_PENDING');
    }
    if (status === 'Approved') {
      await this.userService.updateuserVerificationStatus(
        request.requesterId,
        true,
      );
    }
    request.status = status;
    return this.verificationRequestRepository.save(request);
  }
  async getSentVerificationRequests(
    requesterId: string,
    { page, limit }: PaginationInput,
  ): Promise<PaginatedVerificationRequests> {
    const skip = (page - 1) * limit;
    const [requests, totalCount] =
      await this.verificationRequestRepository.findAndCount({
        skip,
        take: limit,
        where: { requesterId },
        order: { createdAt: 'DESC' },
      });
    return {
      items: requests,
      totalCount,
      hasNextPage: page * limit < totalCount,
      page,
      limit,
      hasPreviousPage: page > 1,
    };
  }
}
