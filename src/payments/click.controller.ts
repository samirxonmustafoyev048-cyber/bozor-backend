import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ClickService,
  type ClickCompleteBody,
  type ClickPrepareBody,
} from './click.service';

@Controller('payments/click')
export class ClickController {
  constructor(private readonly clickService: ClickService) {}

  @Post('prepare')
  @HttpCode(200)
  prepare(@Body() body: ClickPrepareBody) {
    return this.clickService.prepare(body);
  }

  @Post('complete')
  @HttpCode(200)
  complete(@Body() body: ClickCompleteBody) {
    return this.clickService.complete(body);
  }
}
