/**
 * Vercel Serverless Function for Dynamic OG Meta Tags
 *
 * Handles requests from social media crawlers and returns
 * HTML with appropriate OG meta tags for rich link previews.
 *
 * Usage via vercel.json rewrites:
 * /chemistry?... → /api/og?type=chemistry&...
 * /result?... → /api/og?type=result&...
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
}

function getOgMeta(type: OgType): OgMeta {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://soul-lab.vercel.app';

  const data: Record<OgType, OgMeta> = {
    daily: {
      title: '오늘의 운명이 도착했어요 ✨',
      description: '별들이 당신에게 전하는 신비로운 메시지. 오늘의 운세를 확인하세요.',
      image: `${baseUrl}/og-daily.png`,
    },
    chemistry: {
      title: '우리의 인연을 확인해볼래? 💫',
      description: '둘의 기운이 만나면 운명이 드러납니다. 인연의 궁합을 확인하세요.',
      image: `${baseUrl}/og-chemistry.png`,
    },
    result: {
      title: '별들이 전하는 오늘의 메시지 🌙',
      description: '오늘 나에게 전해진 운명의 메시지. 당신도 확인해보세요.',
      image: `${baseUrl}/og-result.png`,
    },
    tarot: {
      title: '타로 카드가 말하는 운명 🔮',
      description: '78장의 타로 카드가 전하는 신비로운 메시지.',
      image: `${baseUrl}/og-tarot.png`,
    },
  };

  return data[type] || data.daily;
}

function renderOgHtml(meta: OgMeta, url: string, redirectUrl: string): string {
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
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Soul Lab">
  <meta property="og:locale" content="ko_KR">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.title}">
  <meta name="twitter:description" content="${meta.description}">
  <meta name="twitter:image" content="${meta.image}">

  <!-- Theme -->
  <meta name="theme-color" content="#1a0f2e">

  <!-- Redirect for users (not crawlers) -->
  <script>window.location.href = "${redirectUrl}";</script>
</head>
<body style="background: #1a0f2e; color: #fff; font-family: sans-serif; text-align: center; padding: 40px;">
  <h1 style="color: #9370db;">${meta.title}</h1>
  <p>${meta.description}</p>
  <p><a href="${redirectUrl}" style="color: #ffd700;">Soul Lab 열기</a></p>
</body>
</html>`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent'];
  const { type = 'daily', ...params } = req.query;

  const ogType = (typeof type === 'string' ? type : 'daily') as OgType;

  // Build the actual page URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://soul-lab.vercel.app';

  const pathMap: Record<OgType, string> = {
    daily: '/',
    chemistry: '/chemistry',
    result: '/result',
    tarot: '/tarot',
  };

  // Build query string from remaining params
  const queryParams = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const pagePath = pathMap[ogType] || '/';
  const pageUrl = `${baseUrl}${pagePath}${queryParams ? `?${queryParams}` : ''}`;

  // For crawlers, return OG HTML
  if (isCrawler(userAgent)) {
    const meta = getOgMeta(ogType);
    const html = renderOgHtml(meta, pageUrl, pageUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.status(200).send(html);
  }

  // For regular users, redirect to the SPA
  return res.redirect(302, pageUrl);
}
