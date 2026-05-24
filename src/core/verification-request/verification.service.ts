import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { VerificationRequest, VerificationRequestStatus } from './verification-request.entity';
import { PaginatedVerificationRequests, VerificationRequestType } from './graphql/types/verification-request.type';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { UserService } from '../user/v1/user.service';
import { UpdateVerificationStatusInput } from './graphql/input/update-verification-status.input';

@Injectable()
export class VerificationRequestsService {
  constructor(
    @InjectRepository(VerificationRequest) private readonly verificationRequestRepository: Repository<VerificationRequest>,
  private readonly  userService:UserService
  ){}
  
  async createVerificationRequest(requesterId: string, targetFoodSaverId: string): Promise<VerificationRequestType> {

    const isFoodSaver=await this.userService.isFoodSaver(targetFoodSaverId);
    if (!isFoodSaver) {
      //TODO create app error here
      throw new Error('Target user is not a food saver');
    }
    const newRequest = this.verificationRequestRepository.create({
      requesterId,
      targetFoodSaverId,
      status: 'Pending',
    });
    return this.verificationRequestRepository.save(newRequest);
  }
  async getVerificationRequestForFoodSaver(foodSaverId: string,{page,limit}:PaginationInput,query?:string): Promise<PaginatedVerificationRequests> {
    const skip = (page - 1) * limit;
    const [requests, totalCount] = await this.verificationRequestRepository.findAndCount({
      skip,
      take: limit,
      where: { targetFoodSaverId: foodSaverId,requester:{displayName:query??ILike(`%${query}%`)} },
      order: { createdAt: 'DESC' },
    });
    return {
      items: requests,
      totalCount,
      hasNextPage: (page * limit) < totalCount,
      page,
      limit,
      hasPreviousPage: page > 1,

    };
  }
  async updateVerificationRequestStatus({id,status}:UpdateVerificationStatusInput,foodSaverId:string): Promise<VerificationRequestType> {
    const request = await this.verificationRequestRepository.findOne({ where: { id} });
    if (!request) {
      //TODO create app error here
      throw new Error('Verification request not found');
    }
    if (request.targetFoodSaverId !== foodSaverId) {
      //TODO craete app error here
    }
    if (request.status !== 'Pending') {
      throw new Error('Only pending requests can be updated');
      
    }
    request.status = status as VerificationRequestStatus;
    return this.verificationRequestRepository.save(request);
  }
  async getSentVerificationRequests(requesterId: string,{page,limit}:PaginationInput): Promise<PaginatedVerificationRequests> {
    const skip = (page - 1) * limit;
    const [requests, totalCount] = await this.verificationRequestRepository.findAndCount({
      skip,
      take: limit,
      where: { requesterId },
      order: { createdAt: 'DESC' },
    });
    return {
      items: requests,
      totalCount,
      hasNextPage: (page * limit) < totalCount,
      page,
      limit,
      hasPreviousPage: page > 1,
    };  
  }
}
