import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public';
import { RequirePermission } from '../../common/decorators/require-permission';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /** 微信支付回调 — 公开接口，不需要认证（由微信签名验证保障） */
  @Public()
  @Post('callback/wechat')
  async wechatCallback(
    @Body() body: any,
    @Headers('wechatpay-signature') signature: string,
    @Headers('wechatpay-serial') serial: string,
    @Headers('wechatpay-timestamp') timestamp: string,
    @Headers('wechatpay-nonce') nonce: string,
  ) {
    return this.paymentService.handleWechatCallback(body, signature, serial, timestamp, nonce);
  }

  /** 余额支付（加盟店在小程序发起） */
  @Post('pay-by-balance')
  @RequirePermission('order:create')
  async payByBalance(
    @Body() dto: { orderId: string; brandId: string; storeId: string; amountFen: number },
  ) {
    return this.paymentService.payByBalance(
      dto.orderId, dto.brandId, dto.storeId, dto.amountFen,
    );
  }
}
