// main.js 파일에서
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM이 로드되었습니다.');
    
    // 요소 존재 여부 확인
    const container = document.getElementById('popular-destinations-container');
    console.log('컨테이너 요소 찾음:', container);
    
    if (container) {
        // 인기 여행지 데이터 로드
        loadPopularDestinations();
    } else {
        console.error('popular-destinations-container 요소를 찾을 수 없습니다. 현재 페이지에 해당 요소가 있는지 확인하세요.');
    }
    
    // 지역별 인기 여행지 탭 생성 및 데이터 로드
    const tabsContainer = document.getElementById('region-tabs');
    if (tabsContainer) {
        initializeRegionTabs();
    }
});
// 전역 변수로 데이터 캐싱
let cachedTouristData = null;

// JSONL 파일 로드 및 파싱 함수
async function loadJSONLFile(filePath) {
    try {
        // 절대 경로 사용
        const fullPath = `/naratour/data/ml_filtered_master_tourist_only.jsonl`;
        console.log('데이터 로드 시도:', fullPath);
        
        const response = await fetch(fullPath);
        
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('로드된 데이터 미리보기:', text.substring(0, 100));
        
        // JSONL 파싱
        return text.trim().split('\n')
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error('파싱 오류:', e, line.substring(0, 50) + '...');
                    return null;
                }
            })
            .filter(item => item !== null);
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
        
        // 만족도(DGSTFN) 기준으로 정렬하여 상위 6개 선택
        const popularDestinations = touristData
            .filter(item => item.DGSTFN && item.DGSTFN > 0) // 만족도가 있는 항목만
            .sort((a, b) => b.DGSTFN - a.DGSTFN) // 높은 순으로 정렬
            .slice(0, 6); // 상위 6개 선택
        
        // HTML 생성
        let html = '';
        popularDestinations.forEach(destination => {
            const name = destination.VISIT_AREA_NM || '이름 없음';
            const address = destination.ROAD_NM_ADDR || destination.LOTNO_ADDR || '';
            const region = destination.SIDO_NM || '';
            const satisfaction = destination.DGSTFN || '0';
            
            // 관광지 유형 코드에 따른 카테고리 설정
            let category = '기타';
            let categoryIcon = 'fas fa-map-marker-alt';
            
            switch(destination.VISIT_AREA_TYPE_CD) {
                case 1:
                    category = '관광명소';
                    categoryIcon = 'fas fa-mountain';
                    break;
                case 2:
                    category = '숙박';
                    categoryIcon = 'fas fa-hotel';
                    break;
                case 3:
                    category = '쇼핑';
                    categoryIcon = 'fas fa-shopping-bag';
                    break;
                case 4:
                    category = '맛집';
                    categoryIcon = 'fas fa-utensils';
                    break;
                case 5:
                    category = '교통';
                    categoryIcon = 'fas fa-bus';
                    break;
                case 6:
                    category = '문화시설';
                    categoryIcon = 'fas fa-theater-masks';
                    break;
            }
            
            html += `
            <div class="col-md-4 mb-4">
                <div class="card destination-card">
                    <div class="card-img-top text-center py-4 bg-light">
                        <i class="${categoryIcon} fa-3x text-primary"></i>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${name}</h5>
                        <p class="card-text text-muted small">${address}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">${category}</span>
                            <span class="badge bg-success">
                                <i class="fas fa-star me-1"></i>${satisfaction}/5
                            </span>
                        </div>
                        <div class="mt-2">
                            <span class="badge bg-secondary">${region}</span>
                        </div>
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

// 지역별 탭 초기화 및 데이터 로드
async function initializeRegionTabs() {
    try {
        // JSONL 파일 로드
        const touristData = await loadJSONLFile('data/ml_filtered_master_tourist_only.jsonl');
        
        if (!touristData || touristData.length === 0) {
            return;
        }
        
        // 고유한 지역(SIDO_NM) 목록 추출
        const regions = [...new Set(touristData
            .filter(item => item.SIDO_NM) // 지역 정보가 있는 항목만
            .map(item => item.SIDO_NM))]
            .sort(); // 알파벳 순 정렬
        
        // 탭 메뉴 생성
        const tabsContainer = document.getElementById('region-tabs');
        let tabsHtml = `
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="all-tab" data-bs-toggle="pill" data-bs-target="#all" type="button" role="tab" aria-controls="all" aria-selected="true">전체</button>
            </li>`;
        
        regions.forEach(region => {
            const regionId = region.replace(/\s+/g, '-').toLowerCase();
            tabsHtml += `
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="${regionId}-tab" data-bs-toggle="pill" data-bs-target="#${regionId}" type="button" role="tab" aria-controls="${regionId}" aria-selected="false">${region}</button>
            </li>`;
        });
        
        tabsContainer.innerHTML = tabsHtml;
        
        // 탭 컨텐츠 생성
        const tabContentContainer = document.getElementById('region-tab-content');
        let tabContentHtml = `
            <div class="tab-pane fade show active" id="all" role="tabpanel" aria-labelledby="all-tab">
                <div class="row">`;
        
        // 전체 지역의 인기 관광지 (만족도 순 상위 3개)
        const allPopular = touristData
            .filter(item => item.DGSTFN && item.DGSTFN > 0)
            .sort((a, b) => b.DGSTFN - a.DGSTFN)
            .slice(0, 3);
        
        allPopular.forEach(destination => {
            tabContentHtml += createDestinationCard(destination);
        });
        
        tabContentHtml += `
                </div>
            </div>`;
        
        // 각 지역별 탭 컨텐츠 생성
        regions.forEach(region => {
            const regionId = region.replace(/\s+/g, '-').toLowerCase();
            
            // 해당 지역의 관광지 필터링
            const regionDestinations = touristData
                .filter(item => item.SIDO_NM === region && item.DGSTFN)
                .sort((a, b) => b.DGSTFN - a.DGSTFN)
                .slice(0, 3); // 상위 3개
            
            tabContentHtml += `
            <div class="tab-pane fade" id="${regionId}" role="tabpanel" aria-labelledby="${regionId}-tab">
                <div class="row">`;
            
            if (regionDestinations.length > 0) {
                regionDestinations.forEach(destination => {
                    tabContentHtml += createDestinationCard(destination);
                });
            } else {
                tabContentHtml += `
                <div class="col-12 text-center py-4">
                    <p>해당 지역의 데이터가 없습니다.</p>
                </div>`;
            }
            
            tabContentHtml += `
                </div>
            </div>`;
        });
        
        tabContentContainer.innerHTML = tabContentHtml;
        
    } catch (error) {
        console.error('지역별 데이터 로드 중 오류 발생:', error);
    }
}

// 관광지 카드 HTML 생성 함수
function createDestinationCard(destination) {
    const name = destination.VISIT_AREA_NM || '이름 없음';
    const address = destination.ROAD_NM_ADDR || destination.LOTNO_ADDR || '';
    const region = destination.SIDO_NM || '';
    const satisfaction = destination.DGSTFN || '0';
    
    // 관광지 유형 코드에 따른 카테고리 설정
    let category = '기타';
    let categoryIcon = 'fas fa-map-marker-alt';
    
    switch(destination.VISIT_AREA_TYPE_CD) {
        case 1:
            category = '관광명소';
            categoryIcon = 'fas fa-mountain';
            break;
        case 2:
            category = '숙박';
            categoryIcon = 'fas fa-hotel';
            break;
        case 3:
            category = '쇼핑';
            categoryIcon = 'fas fa-shopping-bag';
            break;
        case 4:
            category = '맛집';
            categoryIcon = 'fas fa-utensils';
            break;
        case 5:
            category = '교통';
            categoryIcon = 'fas fa-bus';
            break;
        case 6:
            category = '문화시설';
            categoryIcon = 'fas fa-theater-masks';
            break;
    }
    
    return `
    <div class="col-md-4 mb-4">
        <div class="card destination-card">
            <div class="card-img-top text-center py-4 bg-light">
                <i class="${categoryIcon} fa-3x text-primary"></i>
            </div>
            <div class="card-body">
                <h5 class="card-title">${name}</h5>
                <p class="card-text text-muted small">${address}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-primary">${category}</span>
                    <span class="badge bg-success">
                        <i class="fas fa-star me-1"></i>${satisfaction}/5
                    </span>
                </div>
                <div class="mt-2">
                    <span class="badge bg-secondary">${region}</span>
                </div>
            </div>
        </div>
    </div>`;
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