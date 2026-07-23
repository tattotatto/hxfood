export interface StoreAccountVo {
  storeId: string;
  storeName: string;
  balance: number;
  creditLimit: number;
  frozenAmount: number;
  availableBalance: number;
  status: string;
}

export interface AccountTransactionVo {
  id: string;
  transType: string;
  amount: number;
  balanceAfter: number;
  bizNo?: string;
  remark?: string;
  createdAt: string;
}

export interface ReceivableVo {
  id: string;
  orderId: string;
  orderNo: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
}
