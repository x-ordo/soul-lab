// Empathy Engine v7
// - Personalization hooks: name, cards, weather, dayPeriod, (optional) location
// - Lunar birth supported via korean-lunar-calendar (윤달 포함)
// - Coherence: tempo-aware scoring reduces contradictions
// - Belief guard: Western occult only (Tarot + Western Astrology). No 사주/신살/음양오행 혼합.

import KoreanLunarCalendar from "korean-lunar-calendar";
import {
  EMPATHY_PARTS,
  EmpathyPart,
  EmpathyRole,
  EmpathyTopic,
  EmpathyEmotion,
  EmpathyStyle,
  EmpathyNeed,
} from "../data/empathyParts";

export type Gender = "M" | "F" | "U";
export type CalendarType = "solar" | "lunar";

export interface BirthInfo {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour?: number; // 0-23
  minute?: number; // 0-59
  calendar?: CalendarType;
  leapMonth?: boolean; // 윤달(윤월) 여부: 음력 입력일 때만 의미 있음
}

export interface EnvContext {
  timestamp?: number; // ms
  location?: string;  // e.g., "Seoul"
  weather?: string;   // e.g., "맑음/비/흐림" or a short phrase
  dayPeriod?: "morning" | "afternoon" | "evening" | "night";
}

export interface EmpathyInput {
  name?: string;
  gender?: Gender;
  birth: BirthInfo;
  question?: string;
  cards?: string[];      // chosen tarot cards (names)
  baseReading?: string;  // your core tarot reading text (already computed)
  env?: EnvContext;
  seedKey?: string;      // force deterministic
  styleHint?: "soft" | "direct"; // UI toggle (optional)
}

export interface Persona {
  zodiac: string;
  zodiacTrait: string;
  motive: "security" | "recognition" | "freedom" | "connection" | "mastery";
  element: "fire" | "earth" | "air" | "water" | "unknown";
  modality: "cardinal" | "fixed" | "mutable" | "unknown";
  preferredStyle: EmpathyStyle;
  calendarNote?: string;
}

export interface EmpathyMeta {
  topic: EmpathyTopic;
  emotion: EmpathyEmotion;
  need: EmpathyNeed;
  intensity: 1 | 2 | 3;
  persona: Persona;
  seed: string;
  picked: Record<EmpathyRole, string>;
  belief_ok: boolean;
  belief_violations?: string[];
}

const SYSTEM_MARKERS = ["타로", "카드", "별자리", "점성", "행성", "태양궁", "운세", "리딩"];
const DISALLOWED_MARKERS = [
  "사주", "신살", "음양", "오행", "관상", "풍수", "부적", "굿", "저주", "빙의", "전생", "업보", "귀신",
];

const ZODIAC = [
  { sign: "양자리", start: [3, 21], end: [4, 19], trait: "직진·결단", motive: "freedom", element: "fire", modality: "cardinal" },
  { sign: "황소자리", start: [4, 20], end: [5, 20], trait: "지구력·실리", motive: "security", element: "earth", modality: "fixed" },
  { sign: "쌍둥이자리", start: [5, 21], end: [6, 20], trait: "정보·속도", motive: "freedom", element: "air", modality: "mutable" },
  { sign: "게자리", start: [6, 21], end: [7, 22], trait: "보호·감정", motive: "connection", element: "water", modality: "cardinal" },
  { sign: "사자자리", start: [7, 23], end: [8, 22], trait: "존재감·자존", motive: "recognition", element: "fire", modality: "fixed" },
  { sign: "처녀자리", start: [8, 23], end: [9, 22], trait: "분석·정리", motive: "mastery", element: "earth", modality: "mutable" },
  { sign: "천칭자리", start: [9, 23], end: [10, 22], trait: "균형·관계", motive: "connection", element: "air", modality: "cardinal" },
  { sign: "전갈자리", start: [10, 23], end: [11, 21], trait: "집중·진실", motive: "mastery", element: "water", modality: "fixed" },
  { sign: "사수자리", start: [11, 22], end: [12, 21], trait: "확장·의미", motive: "freedom", element: "fire", modality: "mutable" },
  { sign: "염소자리", start: [12, 22], end: [1, 19], trait: "책임·성취", motive: "mastery", element: "earth", modality: "cardinal" },
  { sign: "물병자리", start: [1, 20], end: [2, 18], trait: "독립·발상", motive: "freedom", element: "air", modality: "fixed" },
  { sign: "물고기자리", start: [2, 19], end: [3, 20], trait: "직감·공감", motive: "connection", element: "water", modality: "mutable" },
] as const;

function inRange(month: number, day: number, start: readonly [number, number], end: readonly [number, number]) {
  const md = month * 100 + day;
  const s = start[0] * 100 + start[1];
  const e = end[0] * 100 + end[1];
  if (s <= e) return md >= s && md <= e;
  return md >= s || md <= e;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeText(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

export function toSolarBirth(birth: BirthInfo): { solar: BirthInfo; converted: boolean; note?: string } {
  const calType = birth.calendar ?? "solar";
  if (calType !== "lunar") {
    return { solar: { ...birth, calendar: "solar" }, converted: false };
  }

  try {
    const cal = new KoreanLunarCalendar();
    const leap = Boolean(birth.leapMonth);
    const ok = cal.setLunarDate(birth.year, birth.month, birth.day, leap);
    if (!ok) {
      return {
        solar: { ...birth, calendar: "solar" },
        converted: false,
        note: "(음력→양력 변환 실패: 범위/입력 확인 필요)",
      };
    }
    const s = cal.getSolarCalendar();
    return {
      solar: {
        ...birth,
        year: s.year,
        month: s.month,
        day: s.day,
        calendar: "solar",
      },
      converted: true,
      note: leap ? "(윤달 음력→양력 변환됨)" : "(음력→양력 변환됨)",
    };
  } catch {
    return {
      solar: { ...birth, calendar: "solar" },
      converted: false,
      note: "(음력 변환 라이브러리 누락/오류)",
    };
  }
}

export function sunZodiac(birth: BirthInfo) {
  // Western zodiac assumes solar date.
  // If calendar is lunar, we convert to solar first (윤달 포함).
  const { solar, note } = toSolarBirth(birth);
  const month = solar.month;
  const day = solar.day;
  const hit = ZODIAC.find((z) => inRange(month, day, z.start, z.end));
  if (!hit) {
    return {
      zodiac: "universal",
      zodiacTrait: "중립",
      motive: "security" as Persona["motive"],
      element: "unknown" as Persona["element"],
      modality: "unknown" as Persona["modality"],
      calendarNote: note,
    };
  }
  return {
    zodiac: hit.sign,
    zodiacTrait: hit.trait,
    motive: hit.motive as Persona["motive"],
    element: hit.element as Persona["element"],
    modality: hit.modality as Persona["modality"],
    calendarNote: note,
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string) {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dayPeriodFromTs(ts?: number): EnvContext["dayPeriod"] | undefined {
  if (!ts) return undefined;
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function dayPeriodKo(p?: EnvContext["dayPeriod"]) {
  switch (p) {
    case "morning":
      return "아침";
    case "afternoon":
      return "오후";
    case "evening":
      return "저녁";
    case "night":
      return "밤";
    default:
      return "오늘";
  }
}

function normalizeWeather(w?: string) {
  const s = normalizeText(w ?? "");
  if (!s) return "요즘";
  if (/비|장마|소나기/.test(s)) return "비 오는 날";
  if (/눈/.test(s)) return "눈 오는 날";
  if (/맑|쾌청|청명/.test(s)) return "맑은 날";
  if (/흐|구름|안개/.test(s)) return "흐린 날";
  if (/바람/.test(s)) return "바람 부는 날";
  if (/더움|폭염|무덥/.test(s)) return "더운 날";
  if (/추움|한파|쌀쌀/.test(s)) return "추운 날";
  return s;
}

function topicNoun(topic: EmpathyTopic) {
  switch (topic) {
    case "love":
      return "연애/관계";
    case "career":
      return "커리어/일";
    case "money":
      return "돈/재정";
    case "relationship":
      return "인간관계";
    case "self":
      return "나 자신";
    case "timing":
      return "타이밍";
    default:
      return "전반";
  }
}

function emotionWord(em: EmpathyEmotion) {
  switch (em) {
    case "anxiety":
      return "불안";
    case "frustration":
      return "답답함";
    case "loneliness":
      return "외로움";
    case "anger":
      return "분노";
    case "hope":
      return "기대";
    case "confusion":
      return "혼란";
    case "fatigue":
      return "피로";
    case "pressure":
      return "압박";
    case "longing":
      return "그리움";
    default:
      return "안도";
  }
}

function inferTopic(question?: string): EmpathyTopic {
  const q = (question ?? "").toLowerCase();
  const has = (arr: string[]) => arr.some((k) => q.includes(k));
  if (has(["연애", "사랑", "호감", "썸", "헤어", "재회", "고백", "짝사랑", "남친", "여친", "결혼"])) return "love";
  if (has(["돈", "재물", "수입", "월급", "투자", "코인", "주식", "대출", "빚", "상환", "지출", "매출", "사업"])) return "money";
  if (has(["직장", "이직", "진로", "커리어", "취업", "면접", "퇴사", "승진", "프로젝트", "사업", "창업"])) return "career";
  if (has(["친구", "가족", "동료", "상사", "관계", "갈등", "오해", "신뢰", "거리", "단절"])) return "relationship";
  if (has(["나", "자존", "자신감", "불안정", "의미", "정체성", "성장", "상처", "회복"])) return "self";
  if (has(["언제", "타이밍", "시기", "기다", "늦", "빠", "오늘", "이번", "다음"])) return "timing";
  return "universal";
}

function inferEmotion(question?: string): EmpathyEmotion {
  const q = (question ?? "").toLowerCase();
  const has = (arr: string[]) => arr.some((k) => q.includes(k));
  if (has(["불안", "초조", "두렵", "걱정", "떨"])) return "anxiety";
  if (has(["답답", "막막", "지치", "힘들", "짜증", "현타"])) return "frustration";
  if (has(["외롭", "혼자", "고립", "연락 없", "텅"])) return "loneliness";
  if (has(["화나", "분노", "열받", "억울", "짜증"])) return "anger";
  if (has(["기대", "희망", "좋아질", "가능", "설레"])) return "hope";
  if (has(["헷갈", "혼란", "모르겠", "갈팡질팡", "정리가 안"])) return "confusion";
  if (has(["피곤", "번아웃", "지침", "무기력", "체력"])) return "fatigue";
  if (has(["압박", "부담", "기한", "마감", "돈때문", "성과"])) return "pressure";
  if (has(["그리워", "보고싶", "미련", "아쉽", "떠올라"])) return "longing";
  return "relief";
}

function inferNeed(question: string | undefined, topic: EmpathyTopic, emotion: EmpathyEmotion): EmpathyNeed {
  const q = (question ?? "").toLowerCase();

  if (/(선\s*지키|경계|거리두|차단|끊|정리하(자|고)|거절|연락\s*끊|손절)/.test(q)) return "boundary";
  if (/(마무리|끝내|정리\s*하고\s*싶|결론|포기|놓아|정리해\s*줘|정리해야|미련\s*정리)/.test(q)) return "closure";
  if (/(정리|기준|우선순위|명확|결정|선택|갈림길|어쩌면\s*좋|해야\s*하나|할까말까|판단)/.test(q)) return "clarity";
  if (/(어떻게|방법|전략|계획|실행|해야\s*할|루틴|오늘\s*할|지금\s*할|바로\s*할|액션|행동)/.test(q)) return "agency";

  if (emotion === "anxiety" || emotion === "pressure" || /(불안|초조|무섭|두렵|걱정|긴장|압박)/.test(q)) return "reassurance";

  if (topic === "relationship" || topic === "love") return "boundary";
  if (topic === "money" || topic === "career") return "clarity";
  return "reassurance";
}

function inferIntensity(question?: string): 1 | 2 | 3 {
  const q = (question ?? "").toLowerCase();
  let score = 1;
  if (/(너무|진짜|완전|엄청|미치겠|죽겠)/.test(q)) score++;
  if (/(당장|오늘|지금|급해|최대한 빨리|못버티)/.test(q)) score++;
  return clamp(score, 1, 3) as 1 | 2 | 3;
}

function inferStyleHint(input: EmpathyInput, topic: EmpathyTopic, emotion: EmpathyEmotion): EmpathyStyle {
  if (input.styleHint) return input.styleHint;
  const q = (input.question ?? "").toLowerCase();
  if (/(직설|팩트|돌려말|말 돌리)/.test(q)) return "direct";
  if (/(상처|예민|불안|무서|울)/.test(q)) return "soft";
  if (topic === "money" || topic === "career") return "direct";
  if (emotion === "loneliness" || emotion === "longing") return "soft";
  return "soft";
}

function personaFrom(input: EmpathyInput, topic: EmpathyTopic, emotion: EmpathyEmotion): Persona {
  const z = sunZodiac(input.birth);
  const preferredStyle = inferStyleHint(input, topic, emotion);
  return {
    zodiac: z.zodiac,
    zodiacTrait: z.zodiacTrait,
    motive: z.motive,
    element: z.element,
    modality: z.modality,
    preferredStyle,
    calendarNote: z.calendarNote,
  };
}

function render(template: string, ctx: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? `{${k}}`);
}

function emotionCluster(em: EmpathyEmotion) {
  if (em === "anxiety" || em === "pressure" || em === "confusion") return "stress";
  if (em === "frustration" || em === "anger") return "heat";
  if (em === "loneliness" || em === "longing") return "ache";
  if (em === "hope" || em === "relief") return "light";
  return "other";
}

type Tempo = "push" | "pause" | "balanced";

function inferTempo(topic: EmpathyTopic, need: EmpathyNeed, intensity: 1 | 2 | 3): Tempo {
  if (need === "reassurance" || need === "closure") return "pause";
  if (need === "agency") return intensity >= 2 ? "push" : "balanced";
  if (need === "clarity") return "balanced";
  if (need === "boundary") return intensity >= 2 ? "push" : "balanced";
  // fallback
  return topic === "money" || topic === "career" ? "push" : "pause";
}

function tempoPenalty(text: string, tempo: Tempo) {
  const t = text;
  const push = /(지금\s*바로|당장|밀어붙|승부|돌파|공격|가속|쐐기|결단|확\s*질러)/;
  const pause = /(천천|기다|보류|멈춰|정리\s*부터|숨\s*고르|안정\s*부터|거리\s*두)/;

  if (tempo === "push" && pause.test(t)) return 2;
  if (tempo === "pause" && push.test(t)) return 2;
  return 0;
}

type Availability = {
  hasName: boolean;
  hasCards: boolean;
  hasWeather: boolean;
  hasDayPeriod: boolean;
  hasLocation: boolean;
};

function ctxBoost(p: EmpathyPart, avail: Availability): number {
  let s = 0;
  const t = p.text;
  if (avail.hasName && t.includes("{name}")) s += 1;
  if (avail.hasCards && (t.includes("{card1}") || t.includes("{card2}") || t.includes("{card3}"))) s += 1;
  if (avail.hasWeather && t.includes("{weather}")) s += 1;
  if (avail.hasDayPeriod && t.includes("{dayPeriod}")) s += 1;
  if (avail.hasLocation && t.includes("{location}")) s += 1;
  return s;
}

function needBoost(p: EmpathyPart, need: EmpathyNeed): number {
  if (p.need === need) return 3;

  const t = p.text;
  const has = (re: RegExp) => re.test(t);
  switch (need) {
    case "reassurance":
      if ((p.role === "mirror" || p.role === "validate") && has(/(괜찮|당연|정상|숨|안심|버티|여기까지)/)) return 2;
      if (p.role === "closing" && has(/(괜찮|안도|지금은)/)) return 1;
      return 0;
    case "clarity":
      if ((p.role === "reframe" || p.role === "action") && has(/(정리|기준|우선순위|핵심|명확|한\s*줄|선택)/)) return 2;
      if (p.role === "mirror" && has(/(헷갈|정리가\s*안|갈팡질팡)/)) return 1;
      return 0;
    case "agency":
      if (p.role === "action" && has(/(오늘|지금|바로|한\s*가지|작게|30분|실행|루틴|시작)/)) return 2;
      if (p.role === "reframe" && has(/(실행|전략|다음\s*스텝|한\s*번에)/)) return 1;
      return 0;
    case "boundary":
      if (p.role === "boundary" && has(/(선|경계|거리|거절|차단|넘지|기준|손절)/)) return 2;
      if (p.role === "validate" && has(/(당연|지킬\s*권리|무리)/)) return 1;
      return 0;
    case "closure":
      if ((p.role === "closing" || p.role === "reframe") && has(/(마무리|정리|놓|끝|결론|수습|회수)/)) return 2;
      if (p.role === "mirror" && has(/(미련|아쉽|끌려)/)) return 1;
      return 0;
    default:
      return 0;
  }
}

function scorePart(
  p: EmpathyPart,
  want: { role: EmpathyRole; topic: EmpathyTopic; emotion: EmpathyEmotion; intensity: 1 | 2 | 3; style: EmpathyStyle; need: EmpathyNeed; tempo: Tempo },
  avail: Availability,
) {
  let s = 0;

  if (p.topic === want.topic) s += 4;
  else if (p.topic === "universal") s += 2;
  else s -= 1;

  if (p.emotion === want.emotion) s += 3;
  else if (emotionCluster(p.emotion) === emotionCluster(want.emotion)) s += 1;

  s -= Math.abs(p.intensity - want.intensity);

  if (p.style === want.style) s += 2;

  if ((p.role === "action" || p.role === "boundary") && want.intensity >= 2 && p.style === "direct") s += 1;

  s += needBoost(p, want.need);
  s += ctxBoost(p, avail);

  s -= tempoPenalty(p.text, want.tempo);

  return s;
}

function pickPart(
  rng: () => number,
  want: { role: EmpathyRole; topic: EmpathyTopic; emotion: EmpathyEmotion; intensity: 1 | 2 | 3; style: EmpathyStyle; need: EmpathyNeed; tempo: Tempo },
  usedIds: Set<string>,
  avail: Availability,
) {
  const candidates = EMPATHY_PARTS
    .filter((p) => p.role === want.role && !usedIds.has(p.id))
    .map((p) => ({ p, s: scorePart(p, want, avail) }))
    .sort((a, b) => b.s - a.s);

  const top = candidates.slice(0, 14);
  if (!top.length) {
    const any = EMPATHY_PARTS.find((p) => p.role === want.role) ?? EMPATHY_PARTS[0];
    usedIds.add(any.id);
    return any;
  }
  const idx = Math.floor(rng() * top.length);
  usedIds.add(top[idx].p.id);
  return top[idx].p;
}

function validateBeliefSystem(text: string, hasCards: boolean, hasBase: boolean) {
  const violations: string[] = [];
  const lower = text.toLowerCase();

  for (const w of DISALLOWED_MARKERS) {
    if (lower.includes(w)) violations.push(w);
  }

  // It's OK if (cards exist) OR (base reading exists) OR (system marker exists)
  const okMarker = SYSTEM_MARKERS.some((w) => lower.includes(w.toLowerCase()));
  const ok = (hasCards || hasBase || okMarker) && violations.length === 0;
  return { ok, violations };
}

function softenFatalism(s: string) {
  const rep: Array<[RegExp, string]> = [
    [/(무조건|반드시|절대)\s?/g, ""],
    [/100%\s?/g, ""],
    [/확실(히|하다)/g, "가능성이 커"],
    [/운명(이다|적)/g, "흐름상 그렇게 보이기도 해"],
  ];
  let out = s;
  for (const [r, t] of rep) out = out.replace(r, t);
  return out;
}

function needLine(need: EmpathyNeed, topic: EmpathyTopic): string {
  switch (need) {
    case "reassurance":
      return "지금은 ‘안정’이 우선이야.";
    case "clarity":
      return "지금은 ‘기준’을 한 줄로 정리하는 게 먼저야.";
    case "agency":
      return "지금은 ‘바로 할 수 있는 한 수’가 필요해.";
    case "boundary":
      return "지금은 ‘선(경계)’부터 다시 세워야 해.";
    case "closure":
      return "지금은 ‘정리/마무리’가 핵심이야.";
    default:
      return topic === "money" || topic === "career" ? "정리부터 하자." : "숨부터 고르자.";
  }
}

function microQuestion(topic: EmpathyTopic, emotion: EmpathyEmotion, need: EmpathyNeed): string {
  if (need === "boundary") {
    if (topic === "love") return "그 사람에게서 ‘절대 넘기 싫은 선’이 딱 하나 있다면 뭐야?";
    if (topic === "relationship") return "지금 관계에서 ‘허용 가능한 것/불가능한 것’을 한 줄로 나누면 뭐가 남아?";
    return "지금 상황에서 ‘선’을 하나만 세운다면 어디부터야?";
  }
  if (need === "clarity") {
    if (topic === "money") return "돈 문제에서 지금 가장 압박 큰 ‘한 항목’은 뭐야? (지출/빚/매출/상환 중 하나)";
    if (topic === "career") return "커리어에서 지금 가장 중요한 ‘지표 한 개’만 고르면 뭐야? (성과/이직/실력/평판)";
    return "지금 가장 헷갈리는 포인트를 ‘한 문장’으로 말하면 뭐야?";
  }
  if (need === "agency") {
    if (topic === "money") return "오늘 30분 안에 ‘돈 흐름’을 개선한다면 무엇부터 손댈래?";
    if (topic === "career") return "이번 주에 ‘눈에 보이는 성과’로 만들 수 있는 가장 작은 행동은 뭐야?";
    return "오늘 바로 할 수 있는 ‘가장 작은 한 수’는 뭐야?";
  }
  if (need === "closure") {
    if (topic === "love") return "끝내지 못한 감정에서, 지금 제일 놓기 힘든 건 ‘기대’야 ‘미련’이야?";
    if (topic === "relationship") return "정리한다면, 남길 것 1개와 버릴 것 1개는 뭐야?";
    return "이걸 마무리하려면 ‘회수해야 할 것’이 뭐라고 생각해?";
  }

  if (topic === "self") return "요즘 가장 힘든 순간이 ‘언제’였어? (시간대/상황으로만 말해도 돼)";
  if (topic === "timing") return "기다릴 ‘마감선’을 정한다면 언제까지가 덜 후회할까?";
  if (topic === "love") return "그 사람의 신호 중 ‘가장 확실했던 한 장면’은 뭐였어?";
  return "지금 마음이 가장 민감하게 반응하는 포인트는 뭐야?";
}

function normalizeSecondPerson(text: string, name: string): string {
  const n = (name ?? "").trim();
  if (!n || n === "너") return text;

  let s = text;
  const rep: Array<[RegExp, string]> = [
    [/너는/g, `${n}은`],
    [/넌/g, `${n}은`],
    [/(너가|네가)/g, `${n}이`],
    [/너를/g, `${n}을`],
    [/널/g, `${n}을`],
    [/너에게/g, `${n}께`],
    [/너한테/g, `${n}께`],
    [/너랑/g, `${n}이랑`],
    [/너하고/g, `${n}하고`],
    [/너와/g, `${n}과`],
    [/너도/g, `${n}도`],
    [/너만/g, `${n}만`],
  ];

  for (const [re, to] of rep) s = s.replace(re, to);
  s = s.replace(/(^|[\s\n])너(?=([\s\n]|[\.,!?…]))/g, `$1${n}`);
  return s;
}

function safeBaseReading(base?: string): { text: string; inputViolations: string[] } {
  const t = normalizeText(base ?? "");
  if (!t) return { text: "", inputViolations: [] };
  const inputViolations: string[] = [];
  let out = t;
  for (const w of DISALLOWED_MARKERS) {
    if (out.toLowerCase().includes(w)) {
      inputViolations.push(w);
      out = out.replace(new RegExp(w, "gi"), "");
    }
  }
  if (out.length > 700) out = out.slice(0, 700) + "…";
  return { text: out, inputViolations };
}

export function buildEmpathicAnswer(input: EmpathyInput): { text: string; meta: EmpathyMeta } {
  const topic = inferTopic(input.question);
  const emotion = inferEmotion(input.question);
  const intensity = inferIntensity(input.question);
  const need = inferNeed(input.question, topic, emotion);

  const persona = personaFrom(input, topic, emotion);
  const tempo = inferTempo(topic, need, intensity);

  const cards = (input.cards ?? []).filter(Boolean);
  const card1 = cards[0] ?? "첫 카드";
  const card2 = cards[1] ?? "두 번째 카드";
  const card3 = cards[2] ?? "세 번째 카드";

  const ts = input.env?.timestamp ?? Date.now();
  const dayPeriod = input.env?.dayPeriod ?? dayPeriodFromTs(ts) ?? "evening";

  const birthSolar = toSolarBirth(input.birth).solar;

  const seedKey =
    input.seedKey ??
    [
      normalizeText(input.name ?? ""),
      normalizeText(input.question ?? ""),
      `${birthSolar.year}-${birthSolar.month}-${birthSolar.day}:${birthSolar.hour ?? ""}${birthSolar.minute ?? ""}:${input.birth.calendar ?? ""}:${input.birth.leapMonth ? "L" : ""}`,
      cards.join("|"),
      new Date(ts).toISOString().slice(0, 10),
    ].join("|");

  const rng = mulberry32(hashString(seedKey));
  const used = new Set<string>();

  const avail: Availability = {
    hasName: Boolean(normalizeText(input.name ?? "")),
    hasCards: cards.length > 0,
    hasWeather: Boolean(normalizeText(input.env?.weather ?? "")),
    hasDayPeriod: true,
    hasLocation: Boolean(normalizeText(input.env?.location ?? "")),
  };

  const wantBase = { topic, emotion, intensity, style: persona.preferredStyle as EmpathyStyle, need, tempo };

  const picked = {
    mirror: pickPart(rng, { role: "mirror", ...wantBase }, used, avail),
    validate: pickPart(rng, { role: "validate", ...wantBase }, used, avail),
    reframe: pickPart(rng, { role: "reframe", ...wantBase }, used, avail),
    action: pickPart(rng, { role: "action", ...wantBase }, used, avail),
    boundary: pickPart(rng, { role: "boundary", ...wantBase }, used, avail),
    closing: pickPart(rng, { role: "closing", ...wantBase }, used, avail),
  };

  const name = input.name ? `${input.name}님` : "너";

  const ctx = {
    name,
    zodiac: persona.zodiac,
    zodiacTrait: persona.zodiacTrait,
    motive: persona.motive,
    card1,
    card2,
    card3,
    location: input.env?.location ?? "지금 있는 곳",
    weather: normalizeWeather(input.env?.weather),
    timestamp: new Date(ts).toLocaleString(),
    dayPeriod: dayPeriodKo(dayPeriod),
    topicNoun: topicNoun(topic),
    emotionWord: emotionWord(emotion),
    need,
    needLine: needLine(need, topic),
  };

  const { text: base, inputViolations } = safeBaseReading(input.baseReading);

  const header = [
    `(${ctx.zodiac} · ${ctx.zodiacTrait})`,
    persona.calendarNote ? persona.calendarNote : "",
    render("{name}, 지금은 {topicNoun}에서 {emotionWord}가 먼저 올라오는 구간이야. {needLine}", ctx),
  ]
    .filter(Boolean)
    .join(" ");

  const overlay: string[] = [];
  overlay.push(header);
  overlay.push(render(picked.mirror.text, ctx));
  overlay.push(render(picked.validate.text, ctx));
  overlay.push("");

  if (base) {
    overlay.push("카드가 말하는 핵심 흐름(요약):");
    overlay.push(`• (${card1} → ${card2} → ${card3})`);
    overlay.push("");
    overlay.push("타로 리딩 본문:");
    overlay.push(base);
    overlay.push("");
  } else {
    overlay.push("타로 카드 흐름(간단 요약):");
    overlay.push(`• (${card1} → ${card2} → ${card3})`);
    overlay.push("");
  }

  overlay.push(render(picked.reframe.text, ctx));
  overlay.push("");
  overlay.push("오늘의 한 수:");
  overlay.push("• " + render(picked.action.text, ctx));
  overlay.push("• " + render(picked.boundary.text, ctx));
  overlay.push("");
  overlay.push(render(picked.closing.text, ctx));

  overlay.push("");
  overlay.push("질문 하나만 더: " + microQuestion(topic, emotion, need));

  let text = overlay.join("\n").trim();
  text = softenFatalism(text);
  text = normalizeSecondPerson(text, name);

  const check = validateBeliefSystem(text, cards.length > 0, Boolean(base));

  // Merge violations from input and output
  const allViolations = [...inputViolations, ...check.violations];
  const beliefOk = check.ok && inputViolations.length === 0;

  // If markers are missing but we still want to anchor inside the system, we add a very small prefix.
  if (!beliefOk && allViolations.length === 0 && (cards.length > 0 || base)) {
    text = `타로 리딩 기준으로,\n${text}`;
  }

  const meta: EmpathyMeta = {
    topic,
    emotion,
    need,
    intensity,
    persona,
    seed: seedKey,
    picked: {
      mirror: picked.mirror.id,
      validate: picked.validate.id,
      reframe: picked.reframe.id,
      action: picked.action.id,
      boundary: picked.boundary.id,
      closing: picked.closing.id,
    },
    belief_ok: beliefOk,
    belief_violations: allViolations.length ? allViolations : undefined,
  };

  return { text, meta };
}
