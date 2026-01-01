/**
 * Profile Routes - User profile management API.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProfileStore, CreateProfileInput } from '../profile/store.js';
import { isEncryptionConfigured } from '../lib/crypto.js';

interface ProfileRouteOptions {
  profileStore: ProfileStore;
}

export default async function profileRoutes(
  app: FastifyInstance,
  opts: ProfileRouteOptions
) {
  const { profileStore } = opts;

  // ============================================================
  // GET /api/profile - Retrieve user profile
  // ============================================================
  app.get('/api/profile', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, string>;
    const userKey = String(query.userKey ?? '').trim();

    if (!userKey) {
      return reply.code(400).send({ error: 'userKey_required' });
    }

    const profile = profileStore.get(userKey);

    if (!profile) {
      return { success: true, profile: null };
    }

    return {
      success: true,
      profile: {
        birthdate: profile.birthdate,
        consents: profile.consents,
        syncedAt: profile.syncedAt,
      },
    };
  });

  // ============================================================
  // POST /api/profile - Create or update profile
  // ============================================================
  app.post('/api/profile', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!isEncryptionConfigured()) {
      return reply.code(503).send({
        error: 'encryption_not_configured',
        message: 'Server encryption is not configured.',
      });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const userKey = String(body.userKey ?? '').trim();
    const birthdate = String(body.birthdate ?? '').trim();
    const consents = body.consents as Record<string, boolean> | undefined;
    const consentedAt = body.consentedAt as string | undefined;
    const tossPublicKey = body.tossPublicKey as string | undefined;

    // Validation
    if (!userKey) {
      return reply.code(400).send({ error: 'userKey_required' });
    }
    if (!birthdate || !/^\d{8}$/.test(birthdate)) {
      return reply.code(400).send({ error: 'invalid_birthdate', message: 'Birthdate must be YYYYMMDD' });
    }
    if (!consents || typeof consents.terms !== 'boolean') {
      return reply.code(400).send({ error: 'consents_required' });
    }
    if (!consents.terms) {
      return reply.code(400).send({ error: 'terms_consent_required' });
    }

    try {
      const input: CreateProfileInput = {
        userKey,
        birthdate,
        consents: {
          terms: consents.terms,
          thirdParty: consents.thirdParty ?? false,
          marketing: consents.marketing ?? false,
        },
        consentedAt,
        tossPublicKey,
      };

      const profile = await profileStore.createOrUpdate(input);

      return {
        success: true,
        profile: {
          userKey: profile.userKey,
          hashedBirthdate: profile.birthdateHash,
          consents: profile.consents,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    } catch (err) {
      console.error('[POST /api/profile] Error:', err);
      return reply.code(500).send({ error: 'internal_error' });
    }
  });

  // ============================================================
  // POST /api/profile/sync - Migrate existing localStorage data
  // ============================================================
  app.post('/api/profile/sync', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!isEncryptionConfigured()) {
      return reply.code(503).send({ error: 'encryption_not_configured' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const userKey = String(body.userKey ?? '').trim();
    const birthdate = String(body.birthdate ?? '').trim();
    const consents = body.consents as Record<string, boolean> | undefined;
    const consentedAt = body.consentedAt as string | undefined;

    if (!userKey) {
      return reply.code(400).send({ error: 'userKey_required' });
    }
    if (!birthdate || !/^\d{8}$/.test(birthdate)) {
      return reply.code(400).send({ error: 'invalid_birthdate' });
    }

    // Check if already synced
    const existing = profileStore.getRaw(userKey);
    if (existing) {
      return {
        success: true,
        synced: false,
        reason: 'already_exists',
        profile: {
          userKey: existing.userKey,
          updatedAt: existing.updatedAt,
        },
      };
    }

    try {
      const input: CreateProfileInput = {
        userKey,
        birthdate,
        consents: {
          terms: consents?.terms ?? true,
          thirdParty: consents?.thirdParty ?? false,
          marketing: consents?.marketing ?? false,
        },
        consentedAt,
      };

      const profile = await profileStore.createOrUpdate(input);

      return {
        success: true,
        synced: true,
        profile: {
          userKey: profile.userKey,
          createdAt: profile.createdAt,
        },
      };
    } catch (err) {
      console.error('[POST /api/profile/sync] Error:', err);
      return reply.code(500).send({ error: 'internal_error' });
    }
  });

  // ============================================================
  // DELETE /api/profile - Delete profile (GDPR)
  // ============================================================
  app.delete('/api/profile', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, string>;
    const userKey = String(query.userKey ?? '').trim();

    if (!userKey) {
      return reply.code(400).send({ error: 'userKey_required' });
    }

    const deleted = profileStore.delete(userKey);

    return {
      success: true,
      deleted,
    };
  });

  // ============================================================
  // POST /api/profile/link - Link Toss identity
  // ============================================================
  app.post('/api/profile/link', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const deviceUserKey = String(body.deviceUserKey ?? '').trim();
    const tossPublicKey = String(body.tossPublicKey ?? '').trim();

    if (!deviceUserKey) {
      return reply.code(400).send({ error: 'deviceUserKey_required' });
    }
    if (!tossPublicKey) {
      return reply.code(400).send({ error: 'tossPublicKey_required' });
    }

    const linked = profileStore.linkTossKey(deviceUserKey, tossPublicKey);

    if (!linked) {
      return reply.code(404).send({ error: 'profile_not_found' });
    }

    return { success: true, linked: true };
  });
}
