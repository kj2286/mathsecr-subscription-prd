// 빈 작업공간에서만 제공하는 편집 예시. 문항은 기존 운영 샘플을 재사용하며 권한은 부여하지 않는다.
export function paperWorkspaceSamples(questions) {
  const known=new Set(questions.map(q=>q.id));
  const folderNames=['중1 내신 대비','고1 내신 대비','소인수분해','평면좌표','주간 학습지','학생들 시험지 준비','내신 복습','새 폴더'];
  const folders=folderNames.map((name,i)=>({id:`sample-folder-${i+1}`,name}));
  const examples=[
    ['소인수분해 확인 문제지','문제지',0,['q1109861','q1109862','q1109863']],
    ['공통수학2 평면좌표 시험지','시험지',1,['q4901149','q4901137','q4901148']],
    ['소수와 합성수 연습','문제지',2,['q1109861','q1109862']],
    ['내분점과 평면좌표','문제지',3,['q4901149','q4901137']],
    ['중1 주간 학습지','학습지',4,['q1109864','q1109865','q1109866']],
    ['최대공약수·최소공배수 시험지','시험지',5,['q1109866','q1109868','q1109869']],
    ['정수와 유리수 복습','학습지',6,['q1109872']],
    ['중1 수학 종합 확인','문제지',0,['q1109861','q1109864','q1109868','q1109872']],
  ];
  const papers=examples.map(([title,type,folder,ids],i)=>{
    const questionIds=ids.filter(id=>known.has(id));
    return {id:`sample-paper-${i+1}`,title,type,folderId:folders[folder].id,questionIds,questionSources:Object.fromEntries(questionIds.map(id=>[id,'bank'])),example:true,issued:false};
  });
  return {folders,papers};
}
