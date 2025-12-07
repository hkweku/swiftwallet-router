/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateBalanceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  chainId: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'Amount must be a valid decimal number',
  })
  amount: string;
}
