import { decimalToString } from '../../common/utils/decimal.utils';
import { DecimalType } from '../../common/utils/decimal.utils';

type TransferStepType = {
  id: string;
  transferId: string;
  type: string;
  chainId: string;
  amount: DecimalType;
  feeUsd: DecimalType;
  txId: string | null;
  status: string;
};

export class TransferStepEntity {
  id: string;
  transferId: string;
  type: string;
  chainId: string;
  amount: string;
  feeUsd: string;
  status: string;
  txId?: string | null;

  constructor(step: TransferStepType) {
    this.id = step.id;
    this.transferId = step.transferId;
    this.type = step.type;
    this.chainId = step.chainId;
    this.amount = decimalToString(step.amount);
    this.feeUsd = decimalToString(step.feeUsd);
    this.status = step.status;
    this.txId = step.txId;
  }
}
