# SK V1 Admin

SK V1과 메이드인레몬 운영자를 위한 독립 관리자 웹입니다. 일반 사용자용
`skv1_web`과 세션 및 인증 체계를 공유하지 않으며, 관리자 전용 API를 통해
운영 기능을 제공합니다.

## 주요 기능

- 운영 대시보드와 주요 업무 바로가기
- 관리자 계정 생성, 활성화, 임시 비밀번호 발급
- FAQ 등록, 수정, 삭제 및 카테고리별 노출 순서 관리
- 공지 등록, 수정, 삭제 및 HTML 미리보기
- 문의 조회, 답변 및 presigned URL 기반 이미지 첨부
- 문의 카테고리와 활성 상태 관리
- 관리자 쓰기 작업 감사 로그 조회
- 내 비밀번호 변경 및 최초 로그인 비밀번호 변경 강제

## 기술 구성

- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS 4, shadcn/ui, Radix UI
- TanStack Query, ky, React Hook Form, Zod
- Vitest, ESLint
- CVA 기반 공통 UI variant

## 시작하기

### 요구 사항

- Node.js 20 이상
- Yarn 4

### 설치 및 실행

```bash
yarn install
cp .env.example .env.local
yarn dev
```

개발 서버는 일반 웹과 포트가 겹치지 않도록
`http://localhost:3001`에서 실행됩니다. `yarn dev`는 `.env.local`에
`SESSION_SECRET`이 없거나 예제 자리표시자가 남아 있으면 관리자 페이지
전용 무작위 값을 생성합니다. 생성된 값은 터미널에 출력하지 않습니다.

## 환경 변수

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | 예 | SK V1 API의 절대 URL. 운영 환경에서는 HTTPS만 허용합니다. |
| `SESSION_SECRET` | 예 | 관리자 세션 JWE 암호화에 사용하는 32자 이상의 비밀값입니다. |
| `ADMIN_ALLOWED_ORIGINS` | 아니요 | 쓰기 요청을 허용할 Origin 목록입니다. 쉼표로 여러 값을 구분합니다. |

비밀값을 직접 만들려면 다음 명령을 사용할 수 있습니다.

```bash
openssl rand -base64 48
```

`.env.local`, 관리자 부트스트랩 계정, 실제 비밀값은 저장소에 기록하지
않습니다.

## 명령어

| 명령어 | 용도 |
| --- | --- |
| `yarn dev` | 로컬 개발 서버 실행 (`3001` 포트) |
| `yarn build` | 프로덕션 빌드 생성 |
| `yarn start` | 프로덕션 서버 실행 |
| `yarn type-check` | TypeScript 타입 검사 |
| `yarn lint` | ESLint 검사 |
| `yarn test` | Vitest 테스트 실행 |
| `yarn validate` | 타입, 린트, 테스트, 빌드 전체 검증 |

## 화면과 권한

| 경로 | 기능 | 접근 조건 |
| --- | --- | --- |
| `/login` | 관리자 로그인 | 공개 |
| `/dashboard` | 운영 현황 | 인증된 관리자 |
| `/faqs` | FAQ 관리 | 인증된 관리자 |
| `/notices` | 공지 관리 | 인증된 관리자 |
| `/inquiries` | 문의와 답변 관리 | 인증된 관리자 |
| `/inquiry-categories` | 문의 카테고리 관리 | 인증된 관리자 |
| `/settings/password` | 내 비밀번호 변경 | 인증된 관리자 |
| `/accounts` | 관리자 계정 관리 | `MADEINLEMON` 관리자 |
| `/audit-logs` | 감사 로그 조회 | `MADEINLEMON` 관리자 |

`mustChangePassword`가 설정된 계정은 비밀번호를 변경하기 전까지 다른
보호 화면에 접근할 수 없습니다.

## 구조

```text
src/
├── app/                 # 페이지, 레이아웃, Route Handler
├── components/
│   ├── auth/            # 로그인과 관리자 컨텍스트
│   ├── dashboard/       # 대시보드
│   ├── features/        # 도메인별 관리 화면
│   ├── layout/          # 관리자 공통 레이아웃
│   └── ui/              # 재사용 UI 컴포넌트
├── lib/
│   ├── api/             # API 계약, 클라이언트, 프록시 보조 모듈
│   └── auth/            # 세션, CSRF, 인증 데이터 접근 계층
├── middleware.ts        # 세션 및 역할 기반 라우트 보호
└── types/               # 관리자 도메인 타입
```

## 인증과 API 보안

- 관리자 access token은 `jose`의 JWE(A256GCM)로 암호화하여 HttpOnly
  쿠키에 저장합니다.
- 브라우저는 같은 Origin의 `/api/admin/*`만 호출하고, Next.js Route
  Handler가 관리자 API에 Bearer token을 전달합니다.
- refresh token이 없으므로 세션은 최대 8시간 후 종료됩니다.
- 401 응답 시 세션 쿠키를 정리하고 로그인 화면으로 이동합니다.
- 쓰기 요청은 Origin과 `Sec-Fetch-Site`를 검사합니다.
- 프록시는 허용된 API 경로, HTTP Method, 쿼리와 요청 본문만 전달합니다.
- 보안 헤더와 CSP를 전역 적용하며 검색 엔진 색인을 비활성화합니다.

## 검증

변경사항을 제출하기 전에 전체 검증을 실행합니다.

```bash
yarn validate
```
