// netlify/functions/recommendPerformances.js
const axios = require('axios');

exports.handler = async function(event, context) {
  // API 키를 환경 변수에서 가져옵니다
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API 키가 설정되지 않았습니다.' })
    };
  }
  
  try {
    // POST 요청의 본문에서 사용자 선호도 가져오기
    const userPreferences = JSON.parse(event.body || '{}');
    const { region = '서울', genre = '뮤지컬', keyword = '' } = userPreferences;
    
    // OpenAI API 호출
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "당신은 한국의 문화 공연을 추천해주는 전문가입니다. 공연의 제목, 설명, 장소, 기간과 같은 정보를 명확하게 제공해주세요."
          },
          {
            role: "user",
            content: `지역: ${region}, 장르: ${genre}${keyword ? ', 키워드: ' + keyword : ''}에 맞는 공연을 5개 추천해주세요. 각 공연에 대해 제목, 간단한 설명, 공연 장소, 공연 기간, 티켓 가격 범위를 포함해주세요. JSON 형식으로 응답해주세요.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // 응답 구문 분석 및 반환
    const result = response.data.choices[0].message.content;
    let parsedResult;
    
    try {
      // JSON으로 구문 분석 시도
      parsedResult = JSON.parse(result);
    } catch (jsonError) {
      // JSON 분석 실패 시 텍스트 그대로 반환
      parsedResult = { text: result };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(parsedResult),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '공연 추천을 가져오는 중 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};