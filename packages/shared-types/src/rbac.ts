export interface PermissionCode {
  code: string;
  resource: string;
  action: string;
  description: string;
}

export interface RoleVo {
  id: string;
  code: string;
  name: string;
  brandId?: string;
  permissions: PermissionCode[];
}
