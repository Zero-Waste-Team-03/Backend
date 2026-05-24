import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Donation } from '../../donation/entities/donation.entity';
import { SAME_NEIGHBORHOOD_KEY, SameNeighborhoodOptions } from '../decorators/same-neighborhood.decorator';
import { ExtendedRequest } from '../types/extended-req.type';

@Injectable()
export class SameNeighborhoodGuard implements CanActivate {
  private readonly logger = new Logger(SameNeighborhoodGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<SameNeighborhoodOptions>(
      SAME_NEIGHBORHOOD_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const { user: authUser } = this.getRequest(context);
    if (!authUser?.id) {
      return false;
    }

    // Get current user's location
    const currentUser = await this.entityManager.findOne(User, {
      where: { id: authUser.id },
      relations: ['location'],
    });

    if (!currentUser?.location?.zipCode) {
      throw new ForbiddenException('Your zip code is not set. Cannot perform neighborhood checks.');
    }

    const gqlCtx = GqlExecutionContext.create(context);
    const args = gqlCtx.getArgs();
    const targetId = args[options.argName];

    if (!targetId) {
      throw new NotFoundException(`Target ID argument "${options.argName}" not found.`);
    }

    let targetZipCode: string | undefined;

    if (options.entityType === 'USER') {
      const targetUser = await this.entityManager.findOne(User, {
        where: { id: targetId },
        relations: ['location'],
      });
      targetZipCode = targetUser?.location?.zipCode;
    } else if (options.entityType === 'DONATION') {
      const targetDonation = await this.entityManager.findOne(Donation, {
        where: { id: targetId },
        relations: ['location'],
      });
      targetZipCode = targetDonation?.location?.zipCode;
    }

    if (!targetZipCode) {
      throw new ForbiddenException('Target zip code is not set or target not found.');
    }

    if (currentUser.location.zipCode !== targetZipCode) {
      throw new ForbiddenException('You must be in the same neighborhood (zip code) to perform this action.');
    }

    return true;
  }

  private getRequest(context: ExecutionContext): ExtendedRequest {
    const gqlCtx = GqlExecutionContext.create(context);
    const gqlRequest = gqlCtx.getContext<{ req?: ExtendedRequest }>()?.req;
    if (gqlRequest) {
      return gqlRequest;
    }
    return context.switchToHttp().getRequest<ExtendedRequest>();
  }
}
