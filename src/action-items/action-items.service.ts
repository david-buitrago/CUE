import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { ActionItem } from './action-item';
import {
  ACTION_ITEM_EXTRACTOR,
  type ActionItemExtractor,
} from './action-item-extractor';
import { ActionItemEntity } from './action-item.entity';

@Injectable()
export class ActionItemsService {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptsService: TranscriptsService,
    @InjectRepository(ActionItemEntity)
    private readonly actionItemsRepository: Repository<ActionItemEntity>,
    @Inject(ACTION_ITEM_EXTRACTOR)
    private readonly actionItemExtractor: ActionItemExtractor,
  ) {}

  async extractForMeeting(meetingId: string): Promise<ActionItem[]> {
    await this.meetingsService.findOne(meetingId);
    const segments =
      await this.transcriptsService.findAllByMeetingId(meetingId);
    const extractedActionItems =
      await this.actionItemExtractor.extract(segments);
    const actionItems: ActionItem[] = [];
    const segmentIds = new Set(segments.map((segment) => segment.id));
    const processedSegmentIds = new Set<string>();

    for (const extractedActionItem of extractedActionItems) {
      const { sourceSegmentId, description } = extractedActionItem;

      if (
        !segmentIds.has(sourceSegmentId) ||
        processedSegmentIds.has(sourceSegmentId) ||
        description.length === 0 ||
        description.length > 500
      ) {
        continue;
      }

      processedSegmentIds.add(sourceSegmentId);

      const existingActionItem = await this.actionItemsRepository.findOneBy({
        sourceSegmentId,
      });

      if (existingActionItem) {
        actionItems.push(this.toActionItem(existingActionItem));
        continue;
      }

      const actionItem = this.actionItemsRepository.create({
        id: randomUUID(),
        meetingId,
        sourceSegmentId,
        description,
        status: 'open',
        createdAt: new Date(),
      });
      const savedActionItem = await this.actionItemsRepository.save(actionItem);
      actionItems.push(this.toActionItem(savedActionItem));
    }

    return actionItems;
  }

  async findAllByMeetingId(meetingId: string): Promise<ActionItem[]> {
    await this.meetingsService.findOne(meetingId);
    const actionItems = await this.actionItemsRepository.find({
      where: { meetingId },
      order: { createdAt: 'ASC' },
    });

    return actionItems.map((actionItem) => this.toActionItem(actionItem));
  }

  async complete(meetingId: string, id: string): Promise<ActionItem> {
    await this.meetingsService.findOne(meetingId);
    this.assertValidActionItemId(id);

    const actionItem = await this.actionItemsRepository.findOneBy({
      id,
      meetingId,
    });

    if (!actionItem) {
      throw new NotFoundException(
        `Action item with id ${id} was not found for meeting ${meetingId}`,
      );
    }

    actionItem.status = 'completed';
    const savedActionItem = await this.actionItemsRepository.save(actionItem);

    return this.toActionItem(savedActionItem);
  }

  private toActionItem(actionItem: ActionItemEntity): ActionItem {
    return {
      id: actionItem.id,
      meetingId: actionItem.meetingId,
      sourceSegmentId: actionItem.sourceSegmentId,
      description: actionItem.description,
      status: actionItem.status,
      createdAt: actionItem.createdAt.toISOString(),
    };
  }

  private assertValidActionItemId(id: string): void {
    if (!isUUID(id)) {
      throw new NotFoundException(`Action item with id ${id} was not found`);
    }
  }
}
