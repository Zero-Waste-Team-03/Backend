import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Location } from '../../locations/entities/location.entity';

@Injectable()
export class LocationDataLoader {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  createLoader(): DataLoader<string, Location | null> {
    return new DataLoader<string, Location | null>(
      async (locationIds: readonly string[]) => {
        const locations = await this.locationRepository.find({
          where: { id: In([...locationIds]) },
        });

        // Map the results back to the original ids order
        const locationMap = new Map(locations.map((loc) => [loc.id, loc]));
        return locationIds.map((id) => locationMap.get(id) || null);
      },
      {
        cache: true,
        batch: true,
      },
    );
  }
}
