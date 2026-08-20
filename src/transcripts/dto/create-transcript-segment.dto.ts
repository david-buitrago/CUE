import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTranscriptSegmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  speaker!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text!: string;
}
