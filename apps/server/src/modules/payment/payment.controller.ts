import { Controller, Post, Body, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { PayDto } from './dto/pay.dto';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /** 统一支付入口 — 加盟店审核通过后发起 */
  @Post('pay')
  @RequirePermission('order:create')
  async pay(@Body() dto: PayDto, @BrandContext() ctx: any) {
    return this.paymentService.pay(dto, ctx.brandId, ctx.orgId);
  }

  /** Mock 微信支付确认 — 开发阶段手动确认 */
  @Post('mock-confirm')
  @RequirePermission('order:create')
  async mockConfirm(@Body('orderId') orderId: string) {
    const order = await this.paymentService.getOrderForPayment(orderId);
    return this.paymentService.handleWechatCallback(
      { out_trade_no: order.orderNo, transaction_id: `mock_txn_${Date.now()}`, amount: { total: order.totalAmount } },
      '', '', '', '',
    );
  }

  /** 微信支付回调 — 公开接口 */
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
}
