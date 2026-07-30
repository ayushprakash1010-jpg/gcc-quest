import { IsNumber, Min, Max } from 'class-validator';

export class UpdateQualityDto {
  @IsNumber()
  @Min(0)
  @Max(10)
  trustScore: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  authorityScore: number;
}
