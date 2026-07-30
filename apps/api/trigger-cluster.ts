import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ClusterFinalizationCron } from './src/modules/story-clustering/application/cluster-finalization.cron';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cron = app.get(ClusterFinalizationCron);
  await cron.finalizeClusters();
  await app.close();
}
bootstrap();
