import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsModule } from '../meetings/meetings.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { ActionItemEntity } from './action-item.entity';
import { ACTION_ITEM_EXTRACTOR } from './action-item-extractor';
import { ActionItemsController } from './action-items.controller';
import { ActionItemsService } from './action-items.service';
import { OllamaActionItemExtractor } from './extractors/ollama-action-item.extractor';
import { OpenCodeActionItemExtractor } from './extractors/opencode-action-item.extractor';
import { RuleBasedActionItemExtractor } from './extractors/rule-based-action-item.extractor';

@Module({
  imports: [
    MeetingsModule,
    TranscriptsModule,
    TypeOrmModule.forFeature([ActionItemEntity]),
  ],
  controllers: [ActionItemsController],
  providers: [
    ActionItemsService,
    RuleBasedActionItemExtractor,
    OpenCodeActionItemExtractor,
    OllamaActionItemExtractor,
    {
      provide: ACTION_ITEM_EXTRACTOR,
      inject: [
        ConfigService,
        RuleBasedActionItemExtractor,
        OpenCodeActionItemExtractor,
        OllamaActionItemExtractor,
      ],
      useFactory: (
        configService: ConfigService,
        ruleBasedExtractor: RuleBasedActionItemExtractor,
        openCodeExtractor: OpenCodeActionItemExtractor,
        ollamaExtractor: OllamaActionItemExtractor,
      ) => {
        switch (configService.get<string>('INSIGHTS_PROVIDER', 'rule')) {
          case 'opencode':
            return openCodeExtractor;
          case 'ollama':
            return ollamaExtractor;
          default:
            return ruleBasedExtractor;
        }
      },
    },
  ],
})
export class ActionItemsModule {}
