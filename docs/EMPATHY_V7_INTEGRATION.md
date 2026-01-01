# Empathy Overlay v7 Integration

soul-lab에 통합된 공감 레이어 시스템 문서.

## 개요

Empathy Engine v7은 타로/운세 리딩에 개인화된 공감 프리페이스를 추가하여 사용자 경험을 향상시킨다.

### 핵심 기능
- **개인화 훅**: 이름, 생년월일(음력/양력), 질문, 타로 카드
- **음력 지원**: `korean-lunar-calendar`를 통한 음력→양력 변환 (윤달 포함)
- **결정론적 출력**: `seedKey` 기반 일관된 결과
- **믿음체계 가드**: 서양 점성술/타로만 사용 (사주/신살/음양오행 혼합 방지)

---

## 적용 위치

| 컴포넌트 | 파일 | 적용 방식 |
|---------|------|----------|
| ResultPage | `src/pages/ResultPage.tsx` | oneLiner + subtitle |
| UnlockedResultView | `src/components/UnlockedResultView.tsx` | 전체 운세 텍스트 |
| TarotPage | `src/pages/TarotPage.tsx` | 3카드 스프레드 해석 |

---

## API

### `applyEmpathyOverlay()`

```typescript
import { applyEmpathyOverlay } from '../lib/report';

const result = applyEmpathyOverlay(baseText, {
  cards: ['The Star', 'Temperance', 'The World'],
  baseReading: '원본 리딩 텍스트',
});

console.log(result.text);  // 공감 강화된 텍스트
console.log(result.meta);  // 디버깅 메타데이터
```

### `buildEmpathicAnswer()` (저수준)

```typescript
import { buildEmpathicAnswer, EmpathyInput } from '../utils/empathyEngine';

const input: EmpathyInput = {
  name: '사용자',
  birth: {
    year: 1995,
    month: 3,
    day: 15,
    calendar: 'lunar',
    leapMonth: false,
  },
  question: '이직 타이밍이 맞는지 모르겠어요',
  cards: ['The Hermit', 'Two of Wands', 'Queen of Pentacles'],
  baseReading: '지금은 혼자 정리하는 시간이 필요하고...',
  env: { timestamp: Date.now() },
  seedKey: 'user123|20250102',
};

const { text, meta } = buildEmpathicAnswer(input);
```

---

## 데이터 스키마

### BirthInfo (Storage)

```typescript
interface BirthInfo {
  yyyymmdd: string;        // "19950315"
  calendar: 'solar' | 'lunar';
  leapMonth: boolean;      // 음력 윤달 여부
}
```

**저장/조회 함수:**
```typescript
import { getBirthInfo, setBirthInfo } from '../lib/storage';

// 저장
setBirthInfo({
  yyyymmdd: '19950315',
  calendar: 'lunar',
  leapMonth: false,
});

// 조회 (기존 YYYYMMDD 폴백 지원)
const info = getBirthInfo();
// → { yyyymmdd: '19950315', calendar: 'lunar', leapMonth: false }
```

### EmpathyMeta (출력)

```typescript
interface EmpathyMeta {
  topic: 'career' | 'love' | 'money' | 'health' | 'relationship' | 'universal';
  emotion: 'anxiety' | 'frustration' | 'sadness' | 'confusion' | 'hope' | 'relief';
  need: 'validation' | 'clarity' | 'agency' | 'boundary' | 'patience' | 'connection';
  intensity: 1 | 2 | 3;
  persona: {
    zodiac: string;        // "양자리"
    zodiacTrait: string;   // "직진·결단"
    motive: string;        // "freedom"
    element: string;       // "fire"
    modality: string;      // "cardinal"
    preferredStyle: string;// "direct"
    calendarNote?: string; // "(음력→양력 변환됨)"
  };
  seed: string;
  picked: Record<string, string>;  // 선택된 파츠 ID
  belief_ok: boolean;
  belief_violations?: string[];
}
```

---

## 믿음체계 가드

### 허용 키워드 (서양 체계)
- 타로, 카드, 별자리, 점성, 행성, 태양궁, 운세, 리딩

### 금지 키워드 (동양 체계)
- 사주, 신살, 음양, 오행, 관상, 풍수, 부적, 굿, 저주, 빙의, 전생, 업보, 귀신

### 위반 감지

```typescript
const { meta } = buildEmpathicAnswer(input);

if (!meta.belief_ok) {
  console.warn('믿음체계 위반:', meta.belief_violations);
  // → ['사주', '신살'] 등 감지된 키워드
}
```

---

## 모니터링

### 운영 로그 예시

```javascript
// ResultPage.tsx
const empathy = applyEmpathyOverlay(oneLiner, { baseReading: summary });

if (empathy.meta && !empathy.meta.belief_ok) {
  console.warn('[EMPATHY] belief violation', {
    userKey: getEffectiveUserKey(),
    violations: empathy.meta.belief_violations,
  });
}
```

### 대시보드 지표
- `belief_ok=false` 비율 추적
- `topic` 분포 (career/love/money 등)
- `emotion` 분포 (anxiety/hope 등)

---

## 테스트

### 유닛 테스트
```bash
pnpm test src/utils/empathyEngine.test.ts
```

### 스모크 테스트
```bash
npx tsx scripts/empathy_smoke.ts
```

**검증 항목:**
- 동일 seedKey → 동일 출력 (결정론적)
- 음력→양력 변환 정상
- 이름 치환 ("너" → 이름)
- belief_ok 플래그 정상

---

## 번들 영향

| 청크 | 크기 (brotli) |
|------|--------------|
| `report-*.js` | 22KB |
| `fortune-data-*.js` | 36KB |
| `tarot-data-*.js` | 8.6KB |

`empathyParts.ts` 데이터가 `report` 청크에 포함됨.

---

## 트러블슈팅

### React hooks 에러
> "Rendered more hooks than during the previous render"

**원인**: `useMemo`가 조건부 return 뒤에 배치됨

**해결**: 모든 hooks를 조건부 return 전에 배치
```typescript
// ✅ 올바른 순서
const empathyResult = useMemo(() => { ... }, [deps]);

if (viewMode === 'selection') return <SelectionUI />;
if (viewMode === 'daily') return <DailyUI />;
// ...
```

### 음력 변환 실패
**원인**: 유효하지 않은 음력 날짜 (예: 1월 30일이 없는 해)

**해결**: `korean-lunar-calendar`가 자동으로 가장 가까운 유효 날짜로 조정

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/utils/empathyEngine.ts` | 핵심 엔진 |
| `src/data/empathyParts.ts` | 공감 파츠 데이터 |
| `src/lib/report.ts` | `applyEmpathyOverlay()` wrapper |
| `src/lib/storage.ts` | `BirthInfo`, `userQuestion` 저장 |
| `src/components/BirthDatePicker.tsx` | 음력/윤달 UI |
| `scripts/empathy_smoke.ts` | 스모크 테스트 |
