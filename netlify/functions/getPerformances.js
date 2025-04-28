const { Configuration, OpenAIApi } = require("openai");

exports.handler = async function(event, context) {
  try {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    
    // 요청 파라미터 추출
    const params = JSON.parse(event.body || '{}');
    const { region, category } = params;
    
    // 프롬프트 생성
    let prompt = "한국의 최신 공연 정보를 JSON 형태로 제공해주세요. ";
    
    if (region) {
      prompt += `지역: ${region}. `;
    }
    
    if (category) {
      prompt += `카테고리: ${category}. `;
    }
    
    prompt += "각 공연에 대해 제목, 장소, 날짜, 시간, 가격, 장르, 설명을 포함해주세요. JSON 형식으로만 응답해주세요.";
    
    // OpenAI API 호출
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: "한국의 공연 정보 전문가로서 최신 공연 정보를 JSON 형태로 제공해주세요."},
        {role: "user", content: prompt}
      ],
      temperature: 0.7,
    });
    
    // 응답에서 JSON 추출
    const content = response.data.choices[0].message.content;
    let performances = [];
    
    try {
      // JSON 문자열 추출 (마크다운 블록 등이 있을 경우 처리)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      performances = JSON.parse(jsonStr);
    } catch (error) {
      console.error("JSON 파싱 오류:", error);
      console.log("원본 내용:", content);
      performances = { error: "응답을 파싱할 수 없습니다." };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(performances),
      headers: {
        "Content-Type": "application/json"
      }
    };
  } catch (error) {
    console.error("API 오류:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      headers: {
        "Content-Type": "application/json"
      }
    };
  }
};// netlify/functions/getPerformances.js
const axios = require('axios');

// API 엔드포인트 정의
const API_ENDPOINTS = {
  kopis: 'http://www.kopis.or.kr/openApi/restful/pblprfr', // 공연예술통합전산망 API
  seoul: 'http://openapi.seoul.go.kr:8088', // 서울시 문화행사 정보
  visitkorea: 'http://api.visitkorea.or.kr/openapi/service/rest/KorService/eventSearchList', // 한국관광공사 API
  culture: 'http://www.culture.go.kr/openapi/rest/publicperformancedisplays' // 문화포털 API
};

// 환경 변수에서 API 키 가져오기
const API_KEYS = {
  kopis: process.env.KOPIS_API_KEY,
  seoul: process.env.SEOUL_API_KEY,
  visitkorea: process.env.VISITKOREA_API_KEY,
  culture: process.env.CULTURE_API_KEY
};

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
    const { region, genre, keyword, page = '1', limit = '20' } = queryParams;
    
    // 모든 활성화된 API에서 데이터 병렬로 가져오기 시도
    const apiPromises = [];
    
    // 1. KOPIS API (공연예술통합전산망)
    if (API_KEYS.kopis) {
      apiPromises.push(fetchKopisData(API_KEYS.kopis, region, genre, keyword, page, limit));
    }
    
    // 2. 서울시 문화행사 정보 API (서울 지역만)
    if (API_KEYS.seoul && (!region || region === '서울')) {
      apiPromises.push(fetchSeoulData(API_KEYS.seoul, genre, keyword, page, limit));
    }
    
    // 3. 한국관광공사 API
    if (API_KEYS.visitkorea) {
      apiPromises.push(fetchVisitKoreaData(API_KEYS.visitkorea, region, genre, keyword, page, limit));
    }
    
    // 4. 문화포털 API
    if (API_KEYS.culture) {
      apiPromises.push(fetchCultureData(API_KEYS.culture, region, genre, keyword, page, limit));
    }
    
    // 모든 API 호출 결과 기다리기
    const apiResults = await Promise.allSettled(apiPromises);
    
    // 성공한 API 결과 합치기
    let allPerformances = [];
    
    apiResults.forEach(result => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allPerformances = [...allPerformances, ...result.value];
      }
    });
    
    // 중복 제거 (id 또는 title+location 조합으로)
    const uniquePerformances = removeDuplicates(allPerformances);
    
    // 결과가 있는 경우
    if (uniquePerformances.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(uniquePerformances)
      };
    } 
    // 결과가 없는 경우 샘플 데이터 반환
    else {
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

// KOPIS API 호출 함수
async function fetchKopisData(apiKey, region, genre, keyword, page, limit) {
  try {
    // 현재 날짜
    const today = new Date();
    
    // 3개월 후 날짜
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(today.getMonth() + 3);
    
    // 날짜 형식 변환 (YYYYMMDD)
    const stdate = formatDateToYYYYMMDD(today);
    const eddate = formatDateToYYYYMMDD(threeMonthsLater);
    
    // 지역 코드 변환
    const areaCode = getKopisRegionCode(region);
    
    // 장르 코드 변환
    const genreCode = getKopisGenreCode(genre);
    
    // API 호출
    const response = await axios.get(`${API_ENDPOINTS.kopis}`, {
      params: {
        service: apiKey,
        stdate: stdate,
        eddate: eddate,
        cpage: page,
        rows: limit,
        shprfnm: keyword || '',
        signgucode: areaCode,
        shcate: genreCode
      }
    });
    
    // API 응답 처리
    if (response.data && response.data.msgBody && response.data.msgBody.perforList) {
      // XML 응답을 JSON으로 변환 (KOPIS API는 XML 응답을 제공할 수 있음)
      const performances = Array.isArray(response.data.msgBody.perforList) 
        ? response.data.msgBody.perforList 
        : [response.data.msgBody.perforList];
      
      // 표준 형식으로 변환
      return performances.map(item => ({
        id: `kopis-${item.mt20id}`,
        title: item.prfnm,
        description: item.prfcast || `${item.prfnm} 공연`,
        type: item.genrenm,
        image: item.poster || '../assets/images/default-performance.jpg',
        location: item.fcltynm,
        date: `${formatDateToReadable(item.prfpdfrom)} ~ ${formatDateToReadable(item.prfpdto)}`,
        price: item.pcseguidance || '가격 정보 없음',
        region: item.sidonm || region || '전국',
        source: 'KOPIS',
        link: `http://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?menuId=MNU_00020&mt20id=${item.mt20id}`
      }));
    }
    
    return [];
  } catch (error) {
    console.error('KOPIS API 호출 중 오류:', error);
    return [];
  }
}

// 서울시 문화행사 정보 API 호출 함수
async function fetchSeoulData(apiKey, genre, keyword, page, limit) {
  try {
    // 장르 코드 변환
    const categoryCode = getSeoulGenreCode(genre);
    
    // API 호출
    const response = await axios.get(`${API_ENDPOINTS.seoul}/${apiKey}/json/culturalEventInfo/${(parseInt(page) - 1) * parseInt(limit) + 1}/${parseInt(page) * parseInt(limit)}`);
    
    // API 응답 처리
    if (response.data && response.data.culturalEventInfo && response.data.culturalEventInfo.row) {
      const events = response.data.culturalEventInfo.row;
      
      // 키워드 필터링 (필요한 경우)
      let filteredEvents = events;
      if (keyword) {
        const searchTerm = keyword.toLowerCase();
        filteredEvents = events.filter(event => 
          event.TITLE.toLowerCase().includes(searchTerm) || 
          (event.PROGRAM && event.PROGRAM.toLowerCase().includes(searchTerm)) ||
          (event.ORG_NAME && event.ORG_NAME.toLowerCase().includes(searchTerm))
        );
      }
      
      // 장르 필터링 (필요한 경우)
      if (categoryCode) {
        filteredEvents = filteredEvents.filter(event => 
          event.CODENAME && event.CODENAME.includes(categoryCode)
        );
      }
      
      // 표준 형식으로 변환
      return filteredEvents.map(item => ({
        id: `seoul-${item.CULTCODE}`,
        title: item.TITLE,
        description: item.PROGRAM || item.TITLE,
        type: item.CODENAME || '문화행사',
        image: item.MAIN_IMG || '../assets/images/default-performance.jpg',
        location: item.PLACE,
        date: `${formatDateToReadable(item.STRTDATE)} ~ ${formatDateToReadable(item.END_DATE)}`,
        price: item.USE_FEE || '가격 정보 없음',
        region: '서울',
        source: '서울시 문화행사',
        link: item.ORG_LINK || '#'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('서울시 API 호출 중 오류:', error);
    return [];
  }
}

// 한국관광공사 API 호출 함수
async function fetchVisitKoreaData(apiKey, region, genre, keyword, page, limit) {
  try {
    // 지역 코드 변환
    const areaCode = getVisitKoreaRegionCode(region);
    
    // 장르 코드 변환 (관광공사는 카테고리가 다를 수 있음)
    const eventType = getVisitKoreaEventType(genre);
    
    // API 호출
    const response = await axios.get(API_ENDPOINTS.visitkorea, {
      params: {
        ServiceKey: apiKey,
        MobileOS: 'ETC',
        MobileApp: 'NaraTour',
        arrange: 'P',
        listYN: 'Y',
        areaCode: areaCode,
        eventStartDate: formatDateToYYYYMMDD(new Date()),
        eventType: eventType,
        keyword: keyword || '',
        pageNo: page,
        numOfRows: limit
      }
    });
    
    // API 응답 처리 (한국관광공사 API는 XML 응답을 제공할 수 있음)
    if (response.data && response.data.response && response.data.response.body && 
        response.data.response.body.items && response.data.response.body.items.item) {
      
      const events = Array.isArray(response.data.response.body.items.item) 
        ? response.data.response.body.items.item 
        : [response.data.response.body.items.item];
        
      // 표준 형식으로 변환
      return events.map(item => ({
        id: `visitkorea-${item.contentid}`,
        title: item.title,
        description: item.overview || item.title,
        type: mapVisitKoreaEventTypeToGenre(item.contenttypeid),
        image: item.firstimage || '../assets/images/default-performance.jpg',
        location: item.addr1 || item.addr2 || '위치 정보 없음',
        date: item.eventstartdate && item.eventenddate
          ? `${formatDateToReadable(item.eventstartdate)} ~ ${formatDateToReadable(item.eventenddate)}`
          : '날짜 정보 없음',
        price: item.usetimefestival || '가격 정보 없음',
        region: mapVisitKoreaAreaCodeToRegion(item.areacode),
        source: '한국관광공사',
        link: `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${item.contentid}`
      }));
    }
    
    return [];
  } catch (error) {
    console.error('한국관광공사 API 호출 중 오류:', error);
    return [];
  }
}

// 문화포털 API 호출 함수
async function fetchCultureData(apiKey, region, genre, keyword, page, limit) {
  try {
    // 지역 코드 변환
    const areaCode = getCultureRegionCode(region);
    
    // 장르 코드 변환
    const genreCode = getCultureGenreCode(genre);
    
    // API 호출
    const response = await axios.get(`${API_ENDPOINTS.culture}/realm`, {
      params: {
        serviceKey: apiKey,
        sido: areaCode,
        realmCode: genreCode,
        keyword: keyword || '',
        cPage: page,
        rows: limit,
        sortStdr: 1 // 1: 등록일, 2: 공연명, 3: 시작일
      }
    });
    
    // API 응답 처리
    if (response.data && response.data.response && response.data.response.perforList && 
        response.data.response.perforList.length > 0) {
      
      // 표준 형식으로 변환
      return response.data.response.perforList.map(item => ({
        id: `culture-${item.seq}`,
        title: item.title,
        description: item.contents || item.title,
        type: item.realmName || genre || '문화행사',
        image: item.thumbnail || '../assets/images/default-performance.jpg',
        location: item.place,
        date: `${formatDateToReadable(item.startDate)} ~ ${formatDateToReadable(item.endDate)}`,
        price: item.price || '가격 정보 없음',
        region: item.area || region || '전국',
        source: '문화포털',
        link: item.url || '#'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('문화포털 API 호출 중 오류:', error);
    return [];
  }
}

// 중복 공연 제거 함수
function removeDuplicates(performances) {
  const uniqueMap = new Map();
  
  performances.forEach(performance => {
    // ID가 있으면 ID로 중복 체크
    if (performance.id) {
      uniqueMap.set(performance.id, performance);
    } 
    // ID가 없으면 제목+장소 조합으로 중복 체크
    else if (performance.title && performance.location) {
      const key = `${performance.title}-${performance.location}`;
      uniqueMap.set(key, performance);
    }
  });
  
  return Array.from(uniqueMap.values());
}

// 샘플 공연 데이터 생성 함수
function generateSamplePerformances(region, genre, keyword) {
  // 기본 샘플 데이터
  const samplePerformances = [
    {
      id: 'sample-1',
      title: "봄날의 재즈 콘서트",
      description: "서울의 봄을 맞이하는 특별한 재즈 공연",
      type: "콘서트",
      image: "../assets/images/sample-performance-1.jpg",
      location: "서울 예술의전당",
      date: "2025-05-15 ~ 2025-05-16",
      price: "30,000원 ~ 80,000원",
      region: "서울",
      keywords: ["재즈", "음악", "서울", "봄", "콘서트"],
      source: "샘플 데이터",
      link: "https://www.sac.or.kr"
    },
    {
      id: 'sample-2',
      title: "오페라의 유령",
      description: "전 세계적으로 사랑받는 클래식 뮤지컬",
      type: "뮤지컬",
      image: "../assets/images/sample-performance-2.jpg",
      location: "부산 드림씨어터",
      date: "2025-06-10 ~ 2025-07-15",
      price: "50,000원 ~ 150,000원",
      region: "부산",
      keywords: ["뮤지컬", "클래식", "오페라", "부산"],
      source: "샘플 데이터",
      link: "https://www.musicalkorea.com"
    },
    {
      id: 'sample-3',
      title: "국악과 현대음악의 만남",
      description: "전통과 현대가 어우러진 특별한 국악 공연",
      type: "국악",
      image: "../assets/images/sample-performance-3.jpg",
      location: "국립국악원",
      date: "2025-05-20 ~ 2025-05-25",
      price: "20,000원 ~ 40,000원",
      region: "서울",
      keywords: ["국악", "전통", "현대음악", "서울", "퓨전", "가족"],
      source: "샘플 데이터",
      link: "https://www.gugak.go.kr"
    },
    {
      id: 'sample-4',
      title: "제주 봄 축제",
      description: "제주의 자연과 함께하는 음악 축제",
      type: "축제",
      image: "../assets/images/sample-performance-4.jpg",
      location: "제주 평화공원",
      date: "2025-05-01 ~ 2025-05-05",
      price: "무료",
      region: "제주",
      keywords: ["축제", "제주", "봄", "음악", "자연", "가족", "아이"],
      source: "샘플 데이터",
      link: "https://www.jejutour.go.kr"
    },
    {
      id: 'sample-5',
      title: "현대미술 특별전",
      description: "국내 유명 작가들의 현대미술 작품 전시",
      type: "전시",
      image: "../assets/images/sample-performance-5.jpg",
      location: "대구 미술관",
      date: "2025-04-20 ~ 2025-06-20",
      price: "15,000원",
      region: "대구",
      keywords: ["전시", "미술", "현대미술", "대구", "작가", "예술"],
      source: "샘플 데이터",
      link: "https://daeguartmuseum.org"
    }
  ];
  
  // 필터링 조건 적용
  let filteredPerformances = [...samplePerformances];
  
  // 지역 필터
  if (region) {
    filteredPerformances = filteredPerformances.filter(performance => 
      performance.region && performance.region.includes(region)
    );
  }
  
  // 장르 필터
  if (genre) {
    filteredPerformances = filteredPerformances.filter(performance => 
      performance.type && performance.type === genre
    );
  }
  
  // 키워드 필터
  if (keyword) {
    const searchTerm = keyword.toLowerCase();
    filteredPerformances = filteredPerformances.filter(performance => {
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
  
  return filteredPerformances;
}

// 날짜 형식 변환 함수 (YYYYMMDD)
function formatDateToYYYYMMDD(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

// 날짜 형식 변환 함수 (YYYY-MM-DD)
function formatDateToReadable(dateStr) {
  if (!dateStr) return '';
  
  // YYYYMMDD 형식 처리
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  
  // 이미 포맷된 날짜 처리
  if (dateStr.includes('-')) {
    return dateStr;
  }
  
  // 다른 형식은 그대로 반환
  return dateStr;
}

// KOPIS 지역 코드 매핑
function getKopisRegionCode(region) {
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

// KOPIS 장르 코드 매핑
function getKopisGenreCode(genre) {
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

// 서울시 API 장르 코드 매핑
function getSeoulGenreCode(genre) {
  const genreCodes = {
    '연극': '연극/뮤지컬',
    '뮤지컬': '연극/뮤지컬',
    '무용': '무용',
    '클래식': '클래식',
    '오페라': '오페라',
    '국악': '국악',
    '콘서트': '콘서트',
    '전시': '전시/미술'
  };
  
  return genreCodes[genre] || '';
}

// 한국관광공사 지역 코드 매핑
function getVisitKoreaRegionCode(region) {
  const regionCodes = {
    '서울': '1',
    '인천': '2',
    '대전': '3',
    '대구': '4',
    '광주': '5',
    '부산': '6',
    '울산': '7',
    '경기': '31',
    '강원': '32',
    '충청북도': '33',
    '충청남도': '34',
    '충청': '33', // 간단히 충북으로 매핑
    '경상북도': '35',
    '경상남도': '36',
    '경상': '35', // 간단히 경북으로 매핑
    '전라북도': '37',
    '전라남도': '38',
    '전라': '37', // 간단히 전북으로 매핑
    '제주': '39'
  };
  
  return regionCodes[region] || '';
}

// 한국관광공사 이벤트 타입 매핑
function getVisitKoreaEventType(genre) {
  const eventTypes = {
    '축제': '1', // 문화관광축제
    '공연': '2', // 공연/행사
    '전시': '3', // 전시회
    '콘서트': '2',
    '뮤지컬': '2',
    '연극': '2',
    '클래식': '2'
  };
  
  return eventTypes[genre] || '';
}

// 한국관광공사 콘텐츠 타입 to 장르 매핑
function mapVisitKoreaEventTypeToGenre(contentTypeId) {
  const typeMap = {
    '12': '관광지',
    '14': '문화시설',
    '15': '축제/공연/행사',
    '25': '여행코스',
    '28': '레포츠',
    '32': '숙박',
    '38': '쇼핑',
    '39': '음식'
  };
  
  return typeMap[contentTypeId] || '기타';
}

// 한국관광공사 지역 코드 to 지역명 매핑
function mapVisitKoreaAreaCodeToRegion(areaCode) {
  const regionMap = {
    '1': '서울',
    '2': '인천', 
    '3': '대전',
    '4': '대구',
    '5': '광주',
    '6': '부산',
    '7': '울산',
    '31': '경기도',
    '32': '강원도',
    '33': '충청북도',
    '34': '충청남도',
    '35': '경상북도',
    '36': '경상남도',
    '37': '전라북도',
    '38': '전라남도',
    '39': '제주도'
  };
  
  return regionMap[areaCode] || '전국';
}

// 문화포털 지역 코드 매핑
function getCultureRegionCode(region) {
  const regionCodes = {
    '서울': '서울',
    '경기': '경기',
    '인천': '인천',
    '강원': '강원',
    '충북': '충북',
    '충남': '충남',
    '충청': '충북', // 간단히 충북으로 매핑
    '대전': '대전',
    '전북': '전북',
    '전남': '전남',
    '전라': '전북', // 간단히 전북으로 매핑
    '광주': '광주',
    '경북': '경북',
    '경남': '경남',
    '경상': '경북', // 간단히 경북으로 매핑
    '대구': '대구',
    '부산': '부산',
    '울산': '울산',
    '제주': '제주'
  };
  
  return regionCodes[region] || '';
}

// 문화포털 장르 코드 매핑
function getCultureGenreCode(genre) {
  const genreCodes = {
    '연극': 'D000',
    '뮤지컬': 'D000',
    '무용': 'B000',
    '클래식': 'C000',
    '오페라': 'C000',
    '국악': 'A000',
    '콘서트': 'C000',
    '전시': 'G000',
    '축제': 'L000'
  };
  
  return genreCodes[genre] || '';
}