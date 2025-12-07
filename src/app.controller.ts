import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller()
@ApiExcludeController()
export class AppController {
  @Get()
  getRoot() {
    return {
      title: 'SwiftWallet Routing Engine for BMONI',
      version: '1.0.0',
      description:
        'API for routing USDC transfers optimally across multiple chains',
    };
  }
}
