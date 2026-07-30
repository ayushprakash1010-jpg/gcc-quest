import {
  IsString,
  IsUrl,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { SourceType, SourceCategory, CrawlFrequency } from '@prisma/client';

export class CreateSourceDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;

  @IsEnum(SourceType)
  type: SourceType;

  @IsEnum(SourceCategory)
  category: SourceCategory;

  @IsEnum(CrawlFrequency)
  @IsOptional()
  crawlFrequency?: CrawlFrequency;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
