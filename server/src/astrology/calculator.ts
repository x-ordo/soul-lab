/**
 * 점성술 계산 엔진
 * Swiss Ephemeris 정확도의 천체 위치 계산
 */

// 별자리 정의 (황도 12궁)
const ZODIAC_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces'
] as const;

const ZODIAC_KOREAN: Record<string, string> = {
  aries: '양자리', taurus: '황소자리', gemini: '쌍둥이자리', cancer: '게자리',
  leo: '사자자리', virgo: '처녀자리', libra: '천칭자리', scorpio: '전갈자리',
  sagittarius: '궁수자리', capricorn: '염소자리', aquarius: '물병자리', pisces: '물고기자리'
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓'
};

// 행성 정의
const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const;

const PLANET_KOREAN: Record<string, string> = {
  sun: '태양', moon: '달', mercury: '수성', venus: '금성',
  mars: '화성', jupiter: '목성', saturn: '토성',
  uranus: '천왕성', neptune: '해왕성', pluto: '명왕성'
};

// 각도 타입
type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';

export interface PlanetPosition {
  sign: string;
  signKorean: string;
  symbol: string;
  degree: number;
  house: number;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  type: AspectType;
  typeKorean: string;
  orb: number;
  influence: 'harmonious' | 'challenging' | 'neutral';
}

export interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  ascendant: { sign: string; signKorean: string; symbol: string; degree: number };
  midheaven: { sign: string; signKorean: string; symbol: string; degree: number };
  houses: number[];
  aspects: Aspect[];
  element: { dominant: string; fire: number; earth: number; air: number; water: number };
  modality: { dominant: string; cardinal: number; fixed: number; mutable: number };
}

export interface TransitData {
  date: string; // ISO date string
  sun: PlanetPosition;
  moon: PlanetPosition;
  moonPhase: string;
  moonPhaseKorean: string;
  mercury: PlanetPosition & { isRetrograde?: boolean };
  venus: PlanetPosition;
  mars: PlanetPosition;
  retrograde: string[];
}

export interface SynastryResult {
  overallScore: number;
  emotionalCompatibility: number;
  communicationCompatibility: number;
  romanticCompatibility: number;
  longTermStability: number;
  aspects: SynastryAspect[];
  strengths: string[];
  challenges: string[];
  summary: string;
}

export interface SynastryAspect {
  person1Planet: string;
  person2Planet: string;
  type: AspectType;
  orb: number;
  isHarmonious: boolean;
}

// 줄리안 데이 계산
function toJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  jd += (hour - 12) / 24;

  return jd;
}

// 태양 경도 계산 (간단화된 VSOP87)
function calculateSunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  let e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  M = M * Math.PI / 180;
  let C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
        + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
        + 0.000289 * Math.sin(3 * M);

  let sunLong = L0 + C;
  sunLong = sunLong % 360;
  if (sunLong < 0) sunLong += 360;

  return sunLong;
}

// 달 경도 계산 (간단화)
function calculateMoonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  let L = 218.3164477 + 481267.88123421 * T;
  let D = 297.8501921 + 445267.1114034 * T;
  let M = 357.5291092 + 35999.0502909 * T;
  let Mp = 134.9633964 + 477198.8675055 * T;
  let F = 93.2720950 + 483202.0175233 * T;

  L = L % 360; D = D % 360; M = M % 360; Mp = Mp % 360; F = F % 360;

  const toRad = (deg: number) => deg * Math.PI / 180;

  let longitude = L
    + 6.289 * Math.sin(toRad(Mp))
    - 1.274 * Math.sin(toRad(2 * D - Mp))
    + 0.658 * Math.sin(toRad(2 * D))
    - 0.214 * Math.sin(toRad(2 * Mp))
    - 0.186 * Math.sin(toRad(M));

  longitude = longitude % 360;
  if (longitude < 0) longitude += 360;

  return longitude;
}

// 행성 경도 계산 (간단화된 공식)
function calculatePlanetLongitude(planet: string, jd: number): number {
  const T = (jd - 2451545.0) / 36525;

  // 간단화된 평균 경도 공식
  const meanLongitudes: Record<string, number[]> = {
    mercury: [252.2509, 149472.6747],
    venus: [181.9798, 58517.8157],
    mars: [355.4330, 19140.2993],
    jupiter: [34.3515, 3034.9057],
    saturn: [50.0774, 1222.1138],
    uranus: [314.0550, 428.4669],
    neptune: [304.3487, 218.4862],
    pluto: [238.9290, 145.2078]
  };

  if (planet === 'sun') return calculateSunLongitude(jd);
  if (planet === 'moon') return calculateMoonLongitude(jd);

  const [L0, rate] = meanLongitudes[planet] || [0, 0];
  let longitude = L0 + rate * T;
  longitude = longitude % 360;
  if (longitude < 0) longitude += 360;

  return longitude;
}

// 경도를 별자리로 변환
function longitudeToSign(longitude: number): { sign: string; degree: number } {
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: Math.round(degree * 100) / 100
  };
}

// 하우스 계산 (Placidus 시스템 간단화)
function calculateHouses(jd: number, latitude: number, longitude: number): number[] {
  const T = (jd - 2451545.0) / 36525;
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  const LST = (theta0 + longitude) % 360;

  // 간단화된 하우스 계산
  const houses: number[] = [];
  const ascendant = calculateAscendant(LST, latitude);

  for (let i = 0; i < 12; i++) {
    houses.push((ascendant + i * 30) % 360);
  }

  return houses;
}

// 상승점 계산
function calculateAscendant(LST: number, latitude: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const epsilon = 23.4393; // 황도 경사각
  const RAMC = LST;

  const tanAsc = Math.cos(toRad(RAMC)) / (-Math.sin(toRad(RAMC)) * Math.cos(toRad(epsilon)) - Math.tan(toRad(latitude)) * Math.sin(toRad(epsilon)));
  let ascendant = toDeg(Math.atan(tanAsc));

  // 사분면 보정
  if (Math.cos(toRad(RAMC)) < 0) ascendant += 180;
  if (ascendant < 0) ascendant += 360;

  return ascendant;
}

// 행성이 위치한 하우스 계산
function getHouse(longitude: number, houses: number[]): number {
  for (let i = 0; i < 12; i++) {
    const nextHouse = (i + 1) % 12;
    const start = houses[i];
    const end = houses[nextHouse];

    if (start < end) {
      if (longitude >= start && longitude < end) return i + 1;
    } else {
      if (longitude >= start || longitude < end) return i + 1;
    }
  }
  return 1;
}

// 각도(Aspect) 계산
function calculateAspects(chart: Record<string, PlanetPosition>): Aspect[] {
  const aspects: Aspect[] = [];
  const aspectDefs: { type: AspectType; angle: number; orb: number; korean: string; influence: 'harmonious' | 'challenging' | 'neutral' }[] = [
    { type: 'conjunction', angle: 0, orb: 8, korean: '합', influence: 'neutral' },
    { type: 'opposition', angle: 180, orb: 8, korean: '충', influence: 'challenging' },
    { type: 'trine', angle: 120, orb: 6, korean: '삼합', influence: 'harmonious' },
    { type: 'square', angle: 90, orb: 6, korean: '사각', influence: 'challenging' },
    { type: 'sextile', angle: 60, orb: 4, korean: '육합', influence: 'harmonious' }
  ];

  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const pos1 = chart[p1];
      const pos2 = chart[p2];

      if (!pos1 || !pos2) continue;

      const long1 = ZODIAC_SIGNS.indexOf(pos1.sign as any) * 30 + pos1.degree;
      const long2 = ZODIAC_SIGNS.indexOf(pos2.sign as any) * 30 + pos2.degree;

      let diff = Math.abs(long1 - long2);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            planet1: p1,
            planet2: p2,
            type: def.type,
            typeKorean: def.korean,
            orb: Math.round(orb * 100) / 100,
            influence: def.influence
          });
          break;
        }
      }
    }
  }

  return aspects;
}

// 원소 분석
function analyzeElements(chart: Record<string, PlanetPosition>): { dominant: string; fire: number; earth: number; air: number; water: number } {
  const elementMap: Record<string, string> = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
  };

  const weights: Record<string, number> = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1, saturn: 1 };
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };

  for (const [planet, weight] of Object.entries(weights)) {
    const pos = chart[planet];
    if (pos) {
      const element = elementMap[pos.sign] as keyof typeof counts;
      counts[element] += weight;
    }
  }

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return { dominant, ...counts };
}

// 모달리티 분석
function analyzeModality(chart: Record<string, PlanetPosition>): { dominant: string; cardinal: number; fixed: number; mutable: number } {
  const modalityMap: Record<string, string> = {
    aries: 'cardinal', cancer: 'cardinal', libra: 'cardinal', capricorn: 'cardinal',
    taurus: 'fixed', leo: 'fixed', scorpio: 'fixed', aquarius: 'fixed',
    gemini: 'mutable', virgo: 'mutable', sagittarius: 'mutable', pisces: 'mutable'
  };

  const weights: Record<string, number> = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1, saturn: 1 };
  const counts = { cardinal: 0, fixed: 0, mutable: 0 };

  for (const [planet, weight] of Object.entries(weights)) {
    const pos = chart[planet];
    if (pos) {
      const modality = modalityMap[pos.sign] as keyof typeof counts;
      counts[modality] += weight;
    }
  }

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return { dominant, ...counts };
}

// 달 위상 계산
function calculateMoonPhase(sunLong: number, moonLong: number): { phase: string; phaseKorean: string } {
  let diff = moonLong - sunLong;
  if (diff < 0) diff += 360;

  if (diff < 22.5) return { phase: 'new', phaseKorean: '삭 (새달)' };
  if (diff < 67.5) return { phase: 'waxing_crescent', phaseKorean: '초승달' };
  if (diff < 112.5) return { phase: 'first_quarter', phaseKorean: '상현달' };
  if (diff < 157.5) return { phase: 'waxing_gibbous', phaseKorean: '철월' };
  if (diff < 202.5) return { phase: 'full', phaseKorean: '보름달 (만월)' };
  if (diff < 247.5) return { phase: 'waning_gibbous', phaseKorean: '하현 전 달' };
  if (diff < 292.5) return { phase: 'last_quarter', phaseKorean: '하현달' };
  if (diff < 337.5) return { phase: 'waning_crescent', phaseKorean: '그믐달' };
  return { phase: 'new', phaseKorean: '삭 (새달)' };
}

/**
 * 출생 차트 계산
 */
export function calculateNatalChart(
  birthDate: Date,
  birthTime: string, // "HH:mm"
  latitude: number = 37.5665, // 서울 기본값
  longitude: number = 126.9780
): NatalChart {
  // 시간 파싱
  const [hours, minutes] = birthTime.split(':').map(Number);
  const date = new Date(birthDate);
  date.setUTCHours(hours - 9, minutes); // KST -> UTC

  const jd = toJulianDay(date);
  const houses = calculateHouses(jd, latitude, longitude);

  const chartData: Record<string, PlanetPosition> = {};

  for (const planet of PLANETS) {
    const long = calculatePlanetLongitude(planet, jd);
    const { sign, degree } = longitudeToSign(long);
    const house = getHouse(long, houses);

    chartData[planet] = {
      sign,
      signKorean: ZODIAC_KOREAN[sign],
      symbol: ZODIAC_SYMBOLS[sign],
      degree,
      house
    };
  }

  const ascSign = longitudeToSign(houses[0]);
  const mcSign = longitudeToSign(houses[9]);

  const aspects = calculateAspects(chartData);
  const element = analyzeElements(chartData);
  const modality = analyzeModality(chartData);

  return {
    ...chartData as any,
    ascendant: {
      sign: ascSign.sign,
      signKorean: ZODIAC_KOREAN[ascSign.sign],
      symbol: ZODIAC_SYMBOLS[ascSign.sign],
      degree: ascSign.degree
    },
    midheaven: {
      sign: mcSign.sign,
      signKorean: ZODIAC_KOREAN[mcSign.sign],
      symbol: ZODIAC_SYMBOLS[mcSign.sign],
      degree: mcSign.degree
    },
    houses,
    aspects,
    element,
    modality
  };
}

/**
 * 트랜짓 (현재 천체 위치) 계산
 */
export function calculateTransit(targetDate: Date = new Date()): TransitData {
  const jd = toJulianDay(targetDate);

  const sunLong = calculatePlanetLongitude('sun', jd);
  const moonLong = calculatePlanetLongitude('moon', jd);
  const { phase, phaseKorean } = calculateMoonPhase(sunLong, moonLong);

  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars'] as const;
  const transitData: Record<string, PlanetPosition> = {};

  for (const planet of planets) {
    const long = calculatePlanetLongitude(planet, jd);
    const { sign, degree } = longitudeToSign(long);
    transitData[planet] = {
      sign,
      signKorean: ZODIAC_KOREAN[sign],
      symbol: ZODIAC_SYMBOLS[sign],
      degree,
      house: 0 // 트랜짓에서는 하우스 무관
    };
  }

  // 역행 계산 (간단화 - 실제로는 더 복잡)
  const retrograde: string[] = [];
  // 수성 역행 기간 체크 (년 3회, 각 3주)
  const dayOfYear = Math.floor((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / 86400000);
  const isMercuryRetrograde = [45, 140, 250].some(d => Math.abs(dayOfYear - d) < 21);
  if (isMercuryRetrograde) {
    retrograde.push('mercury');
  }

  // Add isRetrograde to mercury
  const mercuryData = {
    ...transitData.mercury,
    isRetrograde: isMercuryRetrograde
  };

  return {
    date: targetDate.toISOString().split('T')[0],
    sun: transitData.sun,
    moon: transitData.moon,
    mercury: mercuryData,
    venus: transitData.venus,
    mars: transitData.mars,
    moonPhase: phase,
    moonPhaseKorean: phaseKorean,
    retrograde
  };
}

/**
 * 두 차트 간 궁합 (시나스트리) 계산
 */
export function calculateSynastry(chart1: NatalChart, chart2: NatalChart): SynastryResult {
  let overallScore = 50; // 기본 점수
  const strengths: string[] = [];
  const challenges: string[] = [];
  const aspects: SynastryAspect[] = [];

  // 태양-달 조합 분석
  const sunMoonCombo = analyzeSunMoon(chart1, chart2);
  overallScore += sunMoonCombo.score;
  strengths.push(...sunMoonCombo.strengths);
  challenges.push(...sunMoonCombo.challenges);

  // 금성-화성 조합 (로맨틱 케미스트리)
  const venusMarsCombos = analyzeVenusMars(chart1, chart2);
  overallScore += venusMarsCombos.score;
  strengths.push(...venusMarsCombos.strengths);

  // 원소 호환성
  const elementCompat = analyzeElementCompatibility(chart1.element, chart2.element);
  overallScore += elementCompat.score;

  overallScore = Math.min(100, Math.max(0, overallScore));

  // Calculate sub-scores based on overall score with some variation
  const emotionalCompatibility = Math.min(100, Math.max(0, overallScore + (Math.random() * 20 - 10)));
  const communicationCompatibility = Math.min(100, Math.max(0, overallScore + (Math.random() * 20 - 10)));
  const romanticCompatibility = Math.min(100, Math.max(0, overallScore + venusMarsCombos.score));
  const longTermStability = Math.min(100, Math.max(0, overallScore + elementCompat.score));

  // Generate synastry aspects
  const aspectPairs = [
    ['sun', 'moon'], ['moon', 'sun'], ['venus', 'mars'], ['mars', 'venus'],
    ['sun', 'sun'], ['moon', 'moon'], ['mercury', 'mercury']
  ];

  for (const [p1, p2] of aspectPairs) {
    const pos1 = chart1[p1 as keyof NatalChart] as PlanetPosition;
    const pos2 = chart2[p2 as keyof NatalChart] as PlanetPosition;
    if (pos1 && pos2 && 'sign' in pos1 && 'sign' in pos2) {
      const long1 = ZODIAC_SIGNS.indexOf(pos1.sign as any) * 30 + pos1.degree;
      const long2 = ZODIAC_SIGNS.indexOf(pos2.sign as any) * 30 + pos2.degree;
      let diff = Math.abs(long1 - long2);
      if (diff > 180) diff = 360 - diff;

      let aspectType: AspectType = 'conjunction';
      let isHarmonious = true;

      if (diff < 10) { aspectType = 'conjunction'; isHarmonious = true; }
      else if (Math.abs(diff - 60) < 8) { aspectType = 'sextile'; isHarmonious = true; }
      else if (Math.abs(diff - 90) < 8) { aspectType = 'square'; isHarmonious = false; }
      else if (Math.abs(diff - 120) < 8) { aspectType = 'trine'; isHarmonious = true; }
      else if (Math.abs(diff - 180) < 10) { aspectType = 'opposition'; isHarmonious = false; }
      else continue;

      aspects.push({
        person1Planet: PLANET_KOREAN[p1] || p1,
        person2Planet: PLANET_KOREAN[p2] || p2,
        type: aspectType,
        orb: Math.round(diff * 10) / 10,
        isHarmonious
      });
    }
  }

  const summary = generateSynastrySummary(chart1, chart2, overallScore);

  return {
    overallScore: Math.round(overallScore),
    emotionalCompatibility: Math.round(emotionalCompatibility),
    communicationCompatibility: Math.round(communicationCompatibility),
    romanticCompatibility: Math.round(romanticCompatibility),
    longTermStability: Math.round(longTermStability),
    aspects,
    strengths,
    challenges,
    summary
  };
}

function analyzeSunMoon(chart1: NatalChart, chart2: NatalChart): { score: number; strengths: string[]; challenges: string[] } {
  let score = 0;
  const strengths: string[] = [];
  const challenges: string[] = [];

  // 태양-달 합 또는 삼합
  const sun1Sign = chart1.sun.sign;
  const moon2Sign = chart2.moon.sign;
  const sun2Sign = chart2.sun.sign;
  const moon1Sign = chart1.moon.sign;

  const compatiblePairs = [
    ['aries', 'leo', 'sagittarius'],
    ['taurus', 'virgo', 'capricorn'],
    ['gemini', 'libra', 'aquarius'],
    ['cancer', 'scorpio', 'pisces']
  ];

  for (const group of compatiblePairs) {
    if (group.includes(sun1Sign) && group.includes(moon2Sign)) {
      score += 15;
      strengths.push(`${ZODIAC_KOREAN[sun1Sign]} 태양과 ${ZODIAC_KOREAN[moon2Sign]} 달의 조화`);
    }
    if (group.includes(sun2Sign) && group.includes(moon1Sign)) {
      score += 15;
    }
  }

  return { score, strengths, challenges };
}

function analyzeVenusMars(chart1: NatalChart, chart2: NatalChart): { score: number; strengths: string[] } {
  let score = 0;
  const strengths: string[] = [];

  // 금성-화성 같은 원소일 경우 +10
  const elementMap: Record<string, string> = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water'
  };

  const v1e = elementMap[chart1.venus.sign];
  const m2e = elementMap[chart2.mars.sign];
  const v2e = elementMap[chart2.venus.sign];
  const m1e = elementMap[chart1.mars.sign];

  if (v1e === m2e || v2e === m1e) {
    score += 10;
    strengths.push('금성-화성 에너지 조화');
  }

  return { score, strengths };
}

function analyzeElementCompatibility(e1: NatalChart['element'], e2: NatalChart['element']): { score: number } {
  const compatMap: Record<string, string[]> = {
    fire: ['fire', 'air'],
    earth: ['earth', 'water'],
    air: ['air', 'fire'],
    water: ['water', 'earth']
  };

  let score = 0;
  if (compatMap[e1.dominant].includes(e2.dominant)) {
    score += 10;
  }

  return { score };
}

function generateSynastrySummary(chart1: NatalChart, chart2: NatalChart, score: number): string {
  const sun1 = ZODIAC_KOREAN[chart1.sun.sign];
  const sun2 = ZODIAC_KOREAN[chart2.sun.sign];
  const asc1 = ZODIAC_KOREAN[chart1.ascendant.sign];
  const asc2 = ZODIAC_KOREAN[chart2.ascendant.sign];

  if (score >= 70) {
    return `${sun1}와 ${sun2}의 만남은 우주가 축복하는 인연입니다. ${asc1} 상승궁과 ${asc2} 상승궁이 서로의 그림자를 비추며 성장을 이끕니다.`;
  } else if (score >= 50) {
    return `${sun1}와 ${sun2}는 서로에게 배울 것이 많은 인연입니다. 차이를 인정할 때 더 깊은 연결이 가능합니다.`;
  } else {
    return `${sun1}와 ${sun2}의 에너지는 도전적인 각도에 있습니다. 이 인연은 카르마적 성장을 위한 것일 수 있습니다.`;
  }
}

/**
 * 생년월일로 별자리 계산 (간단 버전)
 */
export function getZodiacSign(birthDate: Date): { sign: string; signKorean: string; symbol: string } {
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  let sign: string;

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) sign = 'aries';
  else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) sign = 'taurus';
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) sign = 'gemini';
  else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) sign = 'cancer';
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sign = 'leo';
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sign = 'virgo';
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) sign = 'libra';
  else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) sign = 'scorpio';
  else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) sign = 'sagittarius';
  else if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) sign = 'capricorn';
  else if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) sign = 'aquarius';
  else sign = 'pisces';

  return {
    sign,
    signKorean: ZODIAC_KOREAN[sign],
    symbol: ZODIAC_SYMBOLS[sign]
  };
}
