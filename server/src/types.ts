export type InviteStatus = 'pending' | 'paired' | 'expired';

export type InviteRecord = {
  inviteId: string;
  inviterKey: string;
  inviteeKey?: string;

  createdAt: number;
  expiresAt: number;

  // 재발급 시 기존 링크 즉시 무효화
  revoked?: boolean;
};
