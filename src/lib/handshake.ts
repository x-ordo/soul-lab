import { hash32 } from '../utils/engine';

/**
 * Server-less 2-step handshake
 * 1) inviter shares: /chemistry?from=A&d=YYYYMMDD&sig=...
 * 2) invitee generates response link (shares back): /chemistry?from=A&to=B&d=YYYYMMDD&sig=...
 *
 * Outsider guard:
 * - paired link can be opened only if local userKey matches either 'from' or 'to'
 */
const SALT = 'soul_lab_handshake_v1';

function sig(from: string, to: string | null, d: string): string {
  const payload = `${from}|${to ?? ''}|${d}|${SALT}`;
  return (hash32(payload) >>> 0).toString(36);
}

export function buildInviteDeepLink(fromKey: string, dateKey: string): string {
  const s = sig(fromKey, null, dateKey);
  return `intoss://soul-lab/chemistry?from=${encodeURIComponent(fromKey)}&d=${encodeURIComponent(dateKey)}&sig=${encodeURIComponent(s)}`;
}

export function buildResponseDeepLink(fromKey: string, toKey: string, dateKey: string): string {
  const s = sig(fromKey, toKey, dateKey);
  return `intoss://soul-lab/chemistry?from=${encodeURIComponent(fromKey)}&to=${encodeURIComponent(toKey)}&d=${encodeURIComponent(dateKey)}&sig=${encodeURIComponent(s)}`;
}

export type HandshakeParams = {
  from: string | null;
  to: string | null;
  d: string | null;
  sig: string | null;
  kind: 'none' | 'invite' | 'paired';
  sigValid: boolean;
};

export function parseHandshake(search: URLSearchParams): HandshakeParams {
  const from = search.get('from');
  const to = search.get('to');
  const d = search.get('d');
  const s = search.get('sig');

  if (!from || !d || !s) {
    return { from, to, d, sig: s, kind: 'none', sigValid: false };
  }

  const expected = sig(from, to, d);
  const sigValid = expected === s;

  const kind: HandshakeParams['kind'] = to ? 'paired' : 'invite';
  return { from, to, d, sig: s, kind, sigValid };
}
