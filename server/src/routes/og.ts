/**
 * OG Meta Tag Dynamic Rendering
 *
 * Serves HTML with dynamic OG meta tags for social sharing.
 * Detects crawlers (Kakao, Facebook, Twitter) and returns appropriate meta tags.
 * Regular users are redirected to the SPA.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loadConfig } from '../config/index.js';

const config = loadConfig();

// Crawler User-Agent patterns
const CRAWLER_PATTERNS = [
  /kakaotalk/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /slackbot/i,
  /telegrambot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /discordbot/i,
  /googlebot/i,
  /bingbot/i,
];

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_PATTERNS.some((pattern) => pattern.test(userAgent));
}

type OgType = 'daily' | 'chemistry' | 'result' | 'tarot';

interface OgMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

function getOgMeta(type: OgType, params: Record<string, string> = {}): OgMeta {
  const baseUrl = config.WEB_BASE_URL || 'https://soul-lab.vercel.app';
  const ogBaseUrl = config.OG_BASE_URL || baseUrl;

  const titles: Record<OgType, string> = {
    daily: '오늘의 운명이 도착했어요 ✨',
    chemistry: '우리의 인연을 확인해볼래? 💫',
    result: '별들이 전하는 오늘의 메시지 🌙',
    tarot: '타로 카드가 말하는 운명 🔮',
  };

  const descriptions: Record<OgType, string> = {
    daily: '별들이 당신에게 전하는 신비로운 메시지. 오늘의 운세를 확인하세요.',
    chemistry: '둘의 기운이 만나면 운명이 드러납니다. 인연의 궁합을 확인하세요.',
    result: '오늘 나에게 전해진 운명의 메시지. 당신도 확인해보세요.',
    tarot: '78장의 타로 카드가 전하는 신비로운 메시지.',
  };

  // Build URL with query params
  const pathMap: Record<OgType, string> = {
    daily: '/',
    chemistry: '/chemistry',
    result: '/result',
    tarot: '/tarot',
  };

  let url = `${baseUrl}${pathMap[type]}`;
  if (Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    url = `${url}?${qs}`;
  }

  return {
    title: titles[type],
    description: descriptions[type],
    image: `${ogBaseUrl}/og-${type}.png`,
    url,
  };
}

function renderOgHtml(meta: OgMeta, redirectUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title} | Soul Lab</title>
  <meta name="description" content="${meta.description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${meta.title}">
  <meta property="og:description" content="${meta.description}">
  <meta property="og:image" content="${meta.image}">
  <meta property="og:url" content="${meta.url}">
  <meta property="og:site_name" content="Soul Lab">
  <meta property="og:locale" content="ko_KR">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.title}">
  <meta name="twitter:description" content="${meta.description}">
  <meta name="twitter:image" content="${meta.image}">

  <!-- Kakao -->
  <meta property="kakao:title" content="${meta.title}">
  <meta property="kakao:description" content="${meta.description}">
  <meta property="kakao:image" content="${meta.image}">

  <!-- Theme -->
  <meta name="theme-color" content="#1a0f2e">

  <!-- Redirect for non-crawlers -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <script>window.location.href = "${redirectUrl}";</script>
</head>
<body style="background: #1a0f2e; color: #fff; font-family: sans-serif; text-align: center; padding: 40px;">
  <h1>${meta.title}</h1>
  <p>${meta.description}</p>
  <p><a href="${redirectUrl}" style="color: #9370db;">Soul Lab 열기</a></p>
</body>
</html>`;
}

export async function ogRoutes(app: FastifyInstance) {
  // Chemistry share page
  app.get('/chemistry', async (req: FastifyRequest, reply: FastifyReply) => {
    const ua = req.headers['user-agent'];
    const query = req.query as Record<string, string>;

    if (!isCrawler(ua)) {
      // Redirect to SPA
      const baseUrl = config.WEB_BASE_URL || 'https://soul-lab.vercel.app';
      const qs = new URLSearchParams(query).toString();
      return reply.redirect(`${baseUrl}/chemistry${qs ? `?${qs}` : ''}`);
    }

    const meta = getOgMeta('chemistry', query);
    const html = renderOgHtml(meta, meta.url);
    return reply.type('text/html').send(html);
  });

  // Result share page
  app.get('/result', async (req: FastifyRequest, reply: FastifyReply) => {
    const ua = req.headers['user-agent'];
    const query = req.query as Record<string, string>;

    if (!isCrawler(ua)) {
      const baseUrl = config.WEB_BASE_URL || 'https://soul-lab.vercel.app';
      const qs = new URLSearchParams(query).toString();
      return reply.redirect(`${baseUrl}/result${qs ? `?${qs}` : ''}`);
    }

    const meta = getOgMeta('result', query);
    const html = renderOgHtml(meta, meta.url);
    return reply.type('text/html').send(html);
  });

  // Tarot share page
  app.get('/tarot', async (req: FastifyRequest, reply: FastifyReply) => {
    const ua = req.headers['user-agent'];
    const query = req.query as Record<string, string>;

    if (!isCrawler(ua)) {
      const baseUrl = config.WEB_BASE_URL || 'https://soul-lab.vercel.app';
      const qs = new URLSearchParams(query).toString();
      return reply.redirect(`${baseUrl}/tarot${qs ? `?${qs}` : ''}`);
    }

    const meta = getOgMeta('tarot', query);
    const html = renderOgHtml(meta, meta.url);
    return reply.type('text/html').send(html);
  });

  // Daily fortune share page (homepage)
  app.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const ua = req.headers['user-agent'];

    if (!isCrawler(ua)) {
      const baseUrl = config.WEB_BASE_URL || 'https://soul-lab.vercel.app';
      return reply.redirect(baseUrl);
    }

    const meta = getOgMeta('daily');
    const html = renderOgHtml(meta, meta.url);
    return reply.type('text/html').send(html);
  });
}
