import { Body, Controller, Post } from '@nestjs/common';
import { TransfersService, TransferResponse } from './transfers.service';
import { CreateTransferDto } from './dtos/create-transfer.dto';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(@Body() dto: CreateTransferDto): Promise<TransferResponse> {
    return this.transfersService.createTransfer(dto);
  }
}
