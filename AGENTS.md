# SK V1 Admin 작업 가이드

이 문서는 `skv1_admin`의 디자인 및 프런트엔드 작업 기준입니다. 관리자가 매일 사용하는 운영 도구라는 제품 성격을 최우선으로 두며, 시각적 과시보다 빠른 판단, 정확한 상태 인지, 실수 방지, 일관된 기록 경험을 우선합니다.

## 1. 프로젝트 기본 원칙

- 설명과 문서는 한국어로 작성하고, 코드 식별자와 주석 및 커밋 메시지는 영어로 작성합니다.
- 기존 컴포넌트, 타입, API 계약을 먼저 확인하고 재사용합니다.
- 디자인 변경이 API 요청, 권한 분기, 로딩/오류/빈 상태를 훼손하지 않도록 합니다.
- 사용자가 지정한 범위를 넘는 리팩터링을 하지 않습니다.
- 작업 전 `git status --short`로 사용자 변경사항을 확인하고 보존합니다.
- 현재 사용자 변경사항인 `src/middleware.ts`는 명시적인 요청 없이는 수정하지 않습니다.

## 2. 기술 기준과 검증 명령

- Next.js 15 App Router
- React 19, TypeScript
- Tailwind CSS 4
- Yarn 4
- TanStack Query, Radix UI, CVA

검증은 변경 범위에 맞게 단계적으로 실행합니다.

```bash
yarn type-check
yarn lint
yarn test
yarn build
```

최종 통합 검증은 다음 명령을 사용합니다.

```bash
yarn validate
```

의존성을 제거하거나 추가하면 `package.json`과 `yarn.lock`을 함께 갱신합니다.

## 3. 확정된 디자인 방향

이번 디자인 정비의 확정 방향은 다음과 같습니다.

1. 뉴트럴 우선, 브랜드 Red 최소화
2. 장식 목적의 모션과 연출 전부 제거
3. 토큰, 대시보드, 로그인, 공통 컴포넌트, 이 문서를 정비 범위로 설정
4. 기능 중심의 문구와 `합니다체` 사용

관리자 화면의 핵심 질문은 항상 다음 순서로 답할 수 있어야 합니다.

1. 지금 주의가 필요한 일이 무엇인가?
2. 얼마나 많은 일이 대기 중인가?
3. 어디에서 바로 처리할 수 있는가?
4. 최근에 어떤 변경이 있었는가?

## 4. 시니어 디자인 진단

### 첫인상과 정보 위계

현재 대시보드는 검은 Hero, 대형 문구, 이미지 칩, Red 면적, 스크롤 리빌이 첫 시선을 차지합니다. 그러나 관리자의 첫 과업은 브랜드 감상이 아니라 대기 업무와 최근 변경 확인입니다. 따라서 인사말은 페이지 맥락을 알려주는 수준으로 축소하고, 지표와 즉시 처리 업무가 첫 화면의 주인공이 되어야 합니다.

### 컬러와 의미

현재 `primary` Red가 브랜드, 주요 액션, 선택 상태, 강조 문구, 포커스, 긴급 상태를 동시에 담당합니다. 같은 색이 너무 많은 의미를 가지면 중요도 구분이 사라지고 장시간 사용 피로가 커집니다.

또한 기존 `success`가 Blue라서 보편적인 상태 인지와 어긋납니다. `warning`과 기존 `secondary` Orange도 구분이 약합니다. 브랜드 색과 상태 색을 분리해야 합니다.

주의할 점은 `Badge`의 현재 `secondary` variant가 실제로는 Orange가 아니라 Zinc 계열이라는 사실입니다. 이 variant는 색상 잔재가 아니라 이름의 의미가 모호한 것이 문제이므로 `neutral` 또는 `muted`로 이름을 바꿉니다.

### 모션과 장식

GSAP ScrollTrigger, 단어별 reveal, marquee, noise, blur blob, hover translate/scale는 운영 판단을 돕지 않습니다. 정보 위치를 불안정하게 만들고 시선을 분산시키므로 제거합니다.

여기서 “모션 제거”는 장식 및 자동 재생 모션을 금지한다는 뜻입니다. 로딩, 열림/닫힘, 선택 변경처럼 상태를 이해하는 데 필요한 피드백은 접근성을 지키는 최소 수준으로만 사용하며, `prefers-reduced-motion`에서 즉시 전환되어야 합니다. 새 화면에 장식 애니메이션을 추가하지 않습니다.

### 문구

`LIVE OPERATIONS`, 슬로건, marquee와 같은 무드 카피는 운영 효율을 높이지 않습니다. 제목은 화면의 대상, 설명은 가능한 행동과 영향, 버튼은 실행 결과를 직접 말해야 합니다. 로그인과 운영 화면 모두 `합니다체`로 통일합니다.

### 컴포넌트 구조

`src/components/ui/card.tsx`에는 이미 `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`가 있습니다. 별도의 `SectionCard`를 만들면 동일한 추상화가 중복되므로 만들지 않습니다.

반복 제거의 대상은 마크업 자체보다 의미와 규칙입니다.

- 지표 표현은 `StatCard`로 통일합니다.
- 섹션 카드는 기존 `Card` compound components를 조합합니다.
- 제목, 설명, 액션이 함께 있는 헤더가 반복될 경우에만 `SectionCardHeader`를 추가합니다.
- 상태의 시각 표현은 `Badge` semantic variants가 담당합니다.
- 업무 상태의 label mapping은 서로 다른 도메인을 하나의 거대한 전역 map에 섞지 않습니다. 동일 상태가 여러 화면에서 반복될 때 `InquiryStatusBadge`처럼 도메인 단위 adapter를 만듭니다.

## 5. 컬러 시스템

### 핵심 토큰

`src/app/globals.css`를 단일 소스로 사용합니다.

| Token | Value | 용도 |
| --- | --- | --- |
| `primary` | `#b80f0a` | 핵심 CTA, 얇은 선택 indicator, 제한적인 브랜드 강조 |
| `success` | `#16a34a` | 완료, 정상, 이용 가능 |
| `warning` | `#d97706` | 확인 필요, 대기, 변경 필요 |
| `info` | `#2563eb` | 안내, 중립적인 정보, 포커스 |
| `destructive` | `#dc2626` | 삭제, 실패, 이용 중지 등 위험 상태와 파괴적 액션 |

`secondary` Orange 토큰은 제거합니다. 대체 액션은 `outline` 또는 `ghost`, 중립 표시는 Zinc 계열을 사용합니다.

각 semantic color에는 최소한 다음 역할을 둡니다.

- base: 아이콘, 강조 숫자, 강한 상태 표시
- soft: 배지 및 약한 상태 배경
- foreground: soft 배경 위 텍스트
- border: soft 상태 영역의 경계

예: `success`, `success-soft`, `success-foreground`, `success-border`. Tailwind의 raw `green-*`, `blue-*`, `amber-*`, `red-*`를 기능 컴포넌트마다 반복하지 않습니다.

### Red 사용 규칙

- Red를 큰 카드나 넓은 배경 면으로 사용하지 않습니다.
- 대기 상태는 뉴트럴 카드 위 warning 또는 작은 Red 강조 숫자로 표현합니다.
- 활성 내비게이션은 `primary`의 옅은 배경, `text-primary`, 좌측 indicator를 함께 사용합니다.
- 브랜드 `primary`를 오류 의미로 사용하지 않습니다. 오류와 위험은 `destructive`를 사용합니다.
- 한 화면에 Red CTA와 destructive action이 함께 있으면 label, 위치, 확인 dialog로 의미를 명확히 분리합니다.
- eyebrow, 장식 아이콘, 설명 문구에 습관적으로 Red를 사용하지 않습니다.

### 포커스와 대비

- 포커스 링은 오류처럼 보이는 Red 대신 `info` 또는 충분한 대비의 뉴트럴 색을 사용합니다.
- 키보드 포커스는 제거하지 않습니다.
- 일반 텍스트는 WCAG AA 4.5:1, 큰 텍스트는 3:1, UI 경계와 포커스 표시는 3:1 이상을 목표로 합니다.
- 상태는 색만으로 전달하지 않고 label, icon, indicator 중 하나를 함께 제공합니다.
- 최종 색상은 브라우저에서 실제 배경과 조합해 대비를 검증합니다.

## 6. 타이포그래피와 레이아웃

- 페이지 제목은 `PageHeader`의 기존 크기와 간격을 기준으로 합니다.
- 관리자 화면에서 초대형 display type을 사용하지 않습니다.
- 제목, 설명, 수치, 보조 정보의 네 단계만 명확히 구분합니다.
- body text는 최소 14px, 보조 metadata는 최소 12px을 원칙으로 합니다.
- 수치와 상태는 빠르게 스캔할 수 있도록 label보다 시각적 우선순위를 높입니다.
- 카드 간격과 내부 padding은 기존 4px 기반 spacing scale을 사용합니다.
- 주요 콘텐츠 폭은 `AdminShell`의 `max-w-[1600px]` 안에서 유지합니다.
- 모바일에서 action과 filter가 겹치지 않도록 column에서 row로 전환되는 기존 패턴을 재사용합니다.

현재 Latin 문자는 `Outfit`, 한글은 `Pretendard`로 보일 수 있습니다. 숫자와 영문이 많은 운영 화면에서 혼합 인상이 문제 되는지 시각 QA 후 결정하며, 이번 범위에서 근거 없이 font family를 교체하지 않습니다.

## 7. 모션 및 시각 효과 정책

다음 표현은 금지합니다.

- GSAP 및 ScrollTrigger
- scroll reveal, parallax, scale reveal
- marquee와 자동 반복 animation
- 단어별 stagger animation
- noise overlay, 장식 grid, blur blob
- hover 시 카드 이동, 이미지 확대, 화살표 이동
- 의미 없는 gradient와 과도한 shadow

허용되는 피드백은 다음 조건을 모두 만족해야 합니다.

- 상태 변화를 이해하는 데 직접 도움이 됩니다.
- 짧고 눈에 띄지 않습니다.
- 레이아웃을 이동시키지 않습니다.
- `prefers-reduced-motion`에서 제거됩니다.

GSAP는 현재 대시보드에서만 사용하므로 대시보드 모션 제거 후 `gsap`, `@gsap/react`를 `package.json`과 lockfile에서 제거합니다.

## 8. 공통 컴포넌트 기준

### `StatCard`

권장 위치: `src/components/ui/stat-card.tsx`

역할:

- label, value, description, icon을 같은 순서로 표시합니다.
- `tone`은 `neutral | warning | info | success`처럼 의미 기반으로 제한합니다.
- `tone`이 카드 전체를 강한 색으로 채우지 않도록 합니다.
- 긴급 지표도 뉴트럴 surface를 유지하고 숫자, icon, border 중 최대 두 곳만 강조합니다.
- 로딩 상태에서는 실제 카드와 같은 높이의 skeleton을 제공합니다.

### 섹션 카드

- 별도 `SectionCard`를 만들지 않고 기존 `Card` compound components를 사용합니다.
- `CardHeader`에는 `CardTitle`, `CardDescription`, 선택적인 action을 조합합니다.
- 동일한 반응형 header 조합이 두 곳 이상 반복되고 기존 조합으로 읽기 어려울 때만 `SectionCardHeader`를 추가합니다.
- filter toolbar는 section heading과 역할이 다르므로 같은 component로 억지로 합치지 않습니다.

### `Badge`와 상태 배지

- `Badge` variant는 `neutral`, `success`, `warning`, `info`, `destructive`, `outline`처럼 의미가 드러나야 합니다.
- default variant는 Red가 아닌 `neutral`로 둡니다. 브랜드 강조가 꼭 필요하면 `brand`를 명시적으로 선택합니다.
- 기존 `secondary` 사용처는 의미에 따라 `neutral`, `info`, `success`, `warning` 중 하나로 옮깁니다.
- 문의 상태처럼 같은 mapping이 목록과 상세에서 반복되면 도메인 전용 badge adapter로 추출합니다.
- 조직, 문의, 계정, 감사 로그처럼 서로 다른 업무 상태를 문자열 하나로 추론하는 범용 `StatusBadge`는 만들지 않습니다.

### `Button`

- `secondary` Orange variant를 제거합니다.
- 주요 저장 또는 생성 액션만 `default`를 사용합니다.
- 취소, 닫기, 보조 이동은 `outline` 또는 `ghost`를 사용합니다.
- 삭제와 이용 중지 등 복구가 어렵거나 영향이 큰 액션은 `destructive`를 사용합니다.
- `hover:bg-[#a30d09]` 같은 raw hex를 쓰지 않고 token 기반 상태 색을 사용합니다.
- icon-only button에는 항상 접근 가능한 label을 제공합니다.

## 9. 화면별 리디자인 지침

### 대시보드

대상: `src/components/dashboard/dashboard-overview.tsx`

정보 순서:

1. 간결한 인사와 화면 설명
2. 운영 지표 `StatCard` grid
3. 바로 처리할 작업
4. 최근 활동
5. 필요한 경우에만 운영 안내 footer

제거 대상:

- `LIVE OPERATIONS`
- 검은 glossy hero panel
- hero image chip
- blur blob과 noise overlay
- GSAP 관련 import, ref, data attribute, effect
- 단어별 슬로건 section
- marquee ticker
- 카드 hover 이동 및 과한 shadow

유지 대상:

- 현재 API query와 `MADEINLEMON` 권한 분기
- partial error 안내와 개별 refetch
- 로딩, 빈 활동, pagination-like activity controls
- `formatDateTime` 등 기존 formatter

`답변 대기 문의`는 전체 Red 카드가 아니라 뉴트럴 카드에 warning/Red 숫자 강조를 사용합니다. 최근 활동의 좌우 탐색은 데이터가 한 건 이하일 때 disable 처리하고 현재 위치를 읽을 수 있게 유지합니다.

### 사이드바

대상: `src/components/layout/admin-shell.tsx`

- 활성 메뉴의 full Red 배경과 강한 shadow를 제거합니다.
- 옅은 brand tint, `text-primary`, 좌측 indicator로 현재 위치를 표시합니다.
- 활성 link에 `aria-current="page"`를 추가합니다.
- hover와 active가 색뿐 아니라 배경, indicator로 구분되도록 합니다.
- desktop과 mobile drawer가 같은 `Navigation`을 계속 공유해야 합니다.

### 로그인

대상: `src/app/(auth)/login/page.tsx`

- noise, 장식 grid, 다중 radial gradient를 제거합니다.
- 좌측은 정적 이미지와 단색 overlay만 사용합니다.
- 이미지가 장식 목적이면 빈 `alt`를 사용합니다.
- 초대형 clamp heading을 절제된 heading scale로 낮춥니다.
- form이 항상 가장 높은 대비와 첫 번째 상호작용 우선순위를 갖게 합니다.
- 모바일에서는 로고, 제목, form, 보안 안내 순서가 명확해야 합니다.
- `관리자만 이용할 수 있어요`는 `관리자 전용 페이지입니다.`로 바꿉니다.
- 로그인 제목은 `관리자 로그인`처럼 기능을 직접 표현하고 무드성 명령문을 피합니다.

## 10. 문구 가이드

- 기본 종결은 `합니다`, `됩니다`, `해주세요`로 통일합니다.
- 제목은 명사형 또는 화면 기능을 직접 표현합니다.
- 설명은 사용자가 할 수 있는 일과 변경의 영향을 한 문장으로 설명합니다.
- 버튼은 `저장`, `계정 생성`, `답변 등록`, `이용 중지`처럼 결과가 분명한 동사를 사용합니다.
- 오류 메시지는 문제와 다음 행동을 함께 안내합니다.
- 삭제, 초기화, 이용 중지 문구에는 영향 범위와 복구 가능 여부를 적습니다.
- 감성 슬로건, 영어 eyebrow, 속도나 안전을 근거 없이 약속하는 문구를 사용하지 않습니다.
- FAQ, 공지, 문의, 계정, 감사 로그의 기존 기능적 `PageHeader` 설명은 특별한 문제가 없으면 유지합니다.

## 11. 접근성 기준

- 모든 상호작용 요소는 native `button` 또는 `a`를 우선합니다.
- 클릭 가능한 `Card`에 `role="button"`을 덧붙이는 방식은 피하고 내부 또는 root를 실제 `button`으로 구성합니다.
- keyboard focus order와 Enter/Space 동작을 확인합니다.
- icon-only action에는 `aria-label` 또는 screen-reader text를 제공합니다.
- 현재 위치는 `aria-current`, 선택 상태는 `aria-pressed` 또는 적절한 tab semantics로 전달합니다.
- loading container에는 필요한 경우 `aria-busy`를 사용하고, 오류 및 toast 문구는 행동 가능하게 작성합니다.
- 장식 이미지는 `alt=""`, 정보 이미지는 목적을 설명하는 한국어 대체 텍스트를 사용합니다.
- 200% 확대 및 모바일 폭에서 text clipping과 horizontal scroll이 없어야 합니다.

## 12. 구현 순서

1. `rg`로 token, `secondary`, raw semantic color, motion class, GSAP 사용처를 전수 확인합니다.
2. `globals.css` semantic token과 focus ring을 재정의합니다.
3. `Badge`, `Button`, 기존 `Card` primitives를 정리하고 필요한 최소 컴포넌트만 추가합니다.
4. 호출부를 새 variant와 token으로 이동해 타입 오류를 먼저 제거합니다.
5. 대시보드 정보 구조를 재배치하고 장식 모션을 제거합니다.
6. 사이드바 active state와 접근성을 정리합니다.
7. 로그인 화면과 문구를 단순화합니다.
8. GSAP 의존성과 사용하지 않는 CSS utility를 제거합니다.
9. desktop, tablet, mobile에서 loading/error/empty/data 상태를 확인합니다.
10. `yarn type-check`, `yarn lint`, `yarn test`, `yarn build`를 실행합니다.

각 단계는 호출부가 모두 이관된 뒤 기존 token, variant, utility를 삭제합니다. 삭제 전후에는 반드시 `rg`로 잔여 참조가 없는지 확인합니다.

## 13. 완료 조건

- 넓은 Red surface와 장식성 Red 사용이 없습니다.
- success, warning, info, destructive가 관례에 맞게 구분됩니다.
- focus가 명확하고 오류 상태로 오인되지 않습니다.
- 대시보드 첫 화면에서 대기 업무와 주요 수치를 즉시 확인할 수 있습니다.
- 로그인 form이 배경 이미지나 문구보다 우선합니다.
- GSAP, marquee, noise, blur decoration이 제거됩니다.
- `secondary` Orange token과 모호한 badge variant가 남아 있지 않습니다.
- 같은 card header나 status mapping을 화면마다 복제하지 않습니다.
- loading, error, empty, success 상태가 모두 유지됩니다.
- 권한과 API query 동작에 회귀가 없습니다.
- TypeScript, lint, test, production build가 통과합니다.
