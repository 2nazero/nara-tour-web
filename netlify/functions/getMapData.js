// netlify/functions/getMapData.js - 수정된 버전 (전체 데이터 로딩)
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    // 쿼리 파라미터 가져오기
    const queryParams = event.queryStringParameters || {};
    const { 
      region = 'all', 
      categories = '', 
      minSatisfaction = '0',
      page = '1',
      limit = '50',
      loadType = 'all'
    } = queryParams;
    
    console.log('getMapData 함수 호출됨:', { region, categories, minSatisfaction, page, limit, loadType });
    
    // JSONL 파일 경로 (여러 경로 시도)
    const possiblePaths = [
      path.resolve('./data/ml_filtered_master_tourist_only.jsonl'),
      path.resolve('../data/ml_filtered_master_tourist_only.jsonl'),
      path.resolve('../../data/ml_filtered_master_tourist_only.jsonl'),
      path.resolve(process.cwd(), 'data/ml_filtered_master_tourist_only.jsonl')
    ];
    
    let dataPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        dataPath = testPath;
        console.log('데이터 파일 발견:', dataPath);
        break;
      }
    }
    
    if (!dataPath) {
      console.error('데이터 파일을 찾을 수 없습니다. 시도한 경로들:', possiblePaths);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: '데이터 파일을 찾을 수 없습니다.',
          attempted_paths: possiblePaths
        })
      };
    }
    
    // 파일 크기 확인
    const stats = fs.statSync(dataPath);
    console.log(`파일 크기: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    
    // 파일 읽기 (스트리밍 방식으로 처리)
    console.log('파일 읽기 시작...');
    const data = await processLargeJSONL(dataPath);
    console.log(`파싱 완료: ${data.length}개 레코드`);
    
    if (data.length === 0) {
      console.warn('파싱된 데이터가 없습니다.');
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: [],
          total: 0,
          message: '유효한 데이터가 없습니다.'
        })
      };
    }
    
    // 필터링 적용
    let filteredData = data;
    
    // 지역 필터
    if (region && region !== 'all') {
      filteredData = filteredData.filter(item => item.SIDO_NM === region);
      console.log(`지역 필터 적용 후: ${filteredData.length}개`);
    }
    
    // 카테고리 필터
    if (categories) {
      const categoryList = categories.split(',').filter(c => c.trim());
      if (categoryList.length > 0) {
        filteredData = filteredData.filter(item => 
          categoryList.includes(String(item.VISIT_AREA_TYPE_CD))
        );
        console.log(`카테고리 필터 적용 후: ${filteredData.length}개`);
      }
    }
    
    // 만족도 필터
    const minSat = parseFloat(minSatisfaction);
    if (minSat > 0) {
      filteredData = filteredData.filter(item => 
        (item.DGSTFN || 0) >= minSat
      );
      console.log(`만족도 필터 적용 후: ${filteredData.length}개`);
    }
    
    // 요청 타입에 따른 응답
    switch (loadType) {
      case 'map':
        return createMapResponse(filteredData);
      case 'stats':
        return createStatsResponse(filteredData);
      case 'list':
        return createListResponse(filteredData, parseInt(page), parseInt(limit));
      case 'all':
      default:
        return createAllDataResponse(filteredData);
    }

  } catch (error) {
    console.error('getMapData 함수 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};

// 대용량 JSONL 파일 처리 함수
async function processLargeJSONL(filePath) {
  const data = [];
  
  try {
    // 파일을 읽어서 라인별로 처리
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.trim().split('\n');
    
    console.log(`총 ${lines.length}개 라인 처리 시작`);
    
    let validCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue;
        
        const item = JSON.parse(line);
        
        // 필수 필드 검증
        if (item.X_COORD && item.Y_COORD && item.VISIT_AREA_NM && item.SIDO_NM) {
          // 데이터 정규화
          const processedItem = {
            id: item.VISIT_AREA_ID || `item_${i}`,
            name: item.VISIT_AREA_NM,
            region: item.SIDO_NM,
            category: parseInt(item.VISIT_AREA_TYPE_CD) || 0,
            satisfaction: parseFloat(item.DGSTFN) || 0,
            lat: parseFloat(item.Y_COORD),
            lng: parseFloat(item.X_COORD),
            address: item.ROAD_NM_ADDR || item.LOTNO_ADDR || '',
            visitDate: item.VISIT_START_YMD || '',
            stayTime: parseInt(item.RESIDENCE_TIME_MIN) || 0,
            
            // 원본 데이터도 포함
            ...item
          };
          
          data.push(processedItem);
          validCount++;
        }
      } catch (parseError) {
        errorCount++;
        if (errorCount < 10) { // 처음 10개 오류만 로그
          console.error(`라인 ${i} 파싱 오류:`, parseError.message);
        }
      }
      
      // 진행 상황 로그 (1000개마다)
      if (i % 1000 === 0) {
        console.log(`진행률: ${((i / lines.length) * 100).toFixed(1)}% (유효: ${validCount}, 오류: ${errorCount})`);
      }
    }
    
    console.log(`처리 완료 - 총: ${lines.length}, 유효: ${validCount}, 오류: ${errorCount}`);
    
  } catch (error) {
    console.error('파일 처리 중 오류:', error);
    throw error;
  }
  
  return data;
}
// 전체 데이터 응답 - 수정된 버전
function createAllDataResponse(data) {
  // 클라이언트에서 처리할 수 있도록 경량화된 데이터 전송
  // 원본 필드명을 유지하면서 필요한 필드만 전송
  const lightweightData = data.map(item => ({
    // 기본 식별자
    id: item.id,
    VISIT_AREA_ID: item.VISIT_AREA_ID || item.id,
    
    // 이름과 주소
    name: item.name,
    VISIT_AREA_NM: item.VISIT_AREA_NM || item.name,
    ROAD_NM_ADDR: item.ROAD_NM_ADDR || item.address,
    LOTNO_ADDR: item.LOTNO_ADDR || item.address,
    
    // 카테고리와 지역
    category: item.category,
    VISIT_AREA_TYPE_CD: item.VISIT_AREA_TYPE_CD || item.category,
    region: item.region,
    SIDO_NM: item.SIDO_NM || item.region,
    
    // 좌표
    lat: item.lat,
    lng: item.lng,
    Y_COORD: item.Y_COORD || item.lat,
    X_COORD: item.X_COORD || item.lng,
    YDNTS_VALUE: item.YDNTS_VALUE || item.Y_COORD || item.lat,
    XCNTS_VALUE: item.XCNTS_VALUE || item.X_COORD || item.lng,
    
    // 기타 정보
    satisfaction: item.satisfaction,
    DGSTFN: item.DGSTFN || item.satisfaction,
    address: item.address,
    visitDate: item.visitDate,
    stayTime: item.stayTime,
    RESIDENCE_TIME_MIN: item.RESIDENCE_TIME_MIN || item.stayTime
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      data: lightweightData,
      total: lightweightData.length,
      message: `${lightweightData.length}개 데이터 로드 완료`
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300' // 5분 캐시
    }
  };
}

// 리스트 응답 생성 (페이지네이션)
function createListResponse(data, page, limit) {
  // 만족도 기준으로 정렬
  const sortedData = data.sort((a, b) => (b.satisfaction || 0) - (a.satisfaction || 0));
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const pageData = sortedData.slice(startIndex, endIndex);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      data: pageData,
      pagination: {
        current: page,
        total: Math.ceil(data.length / limit),
        hasNext: endIndex < data.length,
        totalItems: data.length
      }
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  };
}

// 지도용 응답 생성
function createMapResponse(data) {
  const mapData = data.map(item => ({
    id: item.id,
    name: item.name,
    lat: item.lat,
    lng: item.lng,
    category: item.category,
    satisfaction: item.satisfaction
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      markers: mapData,
      count: mapData.length
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600'
    }
  };
}

// 통계용 응답 생성
function createStatsResponse(data) {
  // 카테고리별 통계
  const categoryStats = {};
  const satisfactionStats = [0, 0, 0, 0, 0]; // 1-5점
  
  data.forEach(item => {
    // 카테고리 통계
    const category = item.category;
    categoryStats[category] = (categoryStats[category] || 0) + 1;
    
    // 만족도 통계
    const satisfaction = Math.floor(item.satisfaction);
    if (satisfaction >= 1 && satisfaction <= 5) {
      satisfactionStats[satisfaction - 1]++;
    }
  });
  
  // 인기 여행지 TOP 5
  const topPlaces = data
    .filter(item => item.satisfaction > 0)
    .sort((a, b) => b.satisfaction - a.satisfaction)
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      name: item.name,
      region: item.region,
      category: item.category,
      satisfaction: item.satisfaction
    }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      categoryStats,
      satisfactionStats,
      topPlaces,
      totalCount: data.length
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600'
    }
  };
}