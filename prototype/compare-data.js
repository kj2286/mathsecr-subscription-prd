export const comparison = {
  title: '문제은행·DB 구독 변경 비교',
  subtitle: '보존한 초기 화면과 2026년 9월 21일까지 수정한 현재 프로토타입을 비교합니다.',
  basis: '이 비교표는 최초 원본 화면, 이전 DB구독·기기 제한 PRD의 관찰 기록, 대화의 마지막 수정 요구사항과 현재 프로토타입을 대조한 문서입니다. 이전 PRD는 9월 18일에 읽은 화면 기록을 다시 확인했으며, 최초 작성 당시 버전과 같은지는 확인하지 못했습니다. 노션 「26.09.21 문제은행 & db 구독」은 제목과 주소만 확인했고 로그인 제한으로 본문을 읽지 못했습니다. 두 PRD 원문을 모두 대조한 확정 정책표는 아닙니다.',
  summary: [
    {title:'월 요금은 유지',text:'문제은행 월 39,000원, DB 월 49,000원. 두 상품의 문항 이용 권한은 따로 적용합니다.'},
    {title:'자료 탐색부터 문제지까지 연결',text:'수학비서 DB 안에 자료 DB와 학년별 문제은행을 묶고, 선택한 출처·문항을 문제지 제작으로 넘깁니다.'},
    {title:'정책 확인이 남은 항목',text:'최초의 3개월 소멸, 할인율, 포인트·상품권은 현재 구현과 차이가 있습니다. 화면에서 빠진 것을 정책 폐지로 단정하지 않았습니다.'}
  ],
  sources: [
    {id:'original',label:'최초 원본 프로토타입',note:'처음 전달받은 HTML을 수정 없이 보존한 화면. 화면 문구와 실행 동작을 구분해 읽었습니다.',url:'./original.html#mypage/subscription'},
    {id:'latest',label:'최종 수정 프로토타입 · 2026.09.21',note:'수학비서 DB 통합과 문항 선택·문제지 제작까지 반영한 현재 화면.',url:'./index.html#library'},
    {id:'request',label:'사용자 수정 요구사항 · 이 대화',note:'월 요금, 30% 흐림, 부분 문항 구매, 상품 단위 구독과 학년 검색, 알림, 메뉴 통합, 영상에 맞춘 내 문제지 요청을 기준으로 삼았습니다.'},
    {id:'initial-code',label:'최초 화면·코드 대조',note:'보존한 original.html과 최초 subscriptions·shop·worksheets 코드에서 가격·상품 문구·해지·기기 표·화면 동작을 확인했습니다.'},
    {id:'current-code',label:'최종 구현·검증',note:'core·app·papers·library-hub의 현재 동작과 51개 자동 테스트, 브라우저에서 확인한 제작 흐름을 기준으로 삼았습니다.'},
    {id:'prd-db',label:'26.03.19 DB구독 PRD (UPDATE)',note:'9월 18일 보존한 노션 화면 기록에서 영구소유·렌트 구분, 해지 예약·취소, 종료 시 잠금·재구독 복원, 구독 DB 배지를 확인했습니다. 내부 가격 초안은 비교표에 옮기지 않았습니다.',url:'https://app.notion.com/p/26-03-19-DB-PRD-UPDATE-3275ec688e9b80c39cd4e0f748308fa1'},
    {id:'prd-device',label:'26.02.27 디바이스 기기 제한 PRD',note:'9월 18일 보존한 노션 화면 기록에서 등급별 1·2·3·4대, 본인 포함 총 10대, 기기 교체 흐름을 확인했습니다. 원문에 제한 수·금액 변경 가능 표시가 있습니다.',url:'https://app.notion.com/p/26-02-27-PRD-3145ec688e9b80429744d61b7a060ed5'},
    {id:'notion-latest',label:'26.09.21 문제은행 & db 구독',note:'최종 PRD 후보 문서. 제목·주소만 확인했으며 본문은 로그인 제한으로 미확인입니다.',url:'https://app.notion.com/p/26-09-21-db-3e15ec688e9b80ff99d8eafa6080ba3d'}
  ],
  rows: [
    {id:'plans',category:'상품·요금',item:'구독 상품 구분',initial:'문제은행구독과 DB구독을 별도 상품으로 제공. 문제은행 이용과 상점 할인 자격을 구분합니다.',latest:'두 상품을 유지합니다. 문항을 담을 때 문제은행·DB 출처를 저장하고 해당 상품의 이용 권한을 적용합니다.',status:'유지',note:'상품을 한 메뉴에서 찾게 바꿨지만 두 구독이 하나로 합쳐진 것은 아닙니다.',sources:['original','request','current-code']},
    {id:'price',category:'상품·요금',item:'월 구독료',initial:'문제은행 39,000원 / DB 49,000원. 문제은행에는 정가 78,000원과 오픈 50% 할인 문구도 표시합니다.',latest:'문제은행 월 39,000원 / DB 월 49,000원을 유지합니다. 구독 팝업에서 각 상품의 월 요금을 안내합니다.',status:'유지',note:'최종 요금은 사용자가 직접 지정한 금액입니다. 최초의 정가·프로모션 기간을 최신 정책으로 옮기지는 않았습니다.',sources:['original','request','latest']},
    {id:'discount',category:'상품·요금',item:'DB 할인율',initial:'구독 소개는 최대 90% 할인, 서점 계산은 구독자 80% 할인으로 서로 다릅니다.',latest:'현재 화면은 DB 가격과 이용 권한을 안내합니다. 일괄 할인율을 새로 계산하지 않습니다.',status:'확인 필요',note:'80%와 최대 90% 중 승인된 할인율은 원문 PRD에서 확인해야 합니다. 코드의 상충하는 숫자로 정책을 확정하지 않았습니다.',sources:['initial-code','current-code','notion-latest']},
    {id:'points',category:'상품·요금',item:'월 포인트',initial:'월 기간포인트 50,000P, 한 달 뒤 소멸, 기간포인트 우선, 오래된 충전포인트부터 차감, 충전포인트 중 현금성 우선이라는 안내가 있습니다.',latest:'현재 프로토타입은 포인트 지급·차감을 구현하지 않았습니다.',status:'확인 필요',note:'최종 화면에서 보이지 않는 항목입니다. 포인트 정책이 폐지됐다고 판단할 근거는 없습니다.',sources:['initial-code','current-code','notion-latest']},
    {id:'voucher',category:'상품·요금',item:'상품권',initial:'내신 DB 상품권의 기간·이용량·추가 구매 안내와 체험 구매 화면이 있습니다.',latest:'최종 화면에는 상품권 체험 메뉴가 없습니다.',status:'확인 필요',note:'별도 상품의 유지·폐지는 이번 수정 요청에서 확정하지 않았습니다.',sources:['initial-code','current-code','notion-latest']},
    {id:'bank-supply',category:'문항·DB 이용',item:'문제은행 제공 범위',initial:'모든 시중 교재의 숫자변형 3배수, 일주일 안 해결, 채점 예정 등의 소개가 있습니다. 실제 생성·채점 엔진은 없습니다.',latest:'학년별 문항을 단원·난이도·정답 종류·텍스트·수식으로 검색하고 선택해 문제지를 만듭니다.',status:'구체화',note:'현재 자료는 실제 표본 12문항입니다. 소개 문구를 실제 대량 문항 공급이나 생성 엔진의 구현 증거로 보지 않았습니다.',sources:['initial-code','request','current-code']},
    {id:'grade-db',category:'문항·DB 이용',item:'상품 단위 구독과 학년 검색',initial:'최초 화면에는 학년별 DB 이용권을 등록하는 독립 실행 흐름이 없습니다.',latest:'DB 구독과 문제은행 구독은 각각 상품 단위로 이용합니다. 학년은 검색 필터이며 별도 학년 등록이나 학년별 결제는 없습니다.',status:'정정',note:'최신 사용자 요청에 따라 이전 수정안의 학년별 이용권 등록을 바로잡았습니다. 교재·자료의 구독 대상과 제외 구분은 유지합니다.',sources:['initial-code','request','current-code']},
    {id:'partial',category:'문항·DB 이용',item:'문항 하나만 구매',initial:'서점에서 DB·해설 단위로 선택·구매하는 흐름이 중심입니다.',latest:'필요한 문항을 한 개만 이용해도 출처 DB를 나만의 DB에 넣습니다. 전체 중 이용 가능한 문항 수를 표시하고 나머지 문항을 나중에 추가할 수 있습니다.',status:'확장',note:'영구 구매한 문항과 구독으로 빌린 문항의 권한은 따로 관리합니다. 개별 문항 가격·실제 결제는 연동 전입니다.',sources:['initial-code','request','current-code']},
    {id:'blur',category:'문항·DB 이용',item:'미구독·만료 문항 표시',initial:'미보유 문항을 흐리게 표시하고 테스트 구매·구독을 안내합니다.',latest:'이미지 높이의 30%를 흐리게 표시합니다. 미구독 선택 시 구독·문항 구매를 안내하고 만료된 문제지도 문항을 보관한 채 잠급니다.',status:'구체화',note:'CSS 흐림은 미리보기 표시입니다. 원본 이미지 접근이나 캡처를 막는 서버 보안 기능은 아닙니다.',sources:['original','request','current-code']},
    {id:'cancel',category:'해지·보관',item:'해지와 이용 종료',initial:'해지하면 이용이 불가능하다는 안내가 있지만, 해지 예약·잔여 이용 기간을 다루는 상태는 없습니다.',latest:'해지 예약 후 이용 기간이 끝날 때까지 사용합니다. 예약을 취소할 수 있고 만료 후에는 재구독으로 이용을 복구합니다.',status:'기존 PRD 반영',note:'해지 예약·취소와 만료 잠금·재구독 복원은 이전 DB PRD에 이미 있었습니다. 최초 화면에 없던 흐름을 반영한 변경이며 실제 카드 정산은 연결하지 않았습니다.',sources:['initial-code','prd-db','current-code']},
    {id:'retention',category:'해지·보관',item:'3개월 소멸 규칙',initial:'3개월 이내 재구독하면 복구되고, 3개월 이상 구독하지 않은 DB는 소멸한다는 문구가 있습니다.',latest:'현재 프로토타입은 담은 문항과 렌트 이력을 보관합니다. 3개월 뒤 자동 삭제는 구현하지 않았습니다.',status:'확인 필요',note:'최초 문구와 최신 구현이 다릅니다. 최종 PRD를 읽기 전에는 보관 기간이 무제한으로 바뀌었다고 확정할 수 없습니다.',sources:['initial-code','current-code','notion-latest']},
    {id:'saved-papers',category:'해지·보관',item:'구독 종료 후 문제지',initial:'소멸 문항을 포함한 문제지는 재사용할 수 없고, 복사 시 소멸 문항을 삭제한다는 안내가 있습니다.',latest:'문제지·문항·출제 이력을 보존합니다. 이용 권한이 없는 문항은 흐리게 표시하고 재출제·내려받기를 막습니다. 복사본에도 잠긴 문항을 남깁니다.',status:'변경',note:'보관·흐림은 사용자 요청을 반영했습니다. 최초의 소멸·복사 규칙과 최종 PRD의 일치 여부는 확인이 필요합니다.',sources:['initial-code','request','current-code']},
    {id:'devices-base',category:'기기',item:'등급별 기본 기기 수',initial:'이슬 1대, 씨앗 1대, 새싹 2대, 가지 3대, 나무 4대, 숲 5대, 지구 6대.',latest:'등급없음 1대, 씨앗 1대, 새싹·가지·나무 2대, 숲 3대, 지구 4대.',status:'기존 PRD 반영',note:'최종 표는 이전 기기 제한 PRD와 일치합니다. 새로 정한 정책이 아니라 최초 화면과 PRD의 차이를 바로잡은 것입니다. 9월 21일 문서에서 다시 바뀌었는지는 미확인입니다.',sources:['initial-code','prd-device','current-code','notion-latest']},
    {id:'devices-extra',category:'기기',item:'추가 기기와 교체',initial:'기기당 월 15,000원, 포인트 사용 불가. 최대 10개 추가라고 안내합니다.',latest:'기기당 월 15,000원을 유지하고 기본·추가를 합해 총 10대로 제한합니다. 대수 초과 시 기존 기기를 골라 로그아웃하는 흐름을 체험합니다.',status:'기존 PRD 반영',note:'이전 기기 PRD는 본인 포함 총 10명, 카드 결제·포인트 불가를 명시합니다. 최초의 ‘추가 10개’ 문구와 차이가 있습니다. 실제 접속 세션을 제어하지 않습니다.',sources:['initial-code','prd-device','current-code']},
    {id:'navigation',category:'화면·제작',item:'수학비서 DB 메뉴',initial:'수학비서 DB에서 내신·교재를 찾고, 문제은행은 나만의 DB 안에서 엽니다. 수학B서점은 별도 메뉴입니다.',latest:'수학비서 DB 아래에 자료 DB(내신시험지·교재)와 문제은행(중1~고3)을 함께 둡니다.',status:'변경',note:'중간 요청의 독립 문제은행 GNB를 최종안으로 쓰지 않았습니다. 마지막 메뉴 통합 요청을 기준으로 작성했습니다.',sources:['original','request','latest']},
    {id:'search',category:'화면·제작',item:'검색·알림·미리보기',initial:'내신·교재 검색, DB 목록과 미리보기의 기본 화면을 제공합니다.',latest:'빠르게·특별한 검색, 유형·특정 문항·출처 조건, 지역 즐겨찾기, 학교 알림 관리, 학년 문항 필터를 연결했습니다.',status:'확장',note:'목록 더블클릭은 파일정보·이용 안내, 미리보기 버튼은 문제 이미지 확인으로 구분합니다. 알림 발송 서버는 없습니다.',sources:['original','request','current-code']},
    {id:'creation',category:'화면·제작',item:'문제지 제작 시작',initial:'내 문제지에서 기본·랜덤 출제를 시작하고 검색→선택→편집→출제로 이동합니다.',latest:'DB 행이나 문제은행에서 바로 시작합니다. 선택 문항을 새 문제지·학습지·시험지로 만들거나 기존 미출제 문제지에 추가합니다.',status:'확장',note:'출제한 문제지는 복사본으로 작업합니다. 랜덤 출제도 선택 출처·학년·필터를 이어받습니다.',sources:['original','request','current-code']},
    {id:'editing',category:'화면·제작',item:'내 문제지 UI·편집',initial:'기본 제작·편집·출제 화면과 예시 결과를 제공합니다.',latest:'첨부 영상에 맞춘 작업공간·폴더·카드, 상태·종류 필터, 문항 교체·추가, 순서·배점·출제 설정을 연결했습니다. 삭제는 휴지통과 확인 팝업을 사용합니다.',status:'변경',note:'화면·동작 변경입니다. 실제 HWP·PDF 생성, 학생 배포와 학습 분석 서버까지 구현한 것은 아닙니다.',sources:['original','request','current-code']},
    {id:'persistence',category:'화면·제작',item:'저장과 다시 열기',initial:'체험 상태를 메모리에 두어 새로고침하면 초기화됩니다.',latest:'구독·문제지·폴더·필터 출처를 현재 브라우저에 저장합니다. 다시 열어도 선택한 DB 범위를 유지합니다.',status:'개선',note:'다른 기기와의 동기화는 없습니다. 비교 탭은 원본과 최종의 상태를 합치지 않고 각 화면을 유지합니다.',sources:['initial-code','current-code']}
  ],
  limitations: [
    '이전 DB·기기 PRD는 보존한 화면 기록으로 확인했습니다. 문제은행 PRD와 9월 21일 최신 PRD 본문, 최초 작성본의 동일성은 미확인입니다. 따라서 두 PRD의 확정 정책 변경표로 읽으면 안 됩니다.',
    '최초 화면의 정책 소개, 사용자 수정 요청, 현재 프로토타입 구현은 서로 다른 근거입니다. 미구현·비노출을 정책 폐지로 표시하지 않았습니다.',
    '두 화면은 프로토타입입니다. 실제 결제·운영 DB 권한·푸시·HWP/PDF 생성·학생 배포는 연결하지 않았습니다.'
  ]
};
