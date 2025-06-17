// netlify/functions/recommendPerformances.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
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

  // API 키 (인코딩된 키 사용)
  const TOUR_API_KEY = 'Tu0trZCGNDsho41DoZ5s3owOJnzOMKG8YkTf0tI6O5gEgXhWZModqYaIZ2ZsnYOFBkjMT%2FYN%2F3AO8xVidwReOA%3D%3D';
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  // POST 요청의 본문에서 사용자 선호도 가져오기
  const userPreferences = JSON.parse(event.body || '{}');
  const { region = '', genre = '', keyword = '' } = userPreferences;
  
  console.log('추천 요청 파라미터:', { region, genre, keyword });
  
  try {
    // 1. 먼저 모든 데이터를 가져와서 로컬에서 필터링 (API의 키워드 검색이 제한적일 수 있음)
    const allPerformances = await fetchAllPerformances(TOUR_API_KEY, region);
    console.log(`전체 ${allPerformances.length}개의 공연 정보를 가져옴`);
    
    // 2. 키워드 기반 필터링 (더 정교한 유사도 검색)
    const recommendedPerformances = findSimilarPerformances(allPerformances, keyword, genre, 9);
    console.log(`${recommendedPerformances.length}개의 추천 결과 선택됨`);
    
    // 결과가 있는 경우 반환
    if (recommendedPerformances.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(recommendedPerformances)
      };
    }
    
    // 3. 유사한 공연이 없으면 기본 추천 제공
    console.log('유사한 공연 없음, 기본 추천 사용');
    const defaultRecommendations = getDefaultRecommendations(allPerformances, region, genre, 9);
    
    if (defaultRecommendations.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultRecommendations)
      };
    }
    
    // 4. 실패 시 대체 텍스트 응답 생성
    console.log('대체 텍스트 응답 생성');
    const fallbackResponse = generateFallbackResponse(keyword, region, genre);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: fallbackResponse })
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

// 전체 공연 정보 가져오기 (여러 페이지에 걸쳐서)
async function fetchAllPerformances(apiKey, region, maxPages = 5) {
  const pageSize = 50; // 한 번에 최대한 많은 데이터를 가져옴
  const allPerformances = [];
  const regionCode = getRegionCode(region);
  
  // 현재 날짜 구하기 (YYYYMMDD 형식)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  try {
    for (let page = 1; page <= maxPages; page++) {
      console.log(`${page}페이지 데이터 요청 중...`);
      
      // API 기본 URL
      const baseUrl = 'http://apis.data.go.kr/B551011/KorService2/searchFestival2';
      
      // 파라미터 구성
      let queryParams = [
        `serviceKey=${apiKey}`,
        `MobileOS=ETC`,
        `MobileApp=FestivalChecker`,
        `eventStartDate=${today}`,
        `pageNo=${page}`,
        `numOfRows=${pageSize}`,
        `arrange=A`,
        `_type=json`
      ];
      
      // 지역 코드가 있는 경우 추가
      if (regionCode) {
        queryParams.push(`areaCode=${regionCode}`);
      }
      
      // 쿼리스트링 조합
      const queryString = queryParams.join('&');
      const fullUrl = `${baseUrl}?${queryString}`;
      
      // API 호출
      const response = await axios.get(fullUrl, {
        timeout: 10000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });
      
      // 응답 처리
      if (response.data && 
          response.data.response && 
          response.data.response.header &&
          response.data.response.header.resultCode === '0000') {
        
        const body = response.data.response.body;
        
        if (body && body.items && body.items.item) {
          const items = body.items.item;
          const itemsArray = Array.isArray(items) ? items : [items];
          
          console.log(`${page}페이지에서 ${itemsArray.length}개 항목 발견`);
          
          // 데이터 변환 및 추가
          const performances = itemsArray.map((item, index) => ({
            id: `tour-${item.contentid || `${page}-${index}`}`,
            title: item.title || `행사 ${index + 1}`,
            description: item.overview || `${item.title || '행사'}에 대한 상세 정보입니다.`,
            type: getEventType(item.contenttypeid),
            image: item.firstimage || "/assets/images/default-performance.png",
            location: item.addr1 || '위치 정보 없음',
            date: formatEventDate(item.eventstartdate, item.eventenddate),
            price: estimatePrice(item.title, item.overview),
            region: getRegionName(item.areacode, item.sigungucode),
            source: "한국관광공사",
            link: `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${item.contentid}`,
            tel: item.tel || '연락처 정보 없음',
            keywords: extractKeywords(item.title, item.overview)
          }));
          
          allPerformances.push(...performances);
          
          // 마지막 페이지인 경우 중단
          if (itemsArray.length < pageSize) {
            console.log('마지막 페이지 도달');
            break;
          }
        } else {
          console.log(`${page}페이지에 항목 없음`);
          break;
        }
      } else {
        console.log(`${page}페이지 요청 실패`);
        break;
      }
    }
    
    console.log(`총 ${allPerformances.length}개의 공연 정보 수집됨`);
    return allPerformances;
    
  } catch (error) {
    console.error('전체 공연 정보 가져오기 오류:', error.message);
    return allPerformances; // 오류 발생해도 지금까지 수집한 데이터 반환
  }
}

// 유사한 공연 찾기 (키워드 기반)
function findSimilarPerformances(performances, keyword, genre, limit = 9) {
  if (!keyword || keyword.trim() === '') {
    return [];
  }
  
  const keywordTerms = keyword.toLowerCase().split(/\s+/);
  
  // 각 공연에 대해 키워드 유사도 점수 계산
  const scoredPerformances = performances.map(performance => {
    // 장르 필터링 (장르가 지정된 경우)
    if (genre && performance.type !== genre) {
      return { performance, score: 0 };
    }
    
    // 제목, 설명, 키워드에서 검색어 일치 점수 계산
    const title = performance.title.toLowerCase();
    const description = (performance.description || '').toLowerCase();
    const perfKeywords = performance.keywords || [];
    
    let score = 0;
    
    // 키워드 일치 점수
    keywordTerms.forEach(term => {
      // 제목에서 일치 (가중치 높음)
      if (title.includes(term)) {
        score += 5;
      }
      
      // 정확히 일치하는 경우 추가 점수
      if (title === term) {
        score += 3;
      }
      
      // 설명에서 일치
      if (description.includes(term)) {
        score += 2;
      }
      
      // 키워드 일치
      if (perfKeywords.some(k => k.includes(term))) {
        score += 3;
      }
    });
    
    return { performance, score };
  });
  
  // 점수로 정렬하고 상위 항목 선택
  const filteredPerformances = scoredPerformances
    .filter(item => item.score > 0) // 점수가 0보다 큰 항목만 선택
    .sort((a, b) => b.score - a.score) // 높은 점수부터 정렬
    .slice(0, limit) // 상위 limit개 선택
    .map(item => item.performance); // 공연 정보만 추출
  
  return filteredPerformances;
}

// 기본 추천 제공 (지역 또는 장르 기반)
function getDefaultRecommendations(performances, region, genre, limit = 9) {
  // 필터링 조건 설정
  let filtered = [...performances];
  
  if (region) {
    filtered = filtered.filter(item => item.region.includes(region));
  }
  
  if (genre) {
    filtered = filtered.filter(item => item.type === genre);
  }
  
  // 필터링된 결과가 없으면 모든 공연에서 선택
  if (filtered.length < limit) {
    filtered = performances;
  }
  
  // 랜덤하게 선택 (중복 없이)
  const selected = [];
  const max = Math.min(limit, filtered.length);
  
  if (max === 0) return [];
  
  const indices = new Set();
  while (indices.size < max) {
    const randomIndex = Math.floor(Math.random() * filtered.length);
    indices.add(randomIndex);
  }
  
  // 선택된 인덱스의 공연 추가
  indices.forEach(index => {
    selected.push(filtered[index]);
  });
  
  return selected;
}

// 이벤트 유형 변환
function getEventType(contentTypeId) {
  const contentTypes = {
    15: '축제',
    25: '여행코스',
    32: '숙박',
    38: '쇼핑',
    39: '음식점'
  };
  
  return contentTypeId ? (contentTypes[contentTypeId] || '공연/행사') : '공연/행사';
}

// 키워드 추출 함수
function extractKeywords(title = '', description = '') {
  // 추출할 텍스트 조합
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // 키워드 후보 목록 (행사 유형, 테마, 계절 등)
  const keywordCategories = {
    eventTypes: ['축제', '공연', '전시', '박람회', '체험', '문화행사', '콘서트', '마켓', '페스티벌'],
    themes: ['음식', '문화', '예술', '역사', '전통', '음악', '댄스', '체험', '가족', '아동', '어린이'],
    seasons: ['봄', '여름', '가을', '겨울', '계절'],
    activities: ['체험', '관람', '참여', '학습', '교육', '놀이'],
    places: ['공원', '광장', '거리', '마을', '도시', '산', '강', '바다', '호수'],
    specialties: ['커피', '김밥', '국악', '공룡', '단오', '숲길', '반려동물', '다문화']
  };
  
  // 추출된 키워드 저장
  const extractedKeywords = [];
  
  // 각 카테고리별 키워드 확인
  Object.values(keywordCategories).forEach(category => {
    category.forEach(keyword => {
      if (text.includes(keyword)) {
        extractedKeywords.push(keyword);
      }
    });
  });
  
  // 제목에서 특수한 단어 추출 (2글자 이상)
  const specialWords = title.match(/[가-힣]{2,}/g) || [];
  specialWords.forEach(word => {
    // 기본 키워드나 일반적인 단어가 아닌 경우만 추가
    if (!extractedKeywords.includes(word) && 
        !['행사', '축제', '페스티벌', '전시', '공연', '문화', '예술'].includes(word)) {
      extractedKeywords.push(word);
    }
  });
  
  // 중복 제거 및 최대 3개 제한
  return [...new Set(extractedKeywords)].slice(0, 3);
}

// 가격 추정 함수
function estimatePrice(title = '', description = '') {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // 무료로 추정할 수 있는 키워드
  const freeKeywords = ['무료', '자유', '자유입장', '오픈'];
  
  // 유료로 추정할 수 있는 키워드
  const paidKeywords = ['입장권', '티켓', '예매', '입장료', '관람료'];
  
  // 무료 키워드가 있는 경우
  if (freeKeywords.some(keyword => text.includes(keyword))) {
    return '무료(추정)';
  }
  
  // 유료 키워드가 있는 경우
  if (paidKeywords.some(keyword => text.includes(keyword))) {
    return '유료(추정)';
  }
  
  // 대부분의 지역 축제는 무료일 가능성이 높음
  if (text.includes('축제') || text.includes('페스티벌')) {
    return '무료(추정)';
  }
  
  // 기본 값
  return '가격 정보 없음';
}

// 이벤트 날짜 형식화
function formatEventDate(startDate, endDate) {
  if (!startDate) return '날짜 정보 없음';
  
  // YYYYMMDD 형식을 YYYY-MM-DD로 변환
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return '';
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  };
  
  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);
  
  if (formattedStart && formattedEnd) {
    return `${formattedStart} ~ ${formattedEnd}`;
  }
  
  return formattedStart || '날짜 정보 없음';
}

// 지역 코드 변환 함수
function getRegionCode(region) {
  const regionCodes = {
    '서울': 1,
    '인천': 2,
    '대전': 3,
    '대구': 4,
    '광주': 5,
    '부산': 6,
    '울산': 7,
    '세종': 8,
    '경기': 31,
    '강원': 32,
    '충북': 33,
    '충청': 33, // 충북과 동일하게 처리
    '충남': 34,
    '경북': 35,
    '경상': 35, // 경북과 동일하게 처리
    '경남': 36,
    '전북': 37,
    '전라': 37, // 전북과 동일하게 처리
    '전남': 38,
    '제주': 39
  };
  
  return region ? regionCodes[region] : null;
}

// 지역 이름 생성 함수
function getRegionName(areaCode, sigunguCode) {
  const areaNames = {
    1: '서울',
    2: '인천',
    3: '대전',
    4: '대구',
    5: '광주',
    6: '부산',
    7: '울산',
    8: '세종',
    31: '경기도',
    32: '강원도',
    33: '충청북도',
    34: '충청남도',
    35: '경상북도',
    36: '경상남도',
    37: '전라북도',
    38: '전라남도',
    39: '제주도'
  };
  
  return areaCode ? (areaNames[areaCode] || '기타 지역') : '전국';
}

// 대체 응답 생성 함수
function generateFallbackResponse(keyword, region, genre) {
  const templates = [
    `안녕하세요, "${keyword}" 키워드로 검색한 결과입니다.\n\n현재 "${keyword}"와 관련된 공연 정보를 찾을 수 없습니다. ${region ? `${region} 지역의 ` : ''}${genre ? `${genre} 장르의 ` : ''}공연 정보가 업데이트되면 알려드리겠습니다.\n\n다른 키워드로 검색해보시는 것은 어떨까요? 인기 있는 키워드로는 "클래식", "뮤지컬", "재즈", "가족", "전시" 등이 있습니다.`,
    
    `"${keyword}" 관련 공연을 찾고 계시는군요!\n\n아쉽게도 현재 "${keyword}"와 정확히 일치하는 공연은 등록되어 있지 않습니다. ${region ? `${region} 지역에서는 ` : ''}다양한 공연이 예정되어 있으니 조금 더 넓은 키워드로 검색해보세요.\n\n추천 키워드: 음악, 콘서트, 전시, 축제, 가족, 클래식`,
    
    `"${keyword}"에 관심이 있으시군요!\n\n현재 DB에 "${keyword}" 관련 공연이 없지만, 비슷한 관심사를 가진 분들이 많이 찾는 공연으로는 다음과 같은 것들이 있습니다:\n\n1. 클래식 오케스트라 정기 공연\n2. 현대미술 특별전\n3. 국악과 현대음악의 만남\n\n다른 키워드로 검색하시거나, 곧 업데이트될 새로운 공연 정보를 기대해주세요!`
  ];
  
  // 랜덤하게 템플릿 선택
  return templates[Math.floor(Math.random() * templates.length)];
}