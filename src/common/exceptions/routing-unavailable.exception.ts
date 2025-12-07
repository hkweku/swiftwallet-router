import { ServiceUnavailableException } from '@nestjs/common';

export class RoutingUnavailableException extends ServiceUnavailableException {
  constructor(message = 'No viable route could be found for this transfer') {
    super(message);
  }
}
