// netlify/functions/getPerformances.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    // 쿼리 파라미터 파싱
    const queryParams = event.queryStringParameters || {};
    let { region, genre, keyword, page = '1', limit = '9', startDate = '', endDate = '' } = queryParams;
    
    // 한국관광공사 API 키 (인코딩된 키)
    const TOUR_API_KEY = 'Tu0trZCGNDsho41DoZ5s3owOJnzOMKG8YkTf0tI6O5gEgXhWZModqYaIZ2ZsnYOFBkjMT%2FYN%2F3AO8xVidwReOA%3D%3D';
    
    console.log('API 키 확인:', TOUR_API_KEY ? '키가 설정됨' : '키가 없음');
    
    // 날짜 포맷 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formattedStartDate = startDate ? startDate.replace(/-/g, '') : '';
    const formattedEndDate = endDate ? endDate.replace(/-/g, '') : '';
    
    // 현재 날짜 구하기 (YYYYMMDD 형식) - 시작일이 지정되지 않은 경우 사용
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // 지역 코드 매핑
    const regionCode = getRegionCode(region);
    console.log('지역 코드:', regionCode, '지역:', region);

    // 한국관광공사 Tour API 호출
    console.log('Tour API 호출 시작...');
    
    try {
      // 파이썬 테스트와 동일한 방식으로 API 호출 구성
      const baseUrl = 'http://apis.data.go.kr/B551011/KorService2/searchFestival2';
      
      // 파라미터 구성 (URL에 직접 추가할 쿼리스트링)
      let queryParams = [
        `serviceKey=${TOUR_API_KEY}`, // 이미 인코딩된 키 사용
        `MobileOS=ETC`,
        `MobileApp=FestivalChecker`,  // 파이썬 테스트와 동일한 앱 이름
        `eventStartDate=${formattedStartDate || today}`, // 시작일이 있으면 사용, 없으면 오늘 날짜 사용
        `pageNo=${page}`,
        `numOfRows=${limit}`,
        `arrange=A`,
        `_type=json`
      ];
      
      // 종료일이 있는 경우 추가
      if (formattedEndDate) {
        queryParams.push(`eventEndDate=${formattedEndDate}`);
      }
      
      // 지역 코드가 있는 경우 추가
      if (regionCode) {
        queryParams.push(`areaCode=${regionCode}`);
      }
      
      // 키워드가 있는 경우 추가 (인코딩 필요)
      if (keyword) {
        queryParams.push(`keyword=${encodeURIComponent(keyword)}`);
      }
      
      // 쿼리스트링 조합
      const queryString = queryParams.join('&');
      const fullUrl = `${baseUrl}?${queryString}`;
      
      console.log('API 요청 URL:', fullUrl);
      
      // API 호출 - axios로 직접 호출 (서버리스 함수에서는 CORS 제한 없음)
      const response = await axios.get(fullUrl, {
        timeout: 10000,
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });
      
      console.log('API 응답 상태:', response.status);
      
      // 응답 구조 확인 및 파싱
      if (response.data && 
          response.data.response && 
          response.data.response.header &&
          response.data.response.header.resultCode === '0000') { // 성공 코드 확인
        
        const body = response.data.response.body;
        console.log('총 결과 수:', body?.totalCount || 0);
        
        if (body && body.items && body.items.item) {
          // 결과 항목 처리
          const items = body.items.item;
          // 단일 항목 또는 배열 처리
          const itemsArray = Array.isArray(items) ? items : [items];
          
          console.log(`${itemsArray.length}개의 결과 발견`);
          
          // API 응답 데이터를 애플리케이션 형식에 맞게 변환
          const performances = itemsArray.map((item, index) => {
            // 키워드 자동 추출
            const extractedKeywords = extractKeywordsFromText(item.title, item.overview);
            
            return {
              id: `tour-${item.contentid || index}`,
              title: item.title || `행사 ${index + 1}`,
              description: item.overview || `${item.title || '행사'}에 대한 상세 정보입니다.`,
              type: genre || '축제/행사',
              image: item.firstimage || "/assets/images/default-performance.png",
              location: item.addr1 || '위치 정보 없음',
              date: formatEventDate(item.eventstartdate, item.eventenddate),
              price: estimatePrice(item.title, item.overview), // 가격 추정
              region: getRegionName(item.areacode, item.sigungucode),
              source: "한국관광공사",
              link: `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${item.contentid}`,
              tel: item.tel || '연락처 정보 없음',
              keywords: extractedKeywords
            };
          });
          
          console.log('변환된 데이터 수:', performances.length);
          
          // 검색 통계 생성
          const stats = generateSearchStats(performances);
          
          // 페이지네이션 정보 추가
          const result = {
            performances: performances,
            pagination: {
              currentPage: parseInt(page),
              pageSize: parseInt(limit),
              totalCount: body.totalCount || 0,
              totalPages: Math.ceil((body.totalCount || 0) / parseInt(limit))
            },
            stats: stats
          };
          
          // 성공 응답 반환
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
          };
        } else {
          console.log('API 응답에 항목이 없음');
        }
      } else {
        console.log('API 응답 오류 또는 실패:', 
          response.data?.response?.header?.resultCode, 
          response.data?.response?.header?.resultMsg);
        console.log('응답 데이터 일부:', JSON.stringify(response.data).substring(0, 300) + '...');
      }
    } catch (apiError) {
      console.error('API 호출 오류:', apiError.message);
      if (apiError.response) {
        console.error('API 오류 상태:', apiError.response.status);
        console.error('API 오류 데이터:', JSON.stringify(apiError.response.data || {}).substring(0, 300));
      } else if (apiError.request) {
        console.error('API 요청은 보냈으나 응답 없음:', apiError.request);
      } else {
        console.error('API 요청 구성 중 오류:', apiError.message);
      }
    }
    
    // API 호출 실패 시 샘플 데이터 반환
    console.log('API 호출 실패, 샘플 데이터 반환');
    const sampleData = generateSamplePerformances(region, genre, keyword);
    
    // 샘플 데이터에 키워드 추가
    const enhancedSampleData = sampleData.map(item => {
      if (!item.keywords) {
        item.keywords = extractKeywordsFromText(item.title, item.description);
      }
      return item;
    });
    
    // 검색 통계 생성
    const sampleStats = generateSearchStats(enhancedSampleData);
    
    const result = {
      performances: enhancedSampleData,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
        totalCount: enhancedSampleData.length,
        totalPages: Math.ceil(enhancedSampleData.length / parseInt(limit))
      },
      stats: sampleStats
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('함수 실행 중 오류:', error.message);
    
    // 오류 발생 시 샘플 데이터 반환
    const sampleData = generateSamplePerformances();
    
    // 샘플 데이터에 키워드 추가
    const enhancedSampleData = sampleData.map(item => {
      if (!item.keywords) {
        item.keywords = extractKeywordsFromText(item.title, item.description);
      }
      return item;
    });
    
    // 검색 통계 생성
    const sampleStats = generateSearchStats(enhancedSampleData);
    
    const result = {
      performances: enhancedSampleData,
      pagination: {
        currentPage: 1,
        pageSize: 9,
        totalCount: enhancedSampleData.length,
        totalPages: Math.ceil(enhancedSampleData.length / 9)
      },
      stats: sampleStats
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  }
};

// 텍스트에서 키워드 추출 함수
function extractKeywordsFromText(title = '', description = '') {
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

// 검색 통계 생성 함수
function generateSearchStats(performances) {
  if (!performances || performances.length === 0) {
    return {
      total: 0,
      regions: 0,
      types: 0,
      currentMonth: 0
    };
  }
  
  // 지역 수
  const uniqueRegions = new Set();
  // 공연 유형 수
  const uniqueTypes = new Set();
  // 이번 달 공연 수
  let currentMonthCount = 0;
  
  // 현재 년월
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  performances.forEach(performance => {
    // 지역 카운트
    if (performance.region) {
      uniqueRegions.add(performance.region);
    }
    
    // 공연 유형 카운트
    if (performance.type) {
      uniqueTypes.add(performance.type);
    }
    
    // 이번 달 공연 카운트
    if (performance.date) {
      const dateMatch = performance.date.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const perfYear = parseInt(dateMatch[1]);
        const perfMonth = parseInt(dateMatch[2]);
        
        if (perfYear === currentYear && perfMonth === currentMonth) {
          currentMonthCount++;
        }
      }
    }
  });
  
  return {
    total: performances.length,
    regions: uniqueRegions.size,
    types: uniqueTypes.size,
    currentMonth: currentMonthCount
  };
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
  if (!region) return null;
  
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
  
  return regionCodes[region];
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

// 샘플 공연 데이터 생성 (API 호출 실패 시 대체용)
function generateSamplePerformances(region, genre, keyword) {
  // 샘플 데이터 배열
  const samplePerformances = [
    {
      id: 'sample-1',
      title: "가평군 반려동물 문화행사 활짝펫",
      description: "반려동물과 함께하는 다양한 체험 행사와 공연이 준비되어 있습니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/40/3490940_image2_1.jpg",
      location: "경기도 가평군 가평읍 자라섬로 60",
      date: "2025-06-07 ~ 2025-06-07",
      price: "무료(추정)",
      region: "경기도",
      tel: "070-8233-0333",
      source: "샘플 데이터",
      link: "#",
      keywords: ["반려동물", "체험", "가족"]
    },
    {
      id: 'sample-2',
      title: "강릉단오제",
      description: "우리나라를 대표하는 전통 문화축제로, 강릉의 역사와 문화를 체험할 수 있는 다양한 행사가 열립니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/54/3484354_image2_1.jpg",
      location: "강원특별자치도 강릉시 단오장길 1",
      date: "2025-05-27 ~ 2025-06-03",
      price: "무료(추정)",
      region: "강원도",
      tel: "033-641-1593",
      source: "샘플 데이터",
      link: "#",
      keywords: ["전통", "문화", "단오"]
    },
    {
      id: 'sample-3',
      title: "강릉커피축제",
      description: "국내 최고의 커피 명소 강릉에서 열리는 커피 축제로, 다양한 커피를 맛볼 수 있고 바리스타 경연대회 등이 열립니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/26/3370626_image2_1.jpg",
      location: "강원특별자치도 강릉시 창해로14번길 20-1 (견소동)",
      date: "2025-10-23 ~ 2025-10-26",
      price: "무료(추정)",
      region: "강원도",
      tel: "033-647-6802",
      source: "샘플 데이터",
      link: "#",
      keywords: ["커피", "음식", "체험"]
    },
    {
      id: 'sample-4',
      title: "강서 아이들 까치까치 페스티벌",
      description: "어린이들을 위한 다양한 체험과, 공연이 펼쳐지는 축제입니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/73/3489673_image2_1.JPG",
      location: "서울특별시 강서구 우장산로 66 (내발산동)",
      date: "2025-05-24 ~ 2025-05-24",
      price: "무료(추정)",
      region: "서울",
      tel: "02-2600-6970",
      source: "샘플 데이터",
      link: "#",
      keywords: ["아동", "체험", "가족"]
    },
    {
      id: 'sample-5',
      title: "강서구 다문화축제",
      description: "다양한 문화를 체험하고 즐길 수 있는 다문화 축제입니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/01/3489701_image2_1.jpg",
      location: "서울특별시 강서구 강서로5길 50 (화곡동)",
      date: "2025-05-24 ~ 2025-05-24",
      price: "무료(추정)",
      region: "서울",
      tel: "02-2600-6763",
      source: "샘플 데이터",
      link: "#",
      keywords: ["다문화", "체험", "문화"]
    },
    {
      id: 'sample-6',
      title: "경기미 김밥페스타",
      description: "경기미를 활용한 다양한 김밥을 맛볼 수 있는 음식 축제입니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/23/3486723_image2_1.jpg",
      location: "경기도 수원시 영통구 광교중앙로 140 (하동) 수원컨벤션센터 제2전시장",
      date: "2025-06-21 ~ 2025-06-21",
      price: "무료(추정)",
      region: "경기도",
      tel: "031-774-3312",
      source: "샘플 데이터",
      link: "#",
      keywords: ["김밥", "음식", "체험"]
    },
    {
      id: 'sample-7',
      title: "경남고성공룡세계엑스포",
      description: "공룡 화석지로 유명한 고성에서 개최되는 공룡 테마 엑스포입니다.",
      type: "전시",
      image: "http://tong.visitkorea.or.kr/cms/resource/62/2987562_image2_1.png",
      location: "경상남도 고성군 당항만로 1116 당항포관광지",
      date: "2025-10-01 ~ 2025-11-09",
      price: "유료(추정)",
      region: "경상남도",
      tel: "055-670-7400",
      source: "샘플 데이터",
      link: "#",
      keywords: ["공룡", "체험", "가족"]
    },
    {
      id: 'sample-8',
      title: "경복궁 생과방",
      description: "경복궁에서 진행되는 전통 간식을 체험할 수 있는 문화 행사입니다.",
      type: "체험",
      image: "http://tong.visitkorea.or.kr/cms/resource/99/2962999_image2_1.jpg",
      location: "서울특별시 종로구 사직로 161 (세종로)",
      date: "2025-04-16 ~ 2025-06-23",
      price: "유료(추정)",
      region: "서울",
      tel: "1522-2295",
      source: "샘플 데이터",
      link: "#",
      keywords: ["전통", "음식", "체험"]
    },
    {
      id: 'sample-9',
      title: "경산자인단오제",
      description: "전통 단오제를 현대적으로 재해석한 지역 축제입니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/99/2718299_image2_1.jpg",
      location: "경상북도 경산시 자인면 계정길 68 계정숲",
      date: "2025-05-30 ~ 2025-06-01",
      price: "무료(추정)",
      region: "경상북도",
      tel: "053-856-5765",
      source: "샘플 데이터",
      link: "#",
      keywords: ["단오", "전통", "체험"]
    },
    {
      id: 'sample-10',
      title: "경춘선 공릉숲길 커피축제",
      description: "공릉숲길에서 펼쳐지는 커피 축제로, 다양한 커피를 맛보고 문화 공연을 즐길 수 있습니다.",
      type: "축제",
      image: "http://tong.visitkorea.or.kr/cms/resource/14/3490514_image2_1.jpg",
      location: "서울특별시 노원구 동일로 지하1074 (공릉동) 공릉역 2번 출구 일대",
      date: "2025-06-07 ~ 2025-06-08",
      price: "무료(추정)",
      region: "서울",
      tel: "02-976-9110",
      source: "샘플 데이터",
      link: "#",
      keywords: ["커피", "음식", "문화"]
    }
  ];

  // 필터링 적용 (지역, 장르, 키워드)
  let filteredSamples = [...samplePerformances];
  
  if (region) {
    filteredSamples = filteredSamples.filter(item => item.region.includes(region));
  }
  
  if (genre) {
    filteredSamples = filteredSamples.filter(item => item.type === genre);
  }
  
  if (keyword) {
    const searchTerm = keyword.toLowerCase();
    filteredSamples = filteredSamples.filter(item => 
      item.title.toLowerCase().includes(searchTerm) || 
      item.description.toLowerCase().includes(searchTerm) ||
      (item.keywords && item.keywords.some(k => k.toLowerCase().includes(searchTerm)))
    );
  }
  
  // 필터링 결과가 없으면 전체 데이터 반환
  return filteredSamples.length > 0 ? filteredSamples : samplePerformances;
}