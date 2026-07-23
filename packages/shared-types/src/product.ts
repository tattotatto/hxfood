export interface SkuVo {
  id: string;
  skuCode: string;
  name: string;
  specDetail: string;
  price: number;
  stockAvailable: number;
  minOrderQty: number;
  stepOrderQty: number;
  images: string[];
}
