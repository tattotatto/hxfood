import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PayDto } from './dto/pay.dto';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private prisma: PrismaService) {}

  async pay(dto: PayDto, brandId: string, storeId: string) {
    // 查询订单，校验状态必须是 approved
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId, brandId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.orderStatus !== 'approved') {
      throw new BadRequestException('Order must be approved before payment');
    }

    // 分发到余额或微信
    if (dto.paymentMethod === 'balance') {
      return this.payByBalance(order.id, brandId, storeId, order.totalAmount);
    } else {
      return this.createWechatPayment(order.id, 'mock_openid', order.totalAmount, order.orderNo);
    }
  }

  /** 微信支付统一下单 (JSAPI) — Phase 2 骨架，待对接真实 API */
  async createWechatPayment(orderId: string, openid: string, amountFen: number, description: string) {
    this.logger.log(`[WechatPay] Creating payment for order ${orderId}: ¥${(amountFen / 100).toFixed(2)}`);

    // TODO Phase 2+: 调用微信支付 V3 API 统一下单
    // const resp = await this.wechatPay.transactions_jsapi({
    //   appid: process.env.WECHAT_APPID,
    //   mchid: process.env.WECHAT_MCHID,
    //   description,
    //   out_trade_no: orderId,
    //   notify_url: `${process.env.API_BASE}/api/v1/payment/callback/wechat`,
    //   amount: { total: amountFen, currency: 'CNY' },
    //   payer: { openid },
    // });

    return {
      prepayId: `mock_prepay_${orderId}`,
      orderId,
      amountFen,
      status: 'pending',
    };
  }

  /** 处理微信支付回调 */
  async handleWechatCallback(body: any, signature: string, serial: string, timestamp: string, nonce: string) {
    this.logger.log(`[WechatPay] Callback received for out_trade_no: ${body.out_trade_no}`);

    const outTradeNo = body.out_trade_no;
    const transactionId = body.transaction_id;

    // 幂等：检查是否已处理过此 callback
    const existing = await this.prisma.accountTransaction.findFirst({
      where: { bizNo: transactionId },
    });
    if (existing) {
      this.logger.warn(`[WechatPay] Duplicate callback for transaction ${transactionId}, ignored`);
      return { code: 'SUCCESS', message: 'Already processed' };
    }

    // 查找订单并入账
    const order = await this.prisma.order.findUnique({
      where: { orderNo: outTradeNo },
    });
    if (!order) {
      this.logger.error(`[WechatPay] Order not found: ${outTradeNo}`);
      return { code: 'FAIL', message: 'Order not found' };
    }

    // 记录支付流水
    await this.prisma.accountTransaction.create({
      data: {
        brandId: order.brandId,
        storeId: order.storeId,
        orderId: order.id,
        transType: 'order_pay',
        amount: -body.amount?.total || 0,
        balanceAfter: 0,
        bizNo: transactionId,
        remark: `微信支付: ${transactionId}`,
      },
    });

    this.logger.log(`[WechatPay] Payment confirmed: order ${outTradeNo}, txn ${transactionId}`);
    return { code: 'SUCCESS' };
  }

  /** 余额支付 */
  async payByBalance(orderId: string, brandId: string, storeId: string, amountFen: number) {
    const account = await this.prisma.storeAccount.findUnique({ where: { storeId } });
    if (!account || account.balance - account.frozenAmount < amountFen) {
      throw new Error('Insufficient balance');
    }

    const newBalance = account.balance - amountFen;
    await this.prisma.storeAccount.update({
      where: { storeId },
      data: { balance: newBalance, updatedAt: new Date() },
    });

    await this.prisma.accountTransaction.create({
      data: {
        brandId,
        storeId,
        orderId,
        transType: 'order_pay',
        amount: -amountFen,
        balanceAfter: newBalance,
        remark: '余额支付',
      },
    });

    this.logger.log(`[BalancePay] Order ${orderId}: deducted ¥${(amountFen / 100).toFixed(2)}`);
    return { success: true, newBalance };
  }
}
