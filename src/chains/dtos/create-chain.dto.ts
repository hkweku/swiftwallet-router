/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateChainDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  nativeToken: string;

  @IsString()
  @IsNotEmpty()
  usdcAddress: string;

  @IsBoolean()
  isActive: boolean;
}
