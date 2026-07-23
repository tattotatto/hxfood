export enum OrderType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  RETURN = 'return',
  TRANSFER = 'transfer',
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_PRODUCTION = 'pending_production',
  IN_PRODUCTION = 'in_production',
  PARTIALLY_PRODUCED = 'partially_produced',
  PRODUCED = 'produced',
  PARTIALLY_SHIPPED = 'partially_shipped',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BALANCE = 'balance',
  WECHAT = 'wechat',
  CREDIT = 'credit',
  MIXED = 'mixed',
}

export enum OrgType {
  HEADQUARTERS = 'headquarters',
  CENTRAL_KITCHEN = 'central_kitchen',
  FRANCHISE_STORE = 'franchise_store',
  SUPPLIER = 'supplier',
  WAREHOUSE = 'warehouse',
}

export enum TransType {
  RECHARGE = 'recharge',
  ORDER_PAY = 'order_pay',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  CREDIT_REPAY = 'credit_repay',
}

export enum ReceivableStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WRITTEN_OFF = 'written_off',
}

export enum InvTransType {
  PURCHASE_IN = 'purchase_in',
  PRODUCTION_IN = 'production_in',
  RETURN_IN = 'return_in',
  SALE_OUT = 'sale_out',
  SCRAP_OUT = 'scrap_out',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  ADJUSTMENT = 'adjustment',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  INITIAL = 'initial',
}

export enum PricePolicyType {
  DEFAULT = 'default',
  STORE_LEVEL = 'store_level',
  PROMOTION = 'promotion',
  CONTRACT = 'contract',
}

export enum StorageType {
  AMBIENT = 'ambient',
  REFRIGERATED = 'refrigerated',
  FROZEN = 'frozen',
}
