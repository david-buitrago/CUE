export type ActionItemStatus = 'open' | 'completed';

export interface ActionItem {
  id: string;
  meetingId: string;
  sourceSegmentId: string;
  description: string;
  status: ActionItemStatus;
  createdAt: string;
}
