import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaginatedVerificationRequests, VerificationRequestType } from './graphql/types/verification-request.type';
import { USER } from '../authentication/decorators/user.decorartor';
import { UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../authentication/guards/access-token.guard';
import { FoodSaverGuard } from '../authentication/guards/food-saver.guard';
import { VerificationRequestsService } from './verification.service';
import { PaginationInput } from 'src/common/graphql/inputs/pagination.input';
import { SameNeighborhoodGuard } from '../authentication/guards/same-neighborhood.guard';
import { SameNeighborhood } from '../authentication/decorators/same-neighborhood.decorator';
import { UpdateVerificationStatusInput } from './graphql/input/update-verification-status.input';

@Resolver(() => VerificationRequestType)
@UseGuards(AccessTokenGuard)
export class VerificationResolver {
  constructor(private readonly verificationRequestService: VerificationRequestsService) {}
  @UseGuards(FoodSaverGuard)
  @Query(()=>PaginatedVerificationRequests)
  async getVerificationRequestsForFoodSaver(
    @USER('id') userId:string,
    @Args('pagination',{type:()=>PaginationInput,defaultValue:{page:1,limit:10}}) pagination:PaginationInput,
    @Args('search',{type:()=>String,nullable:true}) search?:string
    
  ){
     return this.verificationRequestService.getVerificationRequestForFoodSaver(userId,pagination,search);
  }
  @Query(()=>PaginatedVerificationRequests)
  async getSentVerificationRequests(
    @USER('id') userId:string,
    @Args('pagination',{type:()=>PaginationInput,defaultValue:{page:1,limit:10}}) pagination:PaginationInput,
  ){
     return this.verificationRequestService.getSentVerificationRequests(userId,pagination);}
    @UseGuards(SameNeighborhoodGuard)
    @SameNeighborhood({argName:'targetFoodSaverId',entityType:'USER'})
  @Mutation(()=>VerificationRequestType)
  async createVerificationRequest(
    @USER('id') userId:string,
    @Args('targetFoodSaverId',{type:()=>String}) targetFoodSaverId:string,
  ){
     return this.verificationRequestService.createVerificationRequest(userId,targetFoodSaverId);}
  @UseGuards(FoodSaverGuard)
@Mutation(()=>VerificationRequestType)
async updateVerificationRequestStatus(

    @USER('id') userId:string,
    @Args('updateVerificationRequest') updateVerificationStatusInput:UpdateVerificationStatusInput
  
  ){
     return this.verificationRequestService.updateVerificationRequestStatus(updateVerificationStatusInput,userId);}
  }
  
