# 별빛 천문대 (가제)

중학교 1학년 과학 Ⅶ. 태양계 (미래엔 2022 개정, 김태일) 수업용 게임. 크롬북 터치 1280×800 기준.

**상태: 기획 단계.** 설계 스펙 v1.1이 사용자 검토를 기다리는 중이라 게임 코드와 프로젝트 뼈대는 아직 없다.

- 설계 스펙: [docs/superpowers/specs/2026-09-30-g1-solar-design.md](docs/superpowers/specs/2026-09-30-g1-solar-design.md)
- 가안: [docs/superpowers/specs/2026-09-30-g1-solar-draft.md](docs/superpowers/specs/2026-09-30-g1-solar-draft.md)
- 교과서 발췌·정리: [docs/superpowers/specs/2026-09-30-g1-solar-textbook.md](docs/superpowers/specs/2026-09-30-g1-solar-textbook.md)
- 과학1 전 단원 종합: [docs/superpowers/specs/2026-09-30-g1-overview.md](docs/superpowers/specs/2026-09-30-g1-overview.md)

## 코드 구성 (2026-10-01~)
- `solar-dex/` 게임 A「태양계 도감」 — `pnpm --filter solar-dex dev` (포트 3507), 어드민 `/admin`
- `shared/` 두 게임 공통 부품
- `earth-moon/` 게임 B「지구와 달 모형」 (계획 3에서 추가, 포트 3508)
- 문서: `docs/superpowers/` (스펙·로드맵), 작업 기록 `PROGRESS.md`

```bash
pnpm install && pnpm test && pnpm --filter solar-dex dev
```
