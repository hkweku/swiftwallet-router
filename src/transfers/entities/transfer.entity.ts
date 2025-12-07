import { decimalToString } from '../../common/utils/decimal.utils';
import { TransferStepEntity } from './transfer-step.entity';
import { DecimalType } from '../../common/utils/decimal.utils';

type TransferType = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: DecimalType;
  status: string;
  createdAt: Date;
};

export class TransferEntity {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  status: string;
  createdAt: Date;
  steps: TransferStepEntity[];

  constructor(transfer: TransferType, steps: TransferStepEntity[]) {
    this.id = transfer.id;
    this.fromUserId = transfer.fromUserId;
    this.toUserId = transfer.toUserId;
    this.amount = decimalToString(transfer.amount);
    this.status = transfer.status;
    this.createdAt = transfer.createdAt;
    this.steps = steps;
  }
}
