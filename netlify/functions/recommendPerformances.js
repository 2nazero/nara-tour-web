// netlify/functions/recommendPerformances.js
const axios = require('axios');

// 한국 공연 정보 API 샘플 URL들
const API_ENDPOINTS = {
  kopis: 'http://www.kopis.or.kr/openApi/restful/pblprfr', // 공연예술통합전산망 API
  seoul: 'http://openapi.seoul.go.kr:8088/API_KEY/json/culturalEventInfo', // 서울시 문화행사 정보
  visitkorea: 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/eventSearchList' // 한국관광공사 API
};

// 샘플 데이터 (API 호출 실패 시 폴백)
const samplePerformances = [
  {
    id: 1,
    title: "봄날의 재즈 콘서트",
    description: "서울의 봄을 맞이하는 특별한 재즈 공연",
    type: "콘서트",
    image: "../assets/images/sample-performance-1.jpg",
    location: "서울 예술의전당",
    date: "2025-05-15",
    price: "30,000원 ~ 80,000원",
    region: "서울",
    keywords: ["재즈", "음악", "서울", "봄", "콘서트"],
    link: "https://www.sac.or.kr"
  },
  {
    id: 2,
    title: "오페라의 유령",
    description: "전 세계적으로 사랑받는 클래식 뮤지컬",
    type: "뮤지컬",
    image: "../assets/images/sample-performance-2.jpg",
    location: "부산 드림씨어터",
    date: "2025-06-10",
    price: "50,000원 ~ 150,000원",
    region: "부산",
    keywords: ["뮤지컬", "클래식", "오페라", "부산"],
    link: "https://www.musicalkorea.com"
  },
  // 기타 샘플 데이터는 이전과 동일
];

exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // POST 요청이 아닌 경우 에러 응답
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '허용되지 않는 메소드' })
    };
  }

  // API 키를 환경 변수에서 가져옵니다
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const KOPIS_API_KEY = process.env.KOPIS_API_KEY;
  
  // POST 요청의 본문에서 사용자 선호도 가져오기
  const userPreferences = JSON.parse(event.body || '{}');
  const { region = '서울', genre = '뮤지컬', keyword = '' } = userPreferences;
  
  try {
    // 1. 먼저 실제 공연 API에서 데이터 가져오기 시도
    let realPerformances = [];
    
    if (KOPIS_API_KEY) {
      try {
        realPerformances = await fetchRealPerformanceData(KOPIS_API_KEY, region, genre, keyword);
      } catch (apiError) {
        console.error('공연 API 호출 오류:', apiError.message);
        // API 호출 실패 시 다음 단계로 진행
      }
    }
    
    // 실제 API에서 데이터를 성공적으로 가져왔다면 반환
    if (realPerformances.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(realPerformances)
      };
    }
    
    // 2. 실제 API에서 데이터를 가져오지 못했다면 OpenAI API 사용 시도
    if (OPENAI_API_KEY) {
      try {
        const openaiResult = await getOpenAIRecommendations(OPENAI_API_KEY, region, genre, keyword);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(openaiResult)
        };
      } catch (openaiError) {
        console.error('OpenAI API 호출 오류:', openaiError.message);
        // OpenAI API 호출 실패 시 다음 단계로 진행
      }
    }
    
    // 3. 두 API 모두 실패한 경우 샘플 데이터에서 필터링
    const filteredSamples = filterPerformancesByKeyword(samplePerformances, keyword, region, genre);
    
    if (filteredSamples.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(filteredSamples)
      };
    }
    
    // 4. 필터링된 결과도 없는 경우 텍스트 응답 생성
    const aiGeneratedResponse = generateAIResponse(keyword, region, genre);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: aiGeneratedResponse })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '공연 추천을 가져오는 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};

// OpenAI API를 사용하여 공연 추천 가져오기
async function getOpenAIRecommendations(apiKey, region, genre, keyword) {
  try {
    // OpenAI API 호출
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `당신은 한국의 문화 공연을 추천해주는 전문가입니다. 
                     지역, 장르, 키워드에 맞는 공연을 추천해주고, 
                     공연의 제목, 설명, 장소, 기간, 가격 등의 정보를 제공해주세요.
                     대답은 항상 JSON 형식이어야 합니다.`
          },
          {
            role: "user",
            content: `지역: ${region}, 장르: ${genre}${keyword ? ', 키워드: ' + keyword : ''}에 맞는 
                     공연을 5개 추천해주세요. 각 공연에 대해 id, title(제목), description(설명), 
                     type(장르), location(공연 장소), date(공연 날짜 YYYY-MM-DD), 
                     price(티켓 가격 범위), region(지역)을 포함해주세요. 
                     JSON 형식으로 응답해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // 응답 구문 분석 및 반환
    const result = response.data.choices[0].message.content;
    
    try {
      // JSON으로 구문 분석 시도
      const parsedResult = JSON.parse(result);
      
      // 결과가 배열인지 확인
      if (Array.isArray(parsedResult)) {
        return parsedResult;
      } 
      // 결과가 performances 배열을 포함하는 객체인지 확인
      else if (parsedResult.performances && Array.isArray(parsedResult.performances)) {
        return parsedResult.performances;
      }
      // 다른 형태의 JSON인 경우
      else {
        return { text: JSON.stringify(parsedResult, null, 2) };
      }
    } catch (jsonError) {
      // JSON 분석 실패 시 텍스트 그대로 반환
      return { text: result };
    }
  } catch (error) {
    console.error('OpenAI API 호출 중 오류:', error);
    throw error;
  }
}

// 실제 공연 API에서 데이터 가져오기
async function fetchRealPerformanceData(apiKey, region, genre, keyword) {
  // 여기서는 KOPIS API를 예로 들어 구현
  // 실제 구현에서는 다른 API도 추가 가능
  
  try {
    // KOPIS API 호출 예시 (실제 API는 다를 수 있음)
    const response = await axios.get(`${API_ENDPOINTS.kopis}`, {
      params: {
        service: apiKey,
        stdate: getFormattedDate(new Date()),
        eddate: getFormattedDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), // 90일 후
        cpage: 1,
        rows: 10,
        shprfnm: keyword, // 공연명 키워드
        signgucode: getRegionCode(region), // 지역 코드
        shcate: getGenreCode(genre) // 장르 코드
      }
    });
    
    // API 응답 변환 및 반환
    if (response.data && response.data.msgBody && response.data.msgBody.perforList) {
      const performances = response.data.msgBody.perforList.map(item => ({
        id: item.mt20id,
        title: item.prfnm,
        description: item.prfcast,
        type: item.genrenm,
        image: item.poster,
        location: item.fcltynm,
        date: `${item.prfpdfrom} ~ ${item.prfpdto}`,
        price: item.pcseguidance,
        region: item.sidonm,
        link: `http://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?menuId=MNU_00020&mt20id=${item.mt20id}`
      }));
      
      return performances;
    }
    
    return []; // 데이터가 없는 경우 빈 배열 반환
  } catch (error) {
    console.error('공연 API 호출 중 오류:', error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

// 키워드로 공연 필터링 함수
function filterPerformancesByKeyword(performances, keyword, region, genre) {
  if (!keyword || !performances || performances.length === 0) return [];
  
  // 검색어 전처리
  const searchTerms = keyword.toLowerCase().split(/\s+/);
  
  return performances.filter(performance => {
    // 키워드 배열이 있는 경우 사용
    const keywordMatch = performance.keywords ? 
      searchTerms.some(term => performance.keywords.some(k => k.toLowerCase().includes(term))) :
      false;
    
    // 기본 검색 필드 (키워드 배열이 없는 경우)
    const textMatch = !keywordMatch ? searchTerms.some(term => {
      const searchableText = [
        performance.title || '',
        performance.description || '',
        performance.type || '',
        performance.location || '',
        performance.region || ''
      ].join(' ').toLowerCase();
      return searchableText.includes(term);
    }) : false;
    
    // 지역 필터
    const regionMatch = !region || (performance.region && performance.region.includes(region));
    
    // 장르 필터
    const genreMatch = !genre || (performance.type && performance.type === genre);
    
    return (keywordMatch || textMatch) && regionMatch && genreMatch;
  });
}

// 날짜 형식 지정 함수 (YYYYMMDD)
function getFormattedDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 지역 코드 변환 함수 (예시)
function getRegionCode(region) {
  const regionCodes = {
    '서울': '11',
    '경기': '41',
    '인천': '28',
    '강원': '51',
    '충청': '43',
    '대전': '30',
    '전라': '45',
    '광주': '29',
    '경상': '47',
    '대구': '27',
    '부산': '26',
    '울산': '31',
    '제주': '50'
  };
  
  return regionCodes[region] || '';
}

// 장르 코드 변환 함수 (예시)
function getGenreCode(genre) {
  const genreCodes = {
    '연극': 'AAAA',
    '뮤지컬': 'AAAB',
    '무용': 'BBBA',
    '클래식': 'CCCA',
    '오페라': 'CCCB',
    '국악': 'CCCC',
    '콘서트': 'CCCD',
    '전시': 'EEEA'
  };
  
  return genreCodes[genre] || '';
}

// AI 응답 생성 함수 (API 호출 실패 시 사용)
function generateAIResponse(keyword, region, genre) {
  // 간단한 응답 템플릿
  const templates = [
    `안녕하세요, "${keyword}" 키워드로 검색한 결과입니다.\n\n현재 "${keyword}"와 관련된 공연 정보를 찾을 수 없습니다. ${region ? `${region} 지역의 ` : ''}${genre ? `${genre} 장르의 ` : ''}공연 정보가 업데이트되면 알려드리겠습니다.\n\n다른 키워드로 검색해보시는 것은 어떨까요? 인기 있는 키워드로는 "클래식", "뮤지컬", "재즈", "가족", "전시" 등이 있습니다.`,
    
    `"${keyword}" 관련 공연을 찾고 계시는군요!\n\n아쉽게도 현재 "${keyword}"와 정확히 일치하는 공연은 등록되어 있지 않습니다. ${region ? `${region} 지역에서는 ` : ''}다양한 공연이 예정되어 있으니 조금 더 넓은 키워드로 검색해보세요.\n\n추천 키워드: 음악, 콘서트, 전시, 축제, 가족, 클래식`,
    
    `"${keyword}"에 관심이 있으시군요!\n\n현재 API 연결에 문제가 있어 "${keyword}" 관련 공연 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주시거나, 다른 키워드로 검색해보세요.\n\n인기 키워드: 뮤지컬, 콘서트, 전시, 클래식, 페스티벌`
  ];
  
  // 랜덤하게 템플릿 선택
  return templates[Math.floor(Math.random() * templates.length)];
}