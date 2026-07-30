import {
  IsString,
  IsUrl,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import {
  SourceType,
  SourceCategory,
  CrawlFrequency,
  SourceStatus,
} from '@prisma/client';

export class UpdateSourceDto {
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  url?: string;

  @IsEnum(SourceType)
  @IsOptional()
  type?: SourceType;

  @IsEnum(SourceCategory)
  @IsOptional()
  category?: SourceCategory;

  @IsEnum(CrawlFrequency)
  @IsOptional()
  crawlFrequency?: CrawlFrequency;

  @IsEnum(SourceStatus)
  @IsOptional()
  status?: SourceStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  trustScore?: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  authorityScore?: number;
}
