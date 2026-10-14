# local-ledger (프로젝트 B)

## 개념
카드·은행 내역 파일을 서버로 보내지 않고 브라우저에서만 처리해 월별 수입·지출을 보여 주고, 애매한 결제처는 사용자 규칙으로 분류한다.

## 핵심 요구사항
- **외부 네트워크 요청 0건** (CDN·폰트·분석 포함). 파일을 어디로도 전송하지 않는다
- **카드사·은행별 파서를 만들지 않는다.** 포맷 차이는 컬럼 매핑 UI로 해결한다

## MVP
1. 파일 불러오기(CSV/xlsx, EUC-KR/UTF-8 자동 판별) + 컬럼 매핑(프로필 저장)
2. 규칙 기반 분류(가맹점 문자열 포함 일치) + 미분류 큐
3. 분류 수정 시 규칙 즉시 저장(IndexedDB) + 규칙 JSON 가져오기·내보내기
4. 월별 수입·지출·항목별 합계 + 원본 합계 일치 검증
5. 결과 CSV 내보내기

## 제외
복식부기, 계좌 연동, 로그인, AI 분류, 영수증 OCR, 부가세·종소세 계산, 다중 사용자

## 기술
Nuxt 4 (`ssr: false`) 정적 사이트, PapaParse, SheetJS(읽기, cdn.sheetjs.com tarball로 설치), TextDecoder('euc-kr'), Dexie, Tailwind v4(시스템 폰트만)

## Phase
- **Phase 1**: 업로드 + 인코딩 + 컬럼 매핑 + 거래표
- Phase 2: 규칙 엔진 + 미분류 큐 + 수정→규칙 저장
- Phase 3: 월별 요약 + 합계 검증 + 내보내기

## 데이터 규칙
- 금액은 원 단위 정수. 수입 +, 지출 −. 빈 값은 `null`(합계 제외, 개수 표시)
- IndexedDB에는 매핑 프로필만 저장한다. 거래 데이터는 저장하지 않는다
- 실제 명세서는 `private-samples/`에만 둔다 (git 무시)
- `fixtures/`는 `pnpm fixtures`(scripts/make-fixtures.ts)로 생성한 가짜 데이터만

## 명령
- `pnpm dev` / `pnpm generate`
- `pnpm test` — Vitest 단위 테스트
- `pnpm e2e` — generate 결과를 정적 서빙 후 Playwright (외부 요청 0건 검증 포함)
