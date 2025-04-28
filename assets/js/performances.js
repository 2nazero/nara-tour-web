// 전역 변수들
let currentPerformances = [];
let currentRecommendations = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
  // 초기 공연 데이터 로드
  loadPerformances();

  // 필터 폼 이벤트 리스너
  const filterForm = document.getElementById('performance-filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', function(event) {
      event.preventDefault();
      filterPerformances();
    });
  }

  // AI 추천 버튼 이벤트 리스너
  const aiRecommendButton = document.getElementById('get-ai-recommendations');
  if (aiRecommendButton) {
    aiRecommendButton.addEventListener('click', function() {
      const keywordInput = document.getElementById('keyword-input');
      const keyword = keywordInput ? keywordInput.value.trim() : '';
      
      if (!keyword) {
        showAlert('키워드를 입력해주세요.', 'warning');
        return;
      }
      
      // 현재 선택된 지역과 유형 가져오기
      const region = document.getElementById('region').value;
      const performanceType = document.getElementById('performance-type').value;
      
      // 키워드를 포함하여 추천 요청
      getAIRecommendations(region, performanceType, keyword);
    });
  }

  // 최신 공연 소식 로드
  loadLatestNews();
});

// 공연 정보 로드
async function loadPerformances() {
  const performancesContainer = document.getElementById('performances-container');
  
  // 로딩 표시
  showLoading(performancesContainer, '공연 정보를 불러오는 중...');
  
  try {
    // API 호출 시도
    try {
      const response = await fetch('/.netlify/functions/getPerformances');
      
      if (response.ok) {
        const data = await response.json();
        currentPerformances = data;
        displayPerformances(data);
        showAlert(`${data.length}개의 공연 정보를 불러왔습니다.`, 'success');
        return;
      } else {
        const errorData = await response.text();
        console.error('API 응답 오류:', response.status, errorData);
        throw new Error('서버 응답 오류: ' + response.status);
      }
    } catch (apiError) {
      console.error('API 호출 오류:', apiError);
      // API 호출 실패 시 계속 진행하여 샘플 데이터 사용
    }
    
    // API 호출 실패 시 샘플 데이터 표시
    currentPerformances = generateSamplePerformances();
    displayPerformances(currentPerformances);
    showAlert('API 연결 오류로 샘플 데이터를 표시합니다.', 'warning');
  } catch (error) {
    console.error('공연 정보를 불러오는 중 오류가 발생했습니다:', error);
    
    // 오류 발생 시 샘플 데이터 표시
    currentPerformances = generateSamplePerformances();
    displayPerformances(currentPerformances);
    showAlert('오류가 발생하여 샘플 데이터를 표시합니다.', 'warning');
  }
}

// AI 맞춤 추천 가져오기
async function getAIRecommendations(region, genre, keyword) {
  const performancesContainer = document.getElementById('performances-container');
  
  // 로딩 표시
  showLoading(performancesContainer, `키워드 "${keyword}"에 대한 맞춤 공연을 찾고 있습니다...`);
  
  try {
    // Netlify 함수 호출
    const response = await fetch('/.netlify/functions/recommendPerformances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        region: region,
        genre: genre,
        keyword: keyword
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('API 응답 오류:', response.status, errorData);
      throw new Error('서버 응답 오류: ' + response.status);
    }
    
    const data = await response.json();
    
    // 응답 데이터 형식에 따라 처리
    if (Array.isArray(data)) {
      currentRecommendations = data;
      displayPerformances(data);
      showAlert(`"${keyword}" 키워드에 맞는 ${data.length}개의 공연을 찾았습니다.`, 'success');
    } else if (data.text) {
      displayTextRecommendations(data.text, keyword);
    } else {
      throw new Error('유효하지 않은 응답 형식');
    }
  } catch (error) {
    console.error('추천을 가져오는 중 오류가 발생했습니다:', error);
    
    // 로컬 데이터에서 키워드 필터링 시도
    const filteredResults = filterLocalData(currentPerformances, {
      region: region,
      genre: genre,
      keyword: keyword
    });
    
    if (filteredResults.length > 0) {
      currentRecommendations = filteredResults;
      displayPerformances(filteredResults);
      showAlert(`로컬 데이터에서 "${keyword}" 관련 공연을 ${filteredResults.length}개 찾았습니다.`, 'info');
    } else {
      displayTextRecommendations(generateFallbackAIResponse(keyword, region, genre), keyword);
    }
  }
}

// 로컬 데이터 필터링
function filterLocalData(data, params = {}) {
  if (!data || !Array.isArray(data)) return [];
  
  let filtered = [...data];
  
  // 지역 필터
  if (params.region) {
    filtered = filtered.filter(item => 
      item.region && item.region.includes(params.region)
    );
  }
  
  // 장르 필터
  if (params.genre) {
    filtered = filtered.filter(item => 
      item.type && item.type === params.genre
    );
  }
  
  // 키워드 필터
  if (params.keyword) {
    const searchTerm = params.keyword.toLowerCase();
    filtered = filtered.filter(item => {
      const searchableText = [
        item.title || '',
        item.description || '',
        item.type || '',
        item.location || '',
        item.region || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }
  
  return filtered;
}

// 공연 필터링
function filterPerformances() {
  const region = document.getElementById('region').value;
  const performanceType = document.getElementById('performance-type').value;
  
  // 필터링 적용
  const filteredPerformances = filterLocalData(currentPerformances, {
    region: region,
    genre: performanceType
  });
  
  // 필터링 결과 표시
  if (filteredPerformances.length > 0) {
    displayPerformances(filteredPerformances);
    showAlert(`${filteredPerformances.length}개의 공연이 필터링되었습니다.`, 'success');
  } else {
    // 필터링 결과가 없을 때
    const performancesContainer = document.getElementById('performances-container');
    performancesContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>필터 조건에 맞는 공연이 없습니다.
          <div class="mt-3">
            <button class="btn btn-outline-primary btn-sm" onclick="loadPerformances()">모든 공연 보기</button>
          </div>
        </div>
      </div>
    `;
  }
}

// 대체 AI 응답 생성
function generateFallbackAIResponse(keyword, region, genre) {
  const templates = [
    `안녕하세요, "${keyword}" 키워드로 검색한 결과입니다.\n\n현재 "${keyword}"와 관련된 공연 정보를 찾을 수 없습니다. ${region ? `${region} 지역의 ` : ''}${genre ? `${genre} 장르의 ` : ''}공연 정보가 업데이트되면 알려드리겠습니다.\n\n다른 키워드로 검색해보시는 것은 어떨까요? 인기 있는 키워드로는 "클래식", "뮤지컬", "재즈", "가족", "전시" 등이 있습니다.`,
    
    `"${keyword}" 관련 공연을 찾고 계시는군요!\n\n아쉽게도 현재 "${keyword}"와 정확히 일치하는 공연은 등록되어 있지 않습니다. ${region ? `${region} 지역에서는 ` : ''}다양한 공연이 예정되어 있으니 조금 더 넓은 키워드로 검색해보세요.\n\n추천 키워드: 음악, 콘서트, 전시, 축제, 가족, 클래식`,
    
    `"${keyword}"에 관심이 있으시군요!\n\n현재 DB에 "${keyword}" 관련 공연이 없지만, 비슷한 관심사를 가진 분들이 많이 찾는 공연으로는 다음과 같은 것들이 있습니다:\n\n1. 클래식 오케스트라 정기 공연\n2. 현대미술 특별전\n3. 국악과 현대음악의 만남\n\n다른 키워드로 검색하시거나, 곧 업데이트될 새로운 공연 정보를 기대해주세요!`
  ];
  
  // 랜덤하게 템플릿 선택
  return templates[Math.floor(Math.random() * templates.length)];
}

// 공연 정보 표시
function displayPerformances(performancesList) {
  const performancesContainer = document.getElementById('performances-container');
  
  if (!performancesList || performancesList.length === 0) {
    performancesContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>현재 표시할 공연 정보가 없습니다.
          <div class="mt-3">
            <button class="btn btn-outline-primary btn-sm" onclick="loadPerformances()">공연 정보 새로고침</button>
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  performancesList.forEach(performance => {
    // 기본 이미지 설정 (로컬 경로 사용)
    const imageUrl = '../assets/images/default-performance.png';
    
    // 소스 표시 (API 또는 샘플 데이터)
    const sourceLabel = performance.source 
      ? `<span class="badge bg-secondary source-badge">${performance.source}</span>` 
      : '';
    
    html += `
      <div class="col-md-4 mb-4">
        <div class="card h-100 performance-card">
          <div class="card-img-top-container" style="height: 200px; overflow: hidden; position: relative;">
            <img src="${imageUrl}" class="card-img-top" alt="${performance.title}" 
                 style="width: 100%; height: 100%; object-fit: cover;">
            ${sourceLabel}
          </div>
          <div class="card-body">
            <span class="badge bg-primary mb-2">${performance.type || '기타'}</span>
            <h5 class="card-title">${performance.title}</h5>
            <p class="card-text text-truncate">${performance.description || '설명이 없습니다.'}</p>
            <p class="card-text"><i class="fas fa-map-marker-alt me-2"></i>${performance.location || '위치 정보 없음'}</p>
            <p class="card-text"><i class="fas fa-calendar me-2"></i>${performance.date || '날짜 정보 없음'}</p>
          </div>
          <div class="card-footer bg-white border-top-0">
            <button class="btn btn-outline-primary btn-sm w-100" 
                    onclick="showPerformanceDetails('${performance.id}')"
                    data-performance-id="${performance.id}">
              상세정보 보기
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  performancesContainer.innerHTML = html;
}

// 텍스트 형식의 추천 결과 표시
function displayTextRecommendations(text, keyword) {
  const performancesContainer = document.getElementById('performances-container');
  
  // 텍스트를 카드 형태로 표시
  performancesContainer.innerHTML = `
    <div class="col-12">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <i class="fas fa-robot me-2"></i>AI 맞춤 추천: "${keyword}"
        </div>
        <div class="card-body">
          <div class="ai-response">
            ${formatAIResponse(text)}
          </div>
          <div class="mt-4">
            <button class="btn btn-outline-primary" onclick="loadPerformances()">모든 공연 보기</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// AI 응답 텍스트 포맷팅 (줄바꿈, 강조 등)
function formatAIResponse(text) {
  if (!text) return '';
  
  // 줄바꿈 처리
  let formatted = text.replace(/\n/g, '<br>');
  
  // 제목 강조 (예: [제목] 또는 **제목** 형식)
  formatted = formatted.replace(/\[([^\]]+)\]/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 링크 처리
  formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  
  return formatted;
}

// 공연 상세 정보 표시
function showPerformanceDetails(performanceId) {
  // 전체 공연 목록에서 해당 ID를 가진 공연 찾기
  const allPerformances = [...currentPerformances, ...currentRecommendations];
  const performance = allPerformances.find(p => String(p.id) === String(performanceId));
  
  if (!performance) {
    console.error('공연 정보를 찾을 수 없습니다:', performanceId);
    showAlert('공연 정보를 찾을 수 없습니다.', 'danger');
    return;
  }
  
  // 모달 내용 생성
  const modalContent = document.getElementById('performance-modal-content');
  
  // 소스 라벨 생성
  const sourceLabel = performance.source 
    ? `<span class="badge bg-secondary mt-2">출처: ${performance.source}</span>` 
    : '';
  
  // 링크 생성
  const linkButton = performance.link && performance.link !== '#' 
    ? `<a href="${performance.link}" target="_blank" class="btn btn-primary">
         <i class="fas fa-ticket-alt me-2"></i>예매하기
       </a>` 
    : '';
  
  // 지도 보기 버튼 (카카오맵)
  const mapButton = performance.location 
    ? `<a href="https://map.kakao.com/?q=${encodeURIComponent(performance.location)}" 
         target="_blank" class="btn btn-outline-success ms-2">
         <i class="fas fa-map-marked-alt me-2"></i>지도 보기
       </a>` 
    : '';
    
  
  // 기본 이미지 설정
  const imageUrl = '../assets/images/default-performance.png';
  
  modalContent.innerHTML = `
    <div class="row">
      <div class="col-md-5">
        <img src="${imageUrl}" class="img-fluid rounded" alt="${performance.title}">
        ${sourceLabel}
      </div>
      <div class="col-md-7">
        <h3>${performance.title}</h3>
        <p class="badge bg-primary">${performance.type || '기타'}</p>
        <p class="description">${performance.description || '설명이 없습니다.'}</p>
        
        <div class="details mt-4">
          <p><i class="fas fa-map-marker-alt me-2"></i> <strong>장소:</strong> ${performance.location || '위치 정보 없음'}</p>
          <p><i class="fas fa-calendar me-2"></i> <strong>날짜:</strong> ${performance.date || '날짜 정보 없음'}</p>
          <p><i class="fas fa-won-sign me-2"></i> <strong>가격:</strong> ${performance.price || '가격 정보 없음'}</p>
          <p><i class="fas fa-map me-2"></i> <strong>지역:</strong> ${performance.region || '지역 정보 없음'}</p>
        </div>
        
        <div class="mt-4">
          ${linkButton}
          ${mapButton}
          <button class="btn btn-outline-primary ms-2" onclick="sharePerformance('${performanceId}')">
            <i class="fas fa-share-alt me-2"></i>공유하기
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 모달 표시
  const performanceModal = new bootstrap.Modal(document.getElementById('performanceModal'));
  performanceModal.show();
}

// 공연 정보 공유
function sharePerformance(performanceId) {
  // 현재 페이지 URL + 공연 ID 파라미터
  const shareUrl = `${window.location.origin}${window.location.pathname}?id=${performanceId}`;
  
  // 공유하기 API 지원 확인
  if (navigator.share) {
    // 공연 정보 찾기
    const allPerformances = [...currentPerformances, ...currentRecommendations];
    const performance = allPerformances.find(p => String(p.id) === String(performanceId));
    
    if (performance) {
      navigator.share({
        title: `${performance.title} - 나라투어 공연 정보`,
        text: `${performance.title}\n${performance.location}, ${performance.date}\n${performance.description || ''}`,
        url: shareUrl
      })
      .then(() => console.log('공유 성공'))
      .catch((error) => console.log('공유 에러', error));
    } else {
      // 클립보드 복사로 대체
      copyToClipboard(shareUrl);
    }
  } else {
    // 공유 API를 지원하지 않는 경우 클립보드 복사
    copyToClipboard(shareUrl);
  }
}

// 클립보드에 복사
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showAlert('링크가 클립보드에 복사되었습니다.', 'success');
      })
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
        showAlert('클립보드 복사에 실패했습니다.', 'danger');
      });
  } else {
    // 구형 브라우저 지원
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      showAlert('링크가 클립보드에 복사되었습니다.', 'success');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      showAlert('클립보드 복사에 실패했습니다.', 'danger');
    }
    
    document.body.removeChild(textArea);
  }
}

// 최신 공연 소식 로드
function loadLatestNews() {
  const newsContainer = document.getElementById('performance-news');
  
  if (!newsContainer) return;
  
  try {
    // 샘플 뉴스 데이터 사용
    const newsItems = [
      {
        title: '여름 음악 축제 일정 발표',
        date: '2025-04-15',
        summary: '2025년 여름 음악 축제 일정이 발표되었습니다. 올해는 총 15개 도시에서 다양한 장르의 음악 축제가 개최됩니다.',
        source: '문화체육관광부'
      },
      {
        title: '해외 유명 뮤지컬 내한 공연 예정',
        date: '2025-04-10',
        summary: '브로드웨이의 인기 뮤지컬이 오는 7월 한국 관객을 찾아옵니다. 티켓 예매는 5월부터 시작될 예정입니다.',
        source: '공연예술통합전산망'
      },
      {
        title: '국립극장 시설 리모델링 완료',
        date: '2025-04-05',
        summary: '6개월간의 리모델링 공사를 마친 국립극장이 5월부터 다시 문을 엽니다. 새로운 음향 시스템과 좌석이 설치되었습니다.',
        source: '국립극장'
      }
    ];
    
    // 뉴스 HTML 생성
    let newsHtml = '<div class="row">';
    
    newsItems.forEach(item => {
      const newsDate = new Date(item.date);
      const formattedDate = newsDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // 소스 표시
      const sourceLabel = item.source ? `<small class="text-muted">출처: ${item.source}</small>` : '';
      
      newsHtml += `
        <div class="col-md-4 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">${item.title}</h5>
              <p class="card-text text-muted"><small>${formattedDate}</small></p>
              <p class="card-text">${item.summary}</p>
              ${sourceLabel}
            </div>
          </div>
        </div>
      `;
    });
    
    newsHtml += '</div>';
    newsContainer.innerHTML = newsHtml;
    
  } catch (error) {
    console.error('뉴스를 불러오는 중 오류가 발생했습니다:', error);
    newsContainer.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle me-2"></i>최신 소식을 불러오는 데 실패했습니다.
        <button class="btn btn-sm btn-outline-warning ms-3" onclick="loadLatestNews()">다시 시도</button>
      </div>
    `;
  }
}

// 예시 공연 데이터 생성 (API 호출 실패 시 대체용)
function generateSamplePerformances() {
  return [
    {
      id: 1,
      title: "봄날의 재즈 콘서트",
      description: "서울의 봄을 맞이하는 특별한 재즈 공연",
      type: "콘서트",
      location: "서울 예술의전당",
      date: "2025-05-15 ~ 2025-05-16",
      price: "30,000원 ~ 80,000원",
      region: "서울",
      source: "샘플 데이터",
      link: "https://www.sac.or.kr/"
    },
    {
      id: 2,
      title: "오페라의 유령",
      description: "전 세계적으로 사랑받는 클래식 뮤지컬",
      type: "뮤지컬",
      location: "부산 드림씨어터",
      date: "2025-06-10 ~ 2025-07-15",
      price: "50,000원 ~ 150,000원",
      region: "부산",
      source: "샘플 데이터",
      link: "https://www.musicalkorea.com/"
    },
    {
      id: 3,
      title: "국악과 현대음악의 만남",
      description: "전통과 현대가 어우러진 특별한 국악 공연",
      type: "국악",
      location: "국립국악원",
      date: "2025-05-20 ~ 2025-05-25",
      price: "20,000원 ~ 40,000원",
      region: "서울",
      source: "샘플 데이터",
      link: "https://www.gugak.go.kr/"
    },
    {
      id: 4,
      title: "제주 봄 축제",
      description: "제주의 자연과 함께하는 음악 축제",
      type: "축제",
      location: "제주 평화공원",
      date: "2025-05-01 ~ 2025-05-05",
      price: "무료",
      region: "제주",
      source: "샘플 데이터",
      link: "https://www.jeju.go.kr/"
    },
    {
      id: 5,
      title: "현대미술 특별전",
      description: "국내 유명 작가들의 현대미술 작품 전시",
      type: "전시",
      location: "대구 미술관",
      date: "2025-04-20 ~ 2025-06-20",
      price: "15,000원",
      region: "대구",
      source: "샘플 데이터",
      link: "https://daeguartmuseum.org/"
    },
    {
      id: 6,
      title: "클래식 오케스트라 정기 공연",
      description: "베토벤과 모차르트의 명곡을 한자리에서",
      type: "클래식",
      location: "롯데콘서트홀",
      date: "2025-05-25 ~ 2025-05-25",
      price: "40,000원 ~ 100,000원",
      region: "서울",
      source: "샘플 데이터",
      link: "https://www.lotteconcerthall.com/"
    },
    {
      id: 7,
      title: "가족과 함께하는 아이스쇼",
      description: "어린이를 위한 신나는 아이스쇼",
      type: "공연",
      location: "고양 아람누리",
      date: "2025-05-05 ~ 2025-05-05",
      price: "25,000원 ~ 45,000원",
      region: "경기",
      source: "샘플 데이터",
      link: "https://www.artgy.or.kr/aram/main.do"
    },
    {
      id: 8,
      title: "전통 가야금 연주회",
      description: "유명 가야금 연주자의 솔로 공연",
      type: "국악",
      location: "국립극장",
      date: "2025-06-15 ~ 2025-06-15",
      price: "30,000원",
      region: "서울",
      source: "샘플 데이터",
      link: "https://www.ntok.go.kr/"
    },
    {
      id: 9,
      title: "락 페스티벌 2025",
      description: "국내외 유명 락 밴드들의 합동 공연",
      type: "콘서트",
      location: "인천 팝콘필드",
      date: "2025-07-20 ~ 2025-07-21",
      price: "88,000원",
      region: "인천",
      source: "샘플 데이터",
      link: "https://www.incheon.go.kr/"
    }
  ];
 }
 
 // 공연 필터링
 function filterPerformances() {
  const region = document.getElementById('region').value;
  const performanceType = document.getElementById('performance-type').value;
  
  // 필터링 적용
  const filteredPerformances = filterLocalData(currentPerformances, {
    region: region,
    genre: performanceType
  });
  
  // 필터링 결과 표시
  if (filteredPerformances.length > 0) {
    displayPerformances(filteredPerformances);
    showAlert(`${filteredPerformances.length}개의 공연이 필터링되었습니다.`, 'success');
  } else {
    // 필터링 결과가 없을 때
    const performancesContainer = document.getElementById('performances-container');
    performancesContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>필터 조건에 맞는 공연이 없습니다.
          <div class="mt-3">
            <button class="btn btn-outline-primary btn-sm" onclick="loadPerformances()">모든 공연 보기</button>
          </div>
        </div>
      </div>
    `;
  }
 }
 
 // 로딩 표시 함수
 function showLoading(container, message = '로딩 중...') {
  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">${message}</p>
    </div>
  `;
 }
 
 // 알림 메시지 표시
 function showAlert(message, type = 'info', duration = 5000) {
  // 알림 컨테이너 생성 또는 가져오기
  let alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'alert-container';
    alertContainer.style.position = 'fixed';
    alertContainer.style.top = '20px';
    alertContainer.style.right = '20px';
    alertContainer.style.zIndex = '1050';
    document.body.appendChild(alertContainer);
  }
  
  // 알림 요소 생성
  const alertId = 'alert-' + new Date().getTime();
  const alertElement = document.createElement('div');
  alertElement.id = alertId;
  alertElement.className = `alert alert-${type} alert-dismissible fade show`;
  alertElement.role = 'alert';
  alertElement.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // 컨테이너에 알림 추가
  alertContainer.appendChild(alertElement);
  
  // 지정 시간 후 자동으로 사라짐
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }
  }, duration);
 }
 
 // URL 파라미터 처리 (페이지 로드 시 특정 공연 표시)
 document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const performanceId = urlParams.get('id');
  
  if (performanceId) {
    // 공연 데이터 로드 후 상세 정보 표시
    loadPerformances().then(() => {
      // 약간의 지연 후 상세 정보 표시 (데이터 로드 대기)
      setTimeout(() => {
        showPerformanceDetails(performanceId);
      }, 1000);
    });
  }
 });