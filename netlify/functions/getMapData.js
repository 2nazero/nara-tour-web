// netlify/functions/getMapData.js
exports.handler = async function(event, context) {
    // 환경 변수에서 API 키 가져오기
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    // API 키 검증
    if (!GOOGLE_MAPS_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' })
      };
    }
    
    // 성공적으로 API 키를 반환
    return {
      statusCode: 200,
      body: JSON.stringify({
        apiKey: GOOGLE_MAPS_API_KEY
      }),
      headers: {
        'Cache-Control': 'no-store, max-age=0' // 캐싱 방지
      }
    };
  };