export interface InventoryVo {
  skuId: string;
  skuCode: string;
  skuName: string;
  lotNo: string;
  quantity: number;
  lockedQty: number;
  availableQty: number;
  expiryAt: string;
  status: string;
}
