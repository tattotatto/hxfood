export interface CreateOrderItemDto {
  skuId: string;
  quantity: number;
}

export interface CreateOrderDto {
  idempotencyKey: string;
  items: CreateOrderItemDto[];
  paymentMethod: 'balance' | 'wechat' | 'credit' | 'mixed';
  shippingAddress?: object;
  expectedAt?: string;
  notes?: string;
}

export interface OrderItemVo {
  id: string;
  skuCode: string;
  skuName: string;
  unitPrice: number;
  quantity: number;
  shippedQty: number;
  receivedQty: number;
  amount: number;
  status: string;
  lotNo?: string;
}

export interface OrderVo {
  id: string;
  orderNo: string;
  orderStatus: string;
  orderType: string;
  totalAmount: number;
  paymentMethod: string;
  storeName: string;
  items: OrderItemVo[];
  timeline: OrderTimelineEntry[];
  createdAt: string;
}

export interface OrderTimelineEntry {
  time: string;
  status: string;
  operator: string;
  remark?: string;
}
