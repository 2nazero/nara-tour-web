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
};