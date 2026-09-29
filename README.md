# 수학비서 DB · 문제은행 구독 PRD

수학비서 B안의 기능 정의서와 정적 프로토타입입니다. DB 구독은 월 49,000원, 문제은행 구독은 월 39,000원이며 각각 전체 학년을 이용합니다. 학년은 검색 필터이고 DB 구독 제외 자료는 별도로 구분합니다.

[PRD 보기](https://kj2286.github.io/mathsecr-subscription-prd/) · [B안 문제은행](https://subscription-question-bank.vercel.app/?variant=b&revision=20260929-source-db#bank/중1) · [내신시험지 DB](https://subscription-question-bank.vercel.app/?variant=b&revision=20260929-source-db#library/school) · [교재 DB](https://subscription-question-bank.vercel.app/?variant=b&revision=20260929-source-db#library/book)

[출처찾기 & DB화](https://subscription-question-bank.vercel.app/?variant=b&revision=20260929-source-db#source)

## 최신 기능

- 미보유 문항도 체크·전체 선택할 수 있습니다. 문제지에 담을 때 선택을 유지한 채 문항 구매나 해당 상품 구독을 안내하고, 이용권을 확인하면 문제지 만들기로 돌아갑니다.
- 내신·교재 DB는 개별 구매와 DB 구독을 모두 지원합니다. 고정 장바구니에서 담긴 개수와 자료를 확인합니다.
- 지역 선택 목록은 검색 조건과 독립적으로 유지합니다. 시군구까지 관심지역으로 저장하고, 바로 아래에서 새 시험지 알림을 설정한 학교를 확인·해제합니다.
- 출처찾기는 왼쪽 업로드 문항과 오른쪽 2열 출처 결과로 구성합니다. 원본 문항을 선택해 나만의 DB에 저장하거나, 동일 문항·같은 단원 후보를 확인합니다. 출처 결과에서는 문항 구매, 원출처 DB 전체 구매, 상품별 구독을 선택합니다. 원본 저장 선택과 구매 선택은 따로 유지합니다.
- 실제 수집 12문항과 기능 확인용 예시 30문항을 구분합니다. 예시는 실제 시험지 문항으로 표시하지 않으며 업로드 출처 검색 후보에도 넣지 않습니다.

## 저장소 구성

- `index.html`: 글꼴을 포함한 단일 HTML PRD. 문서의 `HTML 내려받기`로 저장하면 인터넷 없이 읽을 수 있습니다.
- `prototype/`: 공개 배포본을 복사한 HTML·CSS·JavaScript·이미지·글꼴·PDF 보기 라이브러리와 공개 표본 자료입니다.
- `licenses/`: PRD에 포함한 Pretendard 글꼴의 이용 조건입니다. 프로토타입의 라이브러리 라이선스는 해당 자산 경로에 포함합니다.

내부 작업 문서·검토 자료·테스트·사용자 업로드 파일·Vercel 연결 설정은 `prototype/`에 포함하지 않습니다. 공개 표본 PDF는 문항 분리 기능을 확인하는 자료로 유지합니다.

## 로컬에서 실행

저장소 폴더에서 Python 정적 서버를 실행합니다.

```sh
python3 -m http.server 8000
```

[로컬 PRD](http://localhost:8000/) 또는 [로컬 문제은행](http://localhost:8000/prototype/?variant=b&revision=20260929-source-db#bank/중1)을 엽니다. JavaScript 모듈과 PDF 파일을 읽으므로 프로토타입은 HTML 파일을 직접 여는 대신 서버 주소로 접속합니다. 별도 설치나 빌드는 필요하지 않습니다.

GitHub Pages는 `main` 브랜치의 루트에서 발행합니다. [GitHub Pages 프로토타입](https://kj2286.github.io/mathsecr-subscription-prd/prototype/?variant=b&revision=20260929-source-db#bank/중1)도 같은 정적 파일을 사용합니다.

## 구현 범위와 미정 정책

구매·구독·알림 설정은 브라우저에 저장합니다. 실제 결제·알림 발송·다른 기기 동기화는 연결하지 않았습니다. 업로드 파일은 브라우저에서 읽으며, 출처는 확인된 표본이나 추출 텍스트를 비교해 찾습니다. DB화한 원본 이미지와 추출 텍스트는 이 브라우저에 보관하며 새로고침 뒤에도 볼 수 있습니다. OCR과 운영 전체 DB 검색은 연결하지 않았습니다. 완전 동일 표시는 확인된 표본의 원본 일치에만 사용합니다.

개별·잔여 문항 가격, 구독 제외 자료 기준, 갱신·실패 유예·환불 기준은 미정입니다. 문서의 미정 항목을 확정 정책으로 적용하지 않습니다. 글꼴 이용 조건은 [Pretendard 라이선스](licenses/Pretendard-LICENSE.txt)를 참고하세요.
