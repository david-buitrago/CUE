export type MeetingStatus = 'active' | 'ended';

export interface Meeting {
  id: string;
  title: string;
  status: MeetingStatus;
  startedAt: string;
}