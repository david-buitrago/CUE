import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { MeetingsService } from '../meetings/meetings.service';
import { TranscriptsService } from '../transcripts/transcripts.service';
import { ActionItem } from './action-item';
import { ActionItemEntity } from './action-item.entity';

@Injectable()
export class ActionItemsService {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptsService: TranscriptsService,
    @InjectRepository(ActionItemEntity)
    private readonly actionItemsRepository: Repository<ActionItemEntity>,
  ) {}

  async extractForMeeting(meetingId: string): Promise<ActionItem[]> {
    await this.meetingsService.findOne(meetingId);
    const segments =
      await this.transcriptsService.findAllByMeetingId(meetingId);
    const actionItems: ActionItem[] = [];

    for (const segment of segments) {
      const description = this.extractDescription(segment.text);

      if (!description) {
        continue;
      }

      const existingActionItem = await this.actionItemsRepository.findOneBy({
        sourceSegmentId: segment.id,
      });

      if (existingActionItem) {
        actionItems.push(this.toActionItem(existingActionItem));
        continue;
      }

      const actionItem = this.actionItemsRepository.create({
        id: randomUUID(),
        meetingId,
        sourceSegmentId: segment.id,
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

  private extractDescription(text: string): string | undefined {
    const match = /^(?:action|todo):\s*(.+)$/i.exec(text.trim());

    return match?.[1]?.trim() || undefined;
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
}
