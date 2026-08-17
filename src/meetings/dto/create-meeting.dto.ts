import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;
}