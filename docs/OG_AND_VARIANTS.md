# OG 이미지 & A/B 카피(비용 0 세팅)

## 1) OG 이미지
공유 미리보기(썸네일)는 **웹에서 접근 가능한 URL**이 필요합니다.
서버를 안 쓰려면 **GitHub에 이미지 올리고 Raw URL**을 사용하세요.

- `public/og/daily.png`
- `public/og/chemistry.png`

### 추천: GitHub Raw로 호스팅(무료)
1. 이 레포에 `public/og/` 폴더 그대로 커밋
2. Raw URL 확인
3. `.env`에 설정

```
VITE_OG_BASE_URL=https://raw.githubusercontent.com/<ORG>/<REPO>/main/public/og
```

그러면 코드가 자동으로:
- daily: `${VITE_OG_BASE_URL}/daily.png`
- chemistry: `${VITE_OG_BASE_URL}/chemistry.png`

## 2) A/B 카피
유저는 Variant A/B로 자동 분배됩니다(결정적).
- URL로 강제할 수도 있음: `?v=A` 또는 `?v=B`
- 엔트리 타입도 기록: `?type=chemistry`

파일:
- `src/lib/variant.ts`
- `src/lib/copyVariants.ts`
