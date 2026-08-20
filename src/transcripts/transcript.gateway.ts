import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace } from 'socket.io';
import { TranscriptSegment } from './transcript-segment';

@WebSocketGateway({
  namespace: 'live',
  cors: {
    origin: true,
  },
})
export class TranscriptGateway {
  @WebSocketServer()
  private server!: Namespace;

  emitSegmentCreated(segment: TranscriptSegment): void {
    this.server.emit('transcript.segment.created', segment);
  }
}
