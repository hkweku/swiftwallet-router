import { IsDecimal, IsNotEmpty, IsString } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @IsDecimal({ decimal_digits: '1,6' })
  amount: string;
}
