import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class BrandVoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.brandVoice.findMany();
  }

  async findById(id: string) {
    return this.prisma.brandVoice.findUnique({ where: { id } });
  }

  async findDefault() {
    return this.prisma.brandVoice.findFirst({ where: { isDefault: true } });
  }

  async create(data: {
    name: string;
    description?: string;
    tone: string;
    guidelines?: string[];
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      // Unset previous defaults first
      await this.prisma.brandVoice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.brandVoice.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      tone: string;
      guidelines: string[];
      isDefault: boolean;
    }>,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      if (data.isDefault) {
        await tx.brandVoice.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.brandVoice.update({ where: { id }, data });
    });
  }

  async delete(id: string) {
    return this.prisma.brandVoice.delete({ where: { id } });
  }

  async setDefault(id: string) {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.brandVoice.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.brandVoice.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }
}
