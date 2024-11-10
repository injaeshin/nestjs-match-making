## NestJS Boilerplate

* REST API
* WEB SOCKET
* MatchMaking

### NestJS 샘플링 템플릿

**시스템 개요**

- 실시간 웹소켓과 Redis를 활용한 사용자 간 자동 매칭 시스템
- 주요 기능: 사용자 인증, 매칭, 재시도 메커니즘

**핵심 기능**

- JWT 토큰 기반 사용자 인증 및 신규 사용자 자동 등록
- 실시간 매칭 및 최대 3회 재시도 후 봇 매칭 전환
- 사용자 점수 기반 봇 매칭 시스템

**기술 스택 및 구조**

- NestJS, Redis, Socket.IO를 활용한 백엔드 구현
- 모듈화된 디렉토리 구조로 코드 관리 및 유지보수성 향상

