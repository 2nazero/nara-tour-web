// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 인기 여행지 데이터 로드
    loadPopularDestinations();
});

// JSONL 파일 로드 및 파싱 함수
async function loadJSONLFile(filePath) {
    try {
        const response = await fetch(filePath);
        const text = await response.text();
        
        // JSONL은 줄바꿈으로 구분된 JSON 객체들이므로 각 줄을 파싱
        return text.trim().split('\n')
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error('파싱 오류:', e, line);
                    return null;
                }
            })
            .filter(item => item !== null); // 파싱 실패한 항목 제거
    } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
        return [];
    }
}

// 인기 여행지 데이터 로드 및 표시
async function loadPopularDestinations() {
    const container = document.getElementById('popular-destinations-container');
    
    try {
        // JSONL 파일 로드
        const touristData = await loadJSONLFile('data/ml_filtered_master_tourist_only.jsonl');
        
        // 데이터가 없으면 메시지 표시
        if (!touristData || touristData.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p>데이터를 불러올 수 없습니다.</p></div>';
            return;
        }
        
        // 인기 여행지 6개 선택 (실제로는 평점이나 방문자 수 등으로 정렬 가능)
        // 여기서는 임의로 6개 선택
        const popularDestinations = touristData
            .sort(() => 0.5 - Math.random()) // 랜덤 정렬
            .slice(0, 6); // 6개 선택
        
        // HTML 생성
        let html = '';
        popularDestinations.forEach(destination => {
            // 데이터 구조에 따라 필드명 조정 필요
            const name = destination.name || destination.place_name || '이름 없음';
            const address = destination.address || destination.addr || '';
            const category = destination.category || destination.cat3_name || '기타';
            const imageUrl = destination.image_url || 'assets/images/icon_blank.jpg';
            
            html += `
            <div class="col-md-4 mb-4">
                <div class="card destination-card">
                    <img src="${imageUrl}" class="card-img-top" alt="${name}" 
                         onerror="this.src='assets/images/icon_blank.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${name}</h5>
                        <p class="card-text text-muted small">${address}</p>
                        <span class="badge bg-primary">${category}</span>
                    </div>
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.error('인기 여행지 로드 중 오류 발생:', error);
        container.innerHTML = '<div class="col-12 text-center"><p>데이터를 불러오는 중 오류가 발생했습니다.</p></div>';
    }
}

// 지역별 여행지 필터링 함수 (regions.html 페이지에서 사용)
function filterByRegion(region) {
    // 이 함수는 regions.html 페이지에서 구현 예정
    console.log('지역 필터링:', region);
}

// 공연 정보 필터링 함수 (performances.html 페이지에서 사용)
function filterPerformances(criteria) {
    // 이 함수는 performances.html 페이지에서 구현 예정
    console.log('공연 필터링:', criteria);
}

// 여행 경로 계획 함수 (routes.html 페이지에서 사용)
function planRoute(destinations) {
    // 이 함수는 routes.html 페이지에서 구현 예정
    console.log('경로 계획:', destinations);
}