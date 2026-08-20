import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ActionItemsModule } from './action-items/action-items.module';
import { HealthModule } from './health/health.module';
import { MeetingsModule } from './meetings/meetings.module';
import { SimulatorModule } from './simulator/simulator.module';
import { SummariesModule } from './summaries/summaries.module';
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

        const configuredProvider = environment.INSIGHTS_PROVIDER;

        if (
          configuredProvider !== undefined &&
          typeof configuredProvider !== 'string'
        ) {
          throw new Error(
            'INSIGHTS_PROVIDER must be rule, opencode, or ollama',
          );
        }

        const provider = configuredProvider ?? 'rule';

        if (!['rule', 'opencode', 'ollama'].includes(provider)) {
          throw new Error(
            'INSIGHTS_PROVIDER must be rule, opencode, or ollama',
          );
        }

        if (
          provider === 'opencode' &&
          (typeof environment.OPENCODE_API_KEY !== 'string' ||
            environment.OPENCODE_API_KEY.length === 0)
        ) {
          throw new Error(
            'OPENCODE_API_KEY must be configured when using OpenCode Go',
          );
        }

        if (
          provider === 'ollama' &&
          (typeof environment.OLLAMA_BASE_URL !== 'string' ||
            environment.OLLAMA_BASE_URL.length === 0)
        ) {
          throw new Error(
            'OLLAMA_BASE_URL must be configured when using Ollama',
          );
        }

        return { ...environment, INSIGHTS_PROVIDER: provider };
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
    SummariesModule,
    TranscriptsModule,
    SimulatorModule,
  ],
})
export class AppModule {}
