import { BadRequestException } from '@nestjs/common';

export class InsufficientBalanceException extends BadRequestException {
  constructor(message = 'Insufficient balance for this operation') {
    super(message);
  }
}
