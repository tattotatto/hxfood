export interface JwtPayload {
  sub: string;
  orgId: string;
  orgType: string;
  brands: string[];
  roles: string[];
  permissions: string[];
  openid?: string;
  iat?: number;
  exp?: number;
}

export interface LoginDto {
  username: string;
  password: string;
  brandId?: string;
}

export interface WechatLoginDto {
  code: string;
  brandId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  username: string;
  realName: string;
  phone: string;
  avatar: string;
  orgs: OrgProfile[];
  currentOrg?: OrgProfile;
}

export interface OrgProfile {
  id: string;
  name: string;
  orgType: string;
  brandId: string;
  brandName: string;
  roles: string[];
  permissions: string[];
}
