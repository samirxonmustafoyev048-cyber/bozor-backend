import { Module } from '@nestjs/common';
import { PaymeController } from './payme.controller';
import { PaymeService } from './payme.service';
import { ClickController } from './click.controller';
import { ClickService } from './click.service';
import { PaymentLinksController } from './payment-links.controller';

@Module({
  controllers: [PaymeController, ClickController, PaymentLinksController],
  providers: [PaymeService, ClickService],
})
export class PaymentsModule {}
