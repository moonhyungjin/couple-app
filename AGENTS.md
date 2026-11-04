

<!-- BEGIN PROJECT-DESK WRAP-UP -->
## Project Desk 작업 정리 (마무리 기준)

매 수정마다 기록하지 않는다. 사용자의 작업을 마무리하기 직전, 대기 중인 정리 요청이 있는지 한 번 확인한다. 사용자가 "기록해줘"처럼 기록을 직접 요청하면 기준과 관계없이 그 시점에 바로 확인하고 제출한다. 기존 프로젝트 규칙과 역할·검증·배포 제한은 그대로 따른다.

확인 명령:
```text
node "D:/Project/project-manager/scripts/project-review.mjs" status --project couple-app
```

pending이 null이면 추가 기록 없이 종료한다. 요청이 있으면 수행한 작업을 UTF-8 JSON 임시 파일에 정리한다. 필수 문자열 필드: actor(Claude/Codex 등 담당), summary(완료한 변경), validation(실제로 실행한 검증 명령과 결과; 미실행은 미실행), remaining(남은 일·문제), next(다음 작업). 모르는 현황이나 실행하지 않은 검증을 지어내지 않는다.

summary·remaining·next는 "(1) 짧은 제목: 설명 (2) 짧은 제목: 설명"처럼 번호를 붙여 항목을 나눈다. 제목은 한눈에 읽히도록 짧게 쓴다.

선택 필드 process에는 검증 과정을 단계별로 적는다: [{"step": "npm test", "runs": 3}, {"step": "브라우저 화면 비교", "runs": 2}]. runs는 그 검사를 실제로 실행한 횟수이며, 실패 후 다시 돌린 횟수도 포함한다. 같은 검사를 반복했다면 processNote에 이유를 짧게 적는다. 반복을 줄이는 근거로 쓰이므로 줄이거나 부풀리지 않는다.

확인 응답의 pending.id로 제출한다:
```text
node "D:/Project/project-manager/scripts/project-review.mjs" complete --project couple-app --request "<pending.id>" --file "<보고서.json 경로>"
```

성공 응답을 확인한 뒤 자신이 만든 임시 보고서만 정리한다. Project Desk 서버가 꺼져 있으면 스크립트가 보고서를 보관함(data/inbox)에 저장하고 queued로 응답하는데, 이것도 정상 제출이다. 그 밖의 이유로 제출에 실패하면 보고서를 보존하고 미제출 상태를 사용자에게 알린다. 409 응답이면 요청을 다시 확인하며 다른 AI의 완료 결과를 덮어쓰지 않는다. 기존 사용자 TODO·프로젝트 현황·소스 코드를 이 요청 때문에 변경하지 않는다. 정리 요청은 작업 범위를 확대하거나 AI를 새로 실행하라는 지시가 아니다.
<!-- END PROJECT-DESK WRAP-UP -->
