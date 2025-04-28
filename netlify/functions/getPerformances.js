// netlify/functions/getPerformances.js
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");

exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight 성공' })
    };
  }

  try {
    // 쿼리 파라미터 파싱
    const queryParams = event.queryStringParameters || {};
    let { region, genre, keyword, page = '1', limit = '30' } = queryParams;
    
    // OpenAI API 키
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API 키가 설정되지 않았습니다.');
      // API 키가 없는 경우 샘플 데이터 반환
      const sampleData = generateSamplePerformances(region, genre, keyword);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sampleData)
      };
    }
    
    // 검색어 구성
    let searchQuery = "한국 공연 정보";
    if (region) searchQuery += ` ${region}`;
    if (genre) searchQuery += ` ${genre}`;
    if (keyword) searchQuery += ` ${keyword}`;
    
    try {
      // 현실적인 공연 정보 생성
      const performances = await generateRealisticPerformances(
        OPENAI_API_KEY, 
        region || '전국', 
        genre || '전체', 
        keyword || '', 
        parseInt(limit)
      );
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(performances)
      };
    } catch (aiError) {
      console.error('AI 생성 오류:', aiError);
      
      // AI 생성 실패 시 샘플 데이터 반환
      const sampleData = generateSamplePerformances(region, genre, keyword);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sampleData)
      };
    }
    
  } catch (error) {
    console.error('공연 정보를 가져오는 중 오류:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '공연 정보를 가져오는 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};

// OpenAI를 사용하여 현실적인 공연 데이터 생성
async function generateRealisticPerformances(apiKey, region, genre, keyword, count = 30) {
  try {
    const configuration = new Configuration({
      apiKey: apiKey,
    });
    const openai = new OpenAIApi(configuration);
    
    // 현재 날짜 기준 포맷팅
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    // 지역에 따른 실제 공연장 예시 (더 현실적인 결과를 위해)
    const venuesByRegion = {
      '서울': ['예술의전당', '세종문화회관', '블루스퀘어', '올림픽공원 올림픽홀', '잠실 롯데콘서트홀', '국립중앙박물관', '동대문디자인플라자', 'LG아트센터', '홍익대 아트센터', '마포아트센터', '노들섬', '고척스카이돔', '연세대 백주년기념관', '이화여대 삼성홀', '서울시립미술관'],
      '부산': ['부산문화회관', '영화의전당', '부산시민회관', '부산 KBS홀', '부산 벡스코', '부산 영화의전당', '부산 해운대문화회관'],
      '대구': ['대구콘서트하우스', '대구 수성아트피아', '대구 오페라하우스', '대구 엑스코', '대구문화예술회관'],
      '인천': ['인천문화예술회관', '인천 송도컨벤시아', '인천 부평아트센터', '인천 트라이보울'],
      '광주': ['광주문화예술회관', '광주 김대중컨벤션센터', '광주시립미술관', '빛고을시민문화관'],
      '대전': ['대전예술의전당', '대전시립미술관', '대전시립연정국악원', '대전 한밭대학교 아트홀'],
      '울산': ['울산문화예술회관', '울산 현대예술관', '울산 태화강국제회의실'],
      '경기': ['고양 아람누리', '성남아트센터', '안산문화예술의전당', '수원 경기아트센터', '경기도문화의전당', '의정부 예술의전당'],
      '강원': ['강릉 아트센터', '춘천문화예술회관', '원주 백운아트홀', '강원도립극장'],
      '충청': ['청주예술의전당', '천안예술의전당', '충주시문화회관', '공주문예회관'],
      '전라': ['전주 한국소리문화의전당', '광주문화예술회관', '목포문화예술회관', '여수예울마루'],
      '경상': ['창원 성산아트홀', '구미문화예술회관', '진주 경남문화예술회관', '거제문화예술회관'],
      '제주': ['제주아트센터', '서귀포예술의전당', '제주문예회관']
    };
    
    // 선택된 지역의 공연장, 또는 전국인 경우 모든 공연장
    const venues = region === '전국' 
      ? Object.values(venuesByRegion).flat() 
      : (venuesByRegion[region] || Object.values(venuesByRegion).flat());
    
    // 장르별 공연 유형 (더 현실적인 결과를 위해)
    const typesByGenre = {
      '뮤지컬': ['뮤지컬', '창작뮤지컬', '라이선스 뮤지컬', '가족뮤지컬', '청소년뮤지컬'],
      '연극': ['연극', '창작극', '현대극', '코미디극', '가족극', '마당극'],
      '콘서트': ['콘서트', '록 콘서트', '재즈 콘서트', '팝 콘서트', '힙합 콘서트', '싱어송라이터 공연'],
      '클래식': ['클래식', '오케스트라', '실내악', '피아노 리사이틀', '바이올린 협연', '오페라', '교향악'],
      '무용': ['무용', '발레', '현대무용', '한국무용', '컨템포러리 댄스', '댄스 퍼포먼스'],
      '국악': ['국악', '판소리', '가야금', '대금', '사물놀이', '창극', '퓨전국악'],
      '전시': ['전시', '미술전', '사진전', '특별전', '기획전', '회고전', '미디어아트전'],
      '축제': ['축제', '문화축제', '예술축제', '음악축제', '거리축제', '지역축제']
    };
    
    // 선택된 장르의 공연 유형, 또는 전체인 경우 모든 유형
    const types = genre === '전체' 
      ? Object.values(typesByGenre).flat() 
      : (typesByGenre[genre] || Object.values(typesByGenre).flat());
      
    // 프롬프트 생성
    let prompt = `현재 한국에서 진행 중이거나 예정된 실제 공연/전시/축제 정보를 JSON 형태로 ${count}개 생성해주세요.

요청 조건:
- 지역: ${region}
- 장르: ${genre}
${keyword ? `- 키워드: ${keyword}` : ''}

응답은 다음과 같은 JSON 배열 형식이어야 합니다:
[
  {
    "id": "ai-1",  // 순차적으로 번호 매기기
    "title": "공연 제목", // 현실적이고 다양한 제목
    "description": "공연에 대한 구체적인 설명 (내용, 출연진, 특징 등)",
    "type": "공연 장르", // ${types.slice(0, 5).join(', ')} 등
    "image": "/assets/images/default-performance.png", // 이 값 그대로 사용
    "location": "공연 장소", // ${venues.slice(0, 5).join(', ')} 등 실제 공연장
    "date": "2025-MM-DD ~ 2025-MM-DD", // 현실적인 공연 기간 (1일~3개월)
    "price": "가격 정보", // 현실적인 티켓 가격 (0원~200,000원)
    "region": "지역명", // 서울, 부산, 제주 등 구체적 지역명
    "source": "AI 검색", // 이 값 그대로 사용
    "link": "#", // 이 값 그대로 사용
    "keywords": ["관련", "키워드", "태그"] // 5개 내외의 관련 키워드
  }
]

중요 사항:
1. 실제로 존재할 법한 공연 정보를 생성해주세요.
2. 모든 공연은 ${year}년 ${month}월부터 ${month+6}월 사이의 날짜를 가져야 합니다.
3. 공연 제목과 설명은 창의적이고 구체적이어야 합니다.
4. 각 공연 정보는 완전히 다르고 다양해야 합니다.
5. 지역과 장르에 맞는 현실적인 공연장과 가격을 설정해주세요.
6. 키워드가 주어진 경우 해당 키워드를 반영한 공연을 생성해주세요.
7. 시작일과 종료일은 YYYY-MM-DD 형식을 사용해주세요.

응답은 반드시 유효한 JSON 배열 형식이어야 합니다.`;

    // OpenAI API 호출
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "한국의 공연 정보 전문가로서 현실적이고 다양한 공연 정보를 생성합니다."},
        {role: "user", content: prompt}
      ],
      temperature: 0.8,
      max_tokens: 3000
    });
    
    // 응답에서 JSON 추출
    const content = response.data.choices[0].message.content;
    
    try {
      // JSON 문자열 추출 (마크다운 블록 등이 있을 경우 처리)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      let performances = JSON.parse(jsonStr);
      
      // 누락된 필드 처리 및 형식 통일
      performances = performances.map((perf, index) => ({
        id: `ai-${index + 1}`,
        title: perf.title || `공연 ${index + 1}`,
        description: perf.description || `${perf.title || '공연'} 정보`,
        type: perf.type || (genre !== '전체' ? genre : '공연'),
        image: "/assets/images/default-performance.png",
        location: perf.location || venues[Math.floor(Math.random() * venues.length)],
        date: perf.date || `2025-${month.toString().padStart(2, '0')}-01 ~ 2025-${(month+1).toString().padStart(2, '0')}-01`,
        price: perf.price || `${Math.floor(Math.random() * 10) * 10000}원 ~ ${Math.floor(Math.random() * 10 + 10) * 10000}원`,
        region: perf.region || region,
        source: "AI 검색",
        link: "#",
        keywords: perf.keywords || [perf.type, perf.region, keyword].filter(Boolean)
      }));
      
      return performances;
    } catch (error) {
      console.error("AI 응답 JSON 파싱 오류:", error);
      console.log("원본 내용:", content);
      throw new Error("AI 응답을 파싱할 수 없습니다");
    }
  } catch (error) {
    console.error("OpenAI API 호출 중 오류:", error);
    throw error;
  }
}

// 샘플 공연 데이터 생성 함수 (API 호출 실패 시 대체용)
function generateSamplePerformances(region, genre, keyword) {
  // 기본 샘플 데이터 (지역별로 구분)
  const samplePerformancesByRegion = {
    '서울': [
      {
        id: 'sample-seoul-1',
        title: "봄날의 재즈 콘서트",
        description: "서울의 봄을 맞이하는 특별한 재즈 공연",
        type: "콘서트",
        image: "/assets/images/default-performance.png",
        location: "서울 예술의전당",
        date: "2025-05-15 ~ 2025-05-16",
        price: "30,000원 ~ 80,000원",
        region: "서울",
        keywords: ["재즈", "음악", "서울", "봄", "콘서트"],
        source: "샘플 데이터",
        link: "#"
      },
      {
        id: 'sample-seoul-2',
        title: "국악과 현대음악의 만남",
        description: "전통과 현대가 어우러진 특별한 국악 공연",
        type: "국악",
        image: "/assets/images/default-performance.png",
        location: "국립국악원",
        date: "2025-05-20 ~ 2025-05-25",
        price: "20,000원 ~ 40,000원",
        region: "서울",
        keywords: ["국악", "전통", "현대음악", "서울", "퓨전", "가족"],
        source: "샘플 데이터",
        link: "#"
      },
      {
        id: 'sample-seoul-3',
        title: "서울재즈페스티벌 2025",
        description: "국내외 정상급 재즈 뮤지션들의 공연",
        type: "콘서트",
        image: "/assets/images/default-performance.png",
        location: "올림픽공원",
        date: "2025-05-23 ~ 2025-05-25",
        price: "120,000원",
        region: "서울",
        keywords: ["재즈", "페스티벌", "음악축제", "올림픽공원", "봄"],
        source: "샘플 데이터",
        link: "#"
      }
    ],
    '부산': [
      {
        id: 'sample-busan-1',
        title: "오페라의 유령",
        description: "전 세계적으로 사랑받는 클래식 뮤지컬",
        type: "뮤지컬",
        image: "/assets/images/default-performance.png",
        location: "부산 드림씨어터",
        date: "2025-06-10 ~ 2025-07-15",
        price: "50,000원 ~ 150,000원",
        region: "부산",
        keywords: ["뮤지컬", "클래식", "오페라", "부산"],
        source: "샘플 데이터",
        link: "#"
      },
      {
        id: 'sample-busan-2',
        title: "부산국제영화제",
        description: "아시아 최대 규모의 국제 영화 축제",
        type: "영화제",
        image: "/assets/images/default-performance.png",
        location: "부산 영화의전당",
        date: "2025-10-01 ~ 2025-10-10",
        price: "10,000원 ~ 15,000원",
        region: "부산",
        keywords: ["영화제", "국제", "영화", "부산", "축제", "BIFF"],
        source: "샘플 데이터",
        link: "#"
      }
    ],
    '제주': [
      {
        id: 'sample-jeju-1',
        title: "제주 봄 축제",
        description: "제주의 자연과 함께하는 음악 축제",
        type: "축제",
        image: "/assets/images/default-performance.png",
        location: "제주 평화공원",
        date: "2025-05-01 ~ 2025-05-05",
        price: "무료",
        region: "제주",
        keywords: ["축제", "제주", "봄", "음악", "자연", "가족", "아이"],
        source: "샘플 데이터",
        link: "#"
      }
    ],
    '대구': [
      {
        id: 'sample-daegu-1',
        title: "현대미술 특별전",
        description: "국내 유명 작가들의 현대미술 작품 전시",
        type: "전시",
        image: "/assets/images/default-performance.png",
        location: "대구 미술관",
        date: "2025-04-20 ~ 2025-06-20",
        price: "15,000원",
        region: "대구",
        keywords: ["전시", "미술", "현대미술", "대구", "작가", "예술"],
        source: "샘플 데이터",
        link: "#"
      }
    ],
    '광주': [
      {
        id: 'sample-gwangju-1',
        title: "거리예술축제 '도시의 꿈'",
        description: "도심 곳곳에서 펼쳐지는 다양한 거리공연",
        type: "축제",
        image: "/assets/images/default-performance.png",
        location: "광주 금남로 일대",
        date: "2025-05-25 ~ 2025-05-26",
        price: "무료",
        region: "광주",
        keywords: ["거리예술", "축제", "거리공연", "도시", "금남로"],
        source: "샘플 데이터",
        link: "#"
      },
      {
        id: 'sample-gwangju-2',
        title: "현대 미술 비엔날레",
        description: "국내외 현대 미술의 현재와 미래를 모색하는 예술제",
        type: "전시",
        image: "/assets/images/default-performance.png",
        location: "광주 비엔날레 전시관",
        date: "2025-09-05 ~ 2025-11-10",
        price: "17,000원",
        region: "광주",
        keywords: ["비엔날레", "현대미술", "예술", "국제", "전시"],
        source: "샘플 데이터",
        link: "#"
      }
    ],
    '경기': [
      {
        id: 'sample-gyeonggi-1',
        title: "가족과 함께하는 아이스쇼",
        description: "어린이를 위한 신나는 아이스쇼",
        type: "공연",
        image: "/assets/images/default-performance.png",
        location: "고양 아람누리",
        date: "2025-05-05 ~ 2025-05-05",
        price: "25,000원 ~ 45,000원",
        region: "경기",
        keywords: ["아이스쇼", "가족", "어린이", "어린이날", "아이"],
        source: "샘플 데이터",
        link: "#"
      },
      {
        id: 'sample-gyeonggi-2',
        title: "어린이 체험전 '공룡의 세계'",
        description: "어린이를 위한 공룡 테마 체험 전시",
        type: "전시",
        image: "/assets/images/default-performance.png",
        location: "일산 킨텍스",
        date: "2025-07-01 ~ 2025-08-31",
        price: "18,000원",
        region: "경기",
        keywords: ["공룡", "어린이", "체험", "전시", "가족", "방학"],
        source: "샘플 데이터",
        link: "#"
      }
    ]
  };
  
  // 모든 지역의 공연 정보 합치기
  let allPerformances = Object.values(samplePerformancesByRegion).flat();
  
  // 필터링 적용
  if (region && region !== '전국') {
    allPerformances = allPerformances.filter(performance => 
      performance.region === region
    );
  }
  
  // 장르 필터
  if (genre && genre !== '전체') {
    allPerformances = allPerformances.filter(performance => 
      performance.type === genre
    );
  }
  
  // 키워드 필터
  if (keyword) {
    const searchTerm = keyword.toLowerCase();
    allPerformances = allPerformances.filter(performance => {
      // 키워드 배열에서 검색
      if (performance.keywords && performance.keywords.some(k => k.toLowerCase().includes(searchTerm))) {
        return true;
      }
      
      // 다른 필드에서 검색
      const searchableText = [
        performance.title || '',
        performance.description || '',
        performance.type || '',
        performance.location || '',
        performance.region || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }
  
  // 결과가 없으면 전체 데이터 반환
  if (allPerformances.length === 0) {
    return Object.values(samplePerformancesByRegion).flat();
  }
  
  return allPerformances;
}