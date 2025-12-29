<div align="center">

![Constellation Banner](https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&h=200&fit=crop)

# 🔮 운명 템플릿 조합 시스템

### ✨ *"2경 개의 고유한 운명이 당신을 기다립니다"* ✨

━━━━━━━━━━✦✦✦━━━━━━━━━━

</div>

## 🌙 개요

우주의 에너지를 담은 **1,260개의 템플릿 파트**를 조합하여
**20,000,000,000,000,000개 (2경)**의 고유한 운세를 생성합니다.

> 🌟 서양 점성술 + 동양 사주 + 타로의 신비로운 융합

---

## ♈ 템플릿 카테고리

| 카테고리 | 개수 | 아이콘 | 설명 |
|:--------:|:----:|:------:|:-----|
| 한줄 운세 | 200 | 💫 | 오늘의 핵심 메시지 |
| 상세 요약 | 200 | 📜 | 운명의 서술 |
| 행운의 시간 | 100 | ⏰ | 행성 시간 기반 |
| 귀인 | 100 | 👤 | 별자리별 조력자 |
| 주의할 기운 | 100 | ⚠️ | 타로 경고 카드 |
| 재물운 | 100 | 💰 | 목성/금성 에너지 |
| 연애운 | 100 | 💕 | 금성 궁합 |
| 건강운 | 100 | 🌿 | 4원소 균형 |
| 별자리 일일 | 360 | ♈♉♊♋♌♍♎♏♐♑♒♓ | 12별자리 × 30일 |

---

## 🔮 조합 공식

```
총 조합 수 = 200 × 200 × 100 × 100 × 100 × 100 × 100 × 100
         = 20,000,000,000,000,000
         = 2경 (京)
```

> 💫 매일, 매 사용자에게 고유한 운세가 펼쳐집니다

---

## ✨ 생성 프롬프트

<details>
<summary><b>🌟 1. 한줄 운세 (oneLiner) - 200개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

다음 조건으로 "한줄 운세" 200개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: OL001 ~ OL200
- text: 한줄 운세 (30-50자)
- theme: 테마 (connection, opportunity, caution, growth, timing, fortune, love, career)
- zodiac: 관련 별자리 (aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces, universal)
- element: 4원소 (fire, earth, air, water, universal)
- intensity: 강도 (mild, moderate, strong)

**톤**: 신비롭고 확정적. "~할 수 있다"가 아닌 "~이다"로 단정.
**내용**: 서양 점성술 + 동양 사주 융합. 구체적 시간/상황 언급.

**예시**:
- id: OL001
  text: "오늘 해가 정점에 달할 때, 당신의 운명도 빛난다"
  theme: timing
  zodiac: leo
  element: fire
  intensity: strong

200개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>📜 2. 상세 요약 (summary) - 200개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

다음 조건으로 "상세 요약" 200개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: SM001 ~ SM200
- text: 2-3문장 요약 (80-150자)
- theme: 테마
- zodiac: 별자리
- element: 4원소
- tarotMajor: 관련 메이저 아르카나 (0-21, optional)

**톤**: 서술적이고 운명적. 과거-현재-미래 연결.
**내용**: 별자리 에너지 + 타로 상징 융합.

**예시**:
- id: SM001
  text: "물병자리의 혁신적 에너지가 당신을 감싸고 있습니다. 오래된 습관을 버리고 새로운 길로 나아갈 때입니다. 우주가 당신의 용기를 지켜보고 있습니다."
  theme: growth
  zodiac: aquarius
  element: air
  tarotMajor: 17

200개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>⏰ 3. 행운의 시간 (luckyTime) - 100개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

"행운의 시간" 100개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: LT001 ~ LT100
- timeWindow: 시간대 (예: "14:00~16:00")
- name: 신비로운 이름 (예: "황금빛 각성의 시간")
- description: 해당 시간의 의미 (30-50자)
- planetaryHour: 행성 시간 (sun, moon, mars, mercury, jupiter, venus, saturn)
- element: 4원소

**톤**: 시적이고 신비로움. 서양 행성 시간 개념 융합.

**예시**:
- id: LT001
  timeWindow: "06:00~08:00"
  name: "새벽의 수성 각성"
  description: "머큐리의 에너지가 사고를 명료하게 한다"
  planetaryHour: mercury
  element: air

100개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>👤 4. 귀인 (helper) - 100개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

"오늘의 귀인" 100개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: HP001 ~ HP100
- description: 귀인 설명 (40-70자)
- archetype: 원형 (mentor, friend, stranger, family, lover, authority, youth, elder)
- zodiacSign: 귀인의 별자리 경향
- recognitionSign: 인식 방법 (30-40자)

**톤**: 구체적이면서도 신비로운. 별자리 특성 활용.

**예시**:
- id: HP001
  description: "차분한 목소리와 깊은 눈빛을 가진 사람이 길을 비춘다"
  archetype: mentor
  zodiacSign: virgo
  recognitionSign: "커피 향기와 함께 나타난다"

100개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>⚠️ 5. 주의할 기운 (caution) - 100개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

"주의할 기운" 100개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: CT001 ~ CT100
- text: 주의사항 (50-80자)
- theme: 테마 (communication, timing, decision, relationship, health, finance, emotion)
- tarotWarning: 경고 타로 카드 (tower, devil, moon, swords 등)
- avoidTime: 피해야 할 시간대 (optional)
- remedy: 해소 방법 (20-30자)

**톤**: 경고하되 두렵지 않게. 해결책 제시.

**예시**:
- id: CT001
  text: "날카로운 말이 관계를 흔들 수 있다. 오후 3시 이전 중요한 대화는 피하라."
  theme: communication
  tarotWarning: swords
  avoidTime: "13:00~15:00"
  remedy: "심호흡 세 번 후 말하라"

100개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>💰 6. 재물운 상세 (moneyDetail) - 100개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

"재물운 상세" 100개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: MD001 ~ MD100
- text: 재물 운세 (80-120자)
- trend: 흐름 (ascending, stable, fluctuating, cautious)
- luckyNumber: 행운의 숫자 (1-9)
- planetaryInfluence: 관련 행성 (jupiter, venus, saturn)
- actionAdvice: 행동 조언 (30-50자)

**톤**: 구체적 행동 지침. 희망적이되 현실적.

**예시**:
- id: MD001
  text: "목성의 축복이 재물 영역에 빛난다. 새로운 투자보다는 기존 자산을 정리하는 것이 현명하다. 숫자 7이 등장하는 곳에 기회가 있다."
  trend: stable
  luckyNumber: 7
  planetaryInfluence: jupiter
  actionAdvice: "오후에 금전 관련 결정을 내려라"

100개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>💕 7. 연애운 상세 (loveDetail) - 100개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

"연애운 상세" 100개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: LD001 ~ LD100
- text: 연애 운세 (80-120자)
- status: 상태별 (single, dating, committed, complicated)
- venusSign: 금성 에너지 별자리
- compatibleSigns: 호환 별자리 배열
- romanticAdvice: 로맨틱 조언 (30-50자)

**톤**: 감성적이고 신비로운. 별자리 궁합 활용.

**예시**:
- id: LD001
  text: "금성이 전갈자리를 지나며 깊은 감정의 물결이 일어난다. 솔직한 대화가 숨겨진 감정을 드러낸다. 물의 기운을 가진 이와의 만남이 특별하다."
  status: dating
  venusSign: scorpio
  compatibleSigns: [cancer, pisces, scorpio]
  romanticAdvice: "밤 9시 이후 진심을 전하라"

100개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>🌿 8. 건강운 상세 (conditionDetail) - 100개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

"건강/컨디션 상세" 100개를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: CD001 ~ CD100
- text: 건강 운세 (80-120자)
- focusArea: 주의 영역 (mind, body, spirit, energy)
- elementBalance: 4원소 균형 상태 (excess_fire, lack_water 등)
- moonPhase: 관련 달 위상 (new, waxing, full, waning)
- wellnessTip: 웰니스 조언 (30-50자)

**톤**: 돌봄과 지혜. 구체적 실천 방법.

**예시**:
- id: CD001
  text: "화 기운이 과잉되어 머리와 어깨에 긴장이 쌓인다. 물의 에너지로 균형을 맞춰라. 파란색 물건을 가까이 두면 진정 효과가 있다."
  focusArea: body
  elementBalance: excess_fire
  moonPhase: full
  wellnessTip: "냉수 한 잔과 5분 명상"

100개를 YAML 형식으로 생성하세요.
```

</details>

<details>
<summary><b>♈ 9. 별자리별 일일 메시지 (zodiacDaily) - 360개</b></summary>

### 프롬프트

```
당신은 한국의 신비로운 운세 작가입니다.

12 별자리 각각에 대해 30개씩, 총 360개의 "별자리별 일일 메시지"를 생성하세요:

**형식**: YAML 배열
**구조**:
- id: ZD_aries_001 ~ ZD_pisces_030
- zodiac: 별자리
- text: 일일 메시지 (60-100자)
- rulingPlanet: 지배 행성 상태 (strong, neutral, weak)
- luckyColor: 행운의 색
- luckyDirection: 행운의 방향 (east, west, south, north)
- affirmation: 오늘의 확언 (20-30자)

**톤**: 별자리 특성 반영. 확정적 어조.

**12 별자리 순서**:
| 기호 | 영문 | 한글 | 기간 |
|:----:|:----:|:----:|:-----|
| ♈ | aries | 양자리 | 3/21~4/19 |
| ♉ | taurus | 황소자리 | 4/20~5/20 |
| ♊ | gemini | 쌍둥이자리 | 5/21~6/20 |
| ♋ | cancer | 게자리 | 6/21~7/22 |
| ♌ | leo | 사자자리 | 7/23~8/22 |
| ♍ | virgo | 처녀자리 | 8/23~9/22 |
| ♎ | libra | 천칭자리 | 9/23~10/22 |
| ♏ | scorpio | 전갈자리 | 10/23~11/21 |
| ♐ | sagittarius | 궁수자리 | 11/22~12/21 |
| ♑ | capricorn | 염소자리 | 12/22~1/19 |
| ♒ | aquarius | 물병자리 | 1/20~2/18 |
| ♓ | pisces | 물고기자리 | 2/19~3/20 |

각 별자리당 30개씩 생성하세요.
```

</details>

---

## 🌙 파일 구조

```
src/data/templates/
├── oneLiners.yaml       # 💫 200개
├── summaries.yaml       # 📜 200개
├── luckyTimes.yaml      # ⏰ 100개
├── helpers.yaml         # 👤 100개
├── cautions.yaml        # ⚠️ 100개
├── moneyDetails.yaml    # 💰 100개
├── loveDetails.yaml     # 💕 100개
├── conditionDetails.yaml # 🌿 100개
├── zodiacDaily.yaml     # ♈ 360개
└── index.ts             # 🔮 조합 로직
```

---

## 🃏 타로 참조 (메이저 아르카나)

| 번호 | 카드 | 키워드 |
|:----:|:-----|:-------|
| 0 | The Fool 바보 | 새로운 시작, 순수, 모험 |
| 1 | The Magician 마법사 | 능력, 의지력, 창조 |
| 2 | The High Priestess 여사제 | 직관, 비밀, 내면의 지혜 |
| 3 | The Empress 여제 | 풍요, 모성, 자연 |
| 4 | The Emperor 황제 | 권위, 구조, 아버지 |
| 5 | The Hierophant 교황 | 전통, 가르침, 신앙 |
| 6 | The Lovers 연인 | 사랑, 선택, 조화 |
| 7 | The Chariot 전차 | 의지, 승리, 결단력 |
| 8 | Strength 힘 | 용기, 인내, 내면의 힘 |
| 9 | The Hermit 은둔자 | 성찰, 고독, 지혜 |
| 10 | Wheel of Fortune 운명의 수레바퀴 | 변화, 운명, 순환 |
| 11 | Justice 정의 | 균형, 공정, 인과 |
| 12 | The Hanged Man 매달린 사람 | 희생, 새로운 시각, 기다림 |
| 13 | Death 죽음 | 변환, 끝과 시작, 재탄생 |
| 14 | Temperance 절제 | 균형, 인내, 조화 |
| 15 | The Devil 악마 | 속박, 유혹, 그림자 |
| 16 | The Tower 탑 | 급변, 해방, 깨달음 |
| 17 | The Star 별 | 희망, 영감, 평온 |
| 18 | The Moon 달 | 환상, 직관, 두려움 |
| 19 | The Sun 태양 | 성공, 기쁨, 활력 |
| 20 | Judgement 심판 | 부활, 소명, 결산 |
| 21 | The World 세계 | 완성, 통합, 성취 |

---

<div align="center">

## ⭐ 체크리스트

- [ ] 💫 한줄 운세 200개 생성
- [ ] 📜 상세 요약 200개 생성
- [ ] ⏰ 행운의 시간 100개 생성
- [ ] 👤 귀인 100개 생성
- [ ] ⚠️ 주의할 기운 100개 생성
- [ ] 💰 재물운 100개 생성
- [ ] 💕 연애운 100개 생성
- [ ] 🌿 건강운 100개 생성
- [ ] ♈ 별자리 일일 360개 생성
- [ ] 📁 YAML 파일 저장
- [ ] 🔮 조합 로직 구현

━━━━━━━━━━✦✦✦━━━━━━━━━━

### 🌌 오픈소스 리소스

| 타입 | 출처 | 용도 |
|:----:|:-----|:-----|
| 📷 사진 | [Unsplash](https://unsplash.com/s/photos/constellation) | 별자리/우주 배경 |
| 🎨 아이콘 | [Flaticon](https://www.flaticon.com/search?word=zodiac) | 12 별자리 아이콘 |
| 🖼️ SVG | [SVGRepo](https://www.svgrepo.com/vectors/astrology/) | 점성술 심볼 |

━━━━━━━━━━✦✦✦━━━━━━━━━━

*🔮 별들이 당신의 운명을 속삭입니다 🔮*

</div>
