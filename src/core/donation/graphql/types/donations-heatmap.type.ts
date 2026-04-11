import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { DonationHeatmapCellType } from './donation-heatmap-cell.type';

@ObjectType('DonationsHeatmap')
export class DonationsHeatmapType {
  @Field(() => [DonationHeatmapCellType])
  cells: DonationHeatmapCellType[];

  @Field(() => Float)
  maxScore: number;

  @Field(() => Int)
  totalCells: number;
}
