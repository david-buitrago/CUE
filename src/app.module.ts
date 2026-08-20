import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ActionItemsModule } from './action-items/action-items.module';
import { HealthModule } from './health/health.module';
import { MeetingsModule } from './meetings/meetings.module';
import { SimulatorModule } from './simulator/simulator.module';
import { TranscriptsModule } from './transcripts/transcripts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: (environment: Record<string, unknown>) => {
        if (
          typeof environment.DATABASE_URL !== 'string' ||
          environment.DATABASE_URL.length === 0
        ) {
          throw new Error('DATABASE_URL must be configured');
        }

        return environment;
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    ActionItemsModule,
    HealthModule,
    MeetingsModule,
    TranscriptsModule,
    SimulatorModule,
  ],
})
export class AppModule {}
