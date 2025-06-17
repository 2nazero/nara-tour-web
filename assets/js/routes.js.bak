// 지도 관련 변수 및 초기화
let map;
let markers = [];
let routePath;
let selectedPlaces = [];
let isOptimizedOrder = true;

// 추가할 전역 변수
let currentPage = 0;
let totalPlaces = 0;
let displayedPlaces = 0;
let selectedRegion = '';
let isLoadingMore = false;
let apiLoadingTimeout = null;
let viewMoreBtn;
let allRecommendedPlaces = []; // 모든 추천 장소 저장
let currentCategory = 'all'; // 현재 선택된 카테고리

// 이동 시간 및 거리 계산용 상수
const AVERAGE_SPEED_KM_PER_HOUR = 40;
const EARTH_RADIUS_KM = 6371;
const MAX_DISPLAY_COUNT = 1000;

// 카테고리 정보
const CATEGORY_INFO = {
    all: { name: '전체', icon: 'fas fa-th-large', color: '#6c757d' },
    1: { name: '자연 관광지', icon: 'fas fa-mountain', color: '#28a745' },
    2: { name: '문화/역사/종교', icon: 'fas fa-landmark', color: '#dc3545' },
    3: { name: '문화시설', icon: 'fas fa-theater-masks', color: '#6f42c1' },
    4: { name: '상업지구', icon: 'fas fa-store', color: '#fd7e14' },
    11: { name: '식당/카페', icon: 'fas fa-utensils', color: '#20c997' }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 로딩 완료: 여행 경로 페이지 초기화');
    
    // CSS 스타일 추가
    addCustomStyles();
    
    // 지도 초기화
    initMap();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 경로 모드 전환 버튼 추가
    addRouteModeToggle();
    
    // 인기 경로 불러오기 버튼 이벤트
    setupPopularRouteButtons();
    
    // 일정표 관련 버튼 이벤트
    setupItineraryButtons();
});

function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* 기존 스타일 유지 */
        #loading-indicator, .loading-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .loading-hidden {
            display: none !important;
        }
        
        /* 카테고리 탭 스타일 */
        .category-tabs {
            margin-bottom: 1.5rem;
            border-bottom: 2px solid #e9ecef;
            padding: 0 1rem;
        }
        
        .category-tab {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            margin-right: 0.5rem;
            background-color: #f8f9fa;
            border: none;
            border-radius: 0.5rem 0.5rem 0 0;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            color: #6c757d;
            font-weight: 500;
            font-size: 0.9rem;
        }
        
        .category-tab:hover {
            background-color: #e9ecef;
            color: #495057;
            text-decoration: none;
        }
        
        .category-tab.active {
            background-color: #007bff;
            color: white;
            transform: translateY(-2px);
        }
        
        .category-tab i {
            margin-right: 0.5rem;
        }
        
        /* 가로 스크롤 컨테이너 */
        .horizontal-scroll-container {
            position: relative;
            margin-bottom: 1.5rem;
            padding: 0 1rem;
        }
        
        .scroll-wrapper {
            display: flex;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 1rem 0;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            gap: 1rem;
        }
        
        .scroll-wrapper::-webkit-scrollbar {
            display: none;
        }
        
        /* 스크롤 카드 아이템 */
        .scroll-card-item {
            flex: 0 0 auto;
            width: 280px;
            height: 100%;
        }
        
        /* 카드 스타일 개선 */
        .destination-card {
            transition: all 0.3s ease;
            height: 100%;
            border: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 0.75rem;
            overflow: hidden;
        }
        
        .destination-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .destination-card .card-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            font-weight: 600;
            font-size: 0.9rem;
            padding: 0.75rem 1rem;
        }
        
        .destination-card .card-body {
            padding: 1.25rem;
        }
        
        .destination-card .card-title {
            font-weight: 600;
            margin-bottom: 0.75rem;
            color: #2c3e50;
            font-size: 1rem;
        }
        
        .destination-card .card-text {
            color: #6c757d;
            font-size: 0.85rem;
            margin-bottom: 1rem;
            line-height: 1.4;
            height: 2.8rem;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        
        /* 네비게이션 버튼 */
        .scroll-nav-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.95);
            border: none;
            border-radius: 50%;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10;
            cursor: pointer;
            transition: all 0.3s ease;
            color: #495057;
            font-size: 1.1rem;
        }
        
        .scroll-nav-btn:hover {
            background: #007bff;
            color: white;
            transform: translateY(-50%) scale(1.05);
        }
        
        .scroll-nav-prev {
            left: -20px;
        }
        
        .scroll-nav-next {
            right: -20px;
        }
        
        /* 카테고리별 색상 */
        .category-nature .card-header { background: linear-gradient(135deg, #4CAF50, #2E7D32) !important; }
        .category-culture .card-header { background: linear-gradient(135deg, #f44336, #c62828) !important; }
        .category-facility .card-header { background: linear-gradient(135deg, #9c27b0, #6a1b9a) !important; }
        .category-commercial .card-header { background: linear-gradient(135deg, #ff9800, #e65100) !important; }
        .category-food .card-header { background: linear-gradient(135deg, #00bcd4, #00838f) !important; }
        
        /* 카테고리 통계 */
        .category-stats {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            text-align: center;
            margin: 0 1rem 1rem 1rem;
        }
        
        .category-stats .stat-item {
            display: inline-block;
            margin: 0 1rem;
            color: #6c757d;
            font-size: 0.9rem;
        }
        
        .category-stats .stat-number {
            font-weight: 600;
            color: #007bff;
        }
        
        /* 빈 상태 */
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: #6c757d;
        }
        
        .empty-state i {
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        
        /* 기존 스타일 유지 */
        .route-arrow-icon div {
            box-shadow: 0 0 4px rgba(0,0,0,0.2);
        }
        
        .custom-div-icon div {
            box-shadow: 0 0 5px rgba(0,0,0,0.3);
            text-shadow: 0 0 2px rgba(0,0,0,0.5);
        }
        
        #selected-places .list-group-item {
            cursor: grab;
            transition: background-color 0.2s;
        }
        
        #selected-places .list-group-item:hover {
            background-color: #f8f9fa;
        }
        
        #selected-places .list-group-item:active {
            cursor: grabbing;
            background-color: #e9ecef;
        }
        
        /* 반응형 조정 */
        @media (max-width: 768px) {
            .scroll-card-item {
                width: 250px;
            }
            
            .category-tab {
                padding: 0.5rem 1rem;
                font-size: 0.8rem;
                margin-bottom: 0.5rem;
                margin-right: 0.25rem;
            }
            
            .scroll-nav-btn {
                display: none;
            }
            
            .category-stats .stat-item {
                display: block;
                margin: 0.5rem 0;
            }
            
            .category-stats {
                margin: 0 0.5rem 1rem 0.5rem;
            }
            
            .horizontal-scroll-container {
                padding: 0 0.5rem;
            }
            
            .category-tabs {
                padding: 0 0.5rem;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('커스텀 스타일 추가됨');
}

function setupEventListeners() {
    // 경로 계획 폼 제출 이벤트 리스너
    const routeForm = document.getElementById('route-form');
    if (routeForm) {
        routeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const region = document.getElementById('region-select').value;
            if (region) {
                loadRecommendedPlaces(region);
            } else {
                alert('지역을 선택해주세요.');
            }
        });
    }
    
    // 최적 경로 계산 버튼 이벤트 리스너
    const optimizeBtn = document.getElementById('optimize-route');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', function() {
            const isOptimize = document.getElementById('optimize-option')?.checked || false;
            optimizeRoute(isOptimize);
        });
    }
}

// 지도 초기화 함수
function initMap() {
    const koreaCenter = [37.5665, 126.9780];
    const mapContainer = document.getElementById('route-map');
    if (!mapContainer) {
        console.error('지도 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    map = L.map('route-map').setView(koreaCenter, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    console.log('지도가 초기화되었습니다.');
}

// 카테고리 정보 반환 함수
function getCategoryInfo(typeCode) {
    const categories = {
        1: { name: '자연 관광지', icon: 'fas fa-mountain' },
        2: { name: '문화/역사/종교시설', icon: 'fas fa-landmark' },
        3: { name: '문화시설', icon: 'fas fa-theater-masks' },
        4: { name: '상업지구', icon: 'fas fa-store' },
        5: { name: '레저/스포츠', icon: 'fas fa-running' },
        6: { name: '테마시설', icon: 'fas fa-ticket-alt' },
        7: { name: '산책로/둘레길', icon: 'fas fa-hiking' },
        8: { name: '축제/행사', icon: 'fas fa-calendar-alt' },
        9: { name: '교통시설', icon: 'fas fa-bus' },
        10: { name: '상점', icon: 'fas fa-shopping-bag' },
        11: { name: '식당/카페', icon: 'fas fa-utensils' },
        24: { name: '숙소', icon: 'fas fa-bed' }
    };
    
    return categories[typeCode] || { name: '기타', icon: 'fas fa-map-marker-alt' };
}

// 추천 장소 로드 함수 (개선된 버전)
async function loadRecommendedPlaces(region, isLoadMore = false) {
    const container = document.getElementById('recommended-places');
    if (!container) {
        console.error('추천 장소 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    if (!region) {
        const regionSelect = document.getElementById('region-select');
        if (!regionSelect || !regionSelect.value) {
            alert('지역을 선택해주세요.');
            return;
        }
        region = regionSelect.value;
    }
    
    // 새로운 검색이면 상태 초기화
    if (!isLoadMore) {
        selectedRegion = region;
        allRecommendedPlaces = [];
        currentCategory = 'all';
        
        // 로딩 표시
        container.innerHTML = `
            <div class="loading-indicator">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">${region} 추천 장소를 불러오는 중...</p>
            </div>
        `;
    }
    
    try {
        // 선호 장소 유형 필터링
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        const preferredTypes = Array.from(checkboxes).map(checkbox => parseInt(checkbox.value));
        
        console.log('API 호출:', `/.netlify/functions/getMapData?region=${encodeURIComponent(region)}`);
        
        const response = await fetch(`/.netlify/functions/getMapData?region=${encodeURIComponent(region)}`);
        
        if (!response.ok) {
            throw new Error(`서버 응답 오류: ${response.status}`);
        }
        
        const result = await response.json();
        let regionData = result.data || [];
        
        // 데이터가 없는 경우 샘플 데이터 사용
        if (!regionData || regionData.length === 0) {
            console.log('API 데이터가 없어 샘플 데이터 사용');
            regionData = generateSamplePlaces(region, 30);
        }
        
        // 선호 유형 필터링
        if (preferredTypes.length > 0) {
            regionData = regionData.filter(place => 
                preferredTypes.includes(place.VISIT_AREA_TYPE_CD)
            );
        }
        
        allRecommendedPlaces = regionData;
        
        // 지도 업데이트
        if (!isLoadMore) {
            updateMapForRegion(region);
        }
        
        // 카테고리 탭과 카드 렌더링
        renderCategoryTabs();
        renderCategoryCards(currentCategory);
        
        console.log('추천 장소 표시 완료:', regionData.length);
        
    } catch (error) {
        console.error('추천 장소 로드 중 오류 발생:', error);
        
        // 샘플 데이터로 폴백
        console.log('오류 발생으로 샘플 데이터 사용');
        allRecommendedPlaces = generateSamplePlaces(region, 30);
        renderCategoryTabs();
        renderCategoryCards(currentCategory);
    }
}

// 카테고리 탭 렌더링
function renderCategoryTabs() {
    const container = document.getElementById('recommended-places');
    if (!container) return;
    
    // 카테고리별 장소 수 계산
    const categoryCounts = {};
    allRecommendedPlaces.forEach(place => {
        const typeCode = place.VISIT_AREA_TYPE_CD;
        categoryCounts[typeCode] = (categoryCounts[typeCode] || 0) + 1;
    });
    
    // 탭 HTML 생성
    let tabsHTML = '<div class="category-tabs">';
    
    // 전체 탭
    const totalCount = allRecommendedPlaces.length;
    tabsHTML += `
        <button class="category-tab ${currentCategory === 'all' ? 'active' : ''}" 
                onclick="switchCategory('all')">
            <i class="${CATEGORY_INFO.all.icon}"></i>
            ${CATEGORY_INFO.all.name} (${totalCount})
        </button>
    `;
    
    // 각 카테고리 탭
    Object.keys(categoryCounts).forEach(typeCode => {
        const count = categoryCounts[typeCode];
        const categoryInfo = getCategoryInfo(parseInt(typeCode));
        tabsHTML += `
            <button class="category-tab ${currentCategory === typeCode ? 'active' : ''}" 
                    onclick="switchCategory('${typeCode}')">
                <i class="${categoryInfo.icon}"></i>
                ${categoryInfo.name} (${count})
            </button>
        `;
    });
    
    tabsHTML += '</div>';
    
    // 통계 정보
    const statsHTML = `
        <div class="category-stats">
            <span class="stat-item">
                <i class="fas fa-map-marker-alt"></i>
                총 <span class="stat-number">${totalCount}</span>개 장소
            </span>
            <span class="stat-item">
                <i class="fas fa-tags"></i>
                <span class="stat-number">${Object.keys(categoryCounts).length}</span>개 카테고리
            </span>
            <span class="stat-item">
                <i class="fas fa-star"></i>
                평균 만족도 <span class="stat-number">${calculateAverageRating().toFixed(1)}</span>점
            </span>
        </div>
    `;
    
    container.innerHTML = tabsHTML + statsHTML + '<div id="category-content"></div>';
}

// 카테고리별 카드 렌더링
function renderCategoryCards(category) {
    const contentContainer = document.getElementById('category-content');
    if (!contentContainer) return;
    
    // 카테고리에 따른 필터링
    let filteredPlaces = allRecommendedPlaces;
    if (category !== 'all') {
        filteredPlaces = allRecommendedPlaces.filter(place => 
            place.VISIT_AREA_TYPE_CD.toString() === category
        );
    }
    
    if (filteredPlaces.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>해당 카테고리에 장소가 없습니다</h5>
                <p>다른 카테고리를 선택하거나 필터를 조정해보세요.</p>
            </div>
        `;
        return;
    }
    
    // 가로 스크롤 컨테이너 생성
    let html = `
        <div class="horizontal-scroll-container">
            <button class="scroll-nav-btn scroll-nav-prev" onclick="scrollCards('prev')">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="scroll-wrapper" id="scroll-wrapper">
    `;
    
    // 카드 생성
    filteredPlaces.forEach((place, index) => {
        const name = place.VISIT_AREA_NM || '이름 없음';
        const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '';
        const satisfaction = place.DGSTFN || (3 + Math.random() * 2).toFixed(1);
        
        const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
        const categoryClass = getCategoryClass(place.VISIT_AREA_TYPE_CD);
        
        html += `
            <div class="scroll-card-item">
                <div class="card h-100 destination-card ${categoryClass}">
                    <div class="card-header">
                        <i class="${categoryInfo.icon} me-2"></i>${categoryInfo.name}
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${name}</h6>
                        <p class="card-text">${address}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-warning text-dark">
                                <i class="fas fa-star me-1"></i>${satisfaction}/5
                            </span>
                            <button class="btn btn-sm btn-primary add-place" 
                                    data-place-id="${place.VISIT_AREA_ID}">
                                <i class="fas fa-plus me-1"></i>추가
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            <button class="scroll-nav-btn scroll-nav-next" onclick="scrollCards('next')">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    contentContainer.innerHTML = html;
    
    // 추가 버튼 이벤트 처리
    setupAddButtons(filteredPlaces);
}

// 카테고리 전환 함수
function switchCategory(category) {
    currentCategory = category;
    
    // 탭 활성화 상태 업데이트
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 클릭된 탭 찾아서 활성화
    const clickedTab = Array.from(document.querySelectorAll('.category-tab')).find(tab => 
        tab.onclick.toString().includes(`switchCategory('${category}')`)
    );
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    
    // 카드 다시 렌더링
    renderCategoryCards(category);
}

// 카드 스크롤 함수
function scrollCards(direction) {
    const wrapper = document.getElementById('scroll-wrapper');
    if (!wrapper) return;
    
    const scrollAmount = 300;
    const currentScroll = wrapper.scrollLeft;
    
    if (direction === 'next') {
        wrapper.scrollTo({
            left: currentScroll + scrollAmount,
            behavior: 'smooth'
        });
    } else {
        wrapper.scrollTo({
            left: currentScroll - scrollAmount,
            behavior: 'smooth'
        });
    }
}

// 카테고리 클래스 반환
function getCategoryClass(typeCode) {
    const classes = {
        1: 'category-nature',
        2: 'category-culture',
        3: 'category-facility',
        4: 'category-commercial',
        11: 'category-food'
    };
    return classes[typeCode] || '';
}

// 평균 평점 계산
function calculateAverageRating() {
    if (allRecommendedPlaces.length === 0) return 0;
    
    const total = allRecommendedPlaces.reduce((sum, place) => {
        const rating = parseFloat(place.DGSTFN) || (3 + Math.random() * 2);
        return sum + rating;
    }, 0);
    
    return total / allRecommendedPlaces.length;
}

// 추가 버튼 이벤트 설정
function setupAddButtons(places) {
    const addButtons = document.querySelectorAll('.add-place');
    addButtons.forEach(button => {
        button.addEventListener('click', function() {
            const placeId = this.getAttribute('data-place-id');
            const place = places.find(p => p.VISIT_AREA_ID === placeId);
            if (place) {
                addPlaceToSelection(place);
                
                // 버튼 상태 변경
                this.innerHTML = '<i class="fas fa-check me-1"></i>추가됨';
                this.classList.remove('btn-primary');
                this.classList.add('btn-success');
                this.disabled = true;
                
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-plus me-1"></i>추가';
                    this.classList.remove('btn-success');
                    this.classList.add('btn-primary');
                    this.disabled = false;
                }, 2000);
            }
        });
    });
}

// 샘플 장소 데이터 생성
function generateSamplePlaces(region, count = 30) {
    const places = [];
    const types = [1, 2, 3, 11];
    const names = {
        1: ['산', '공원', '해변', '호수', '폭포', '자연휴양림', '국립공원', '수목원'],
        2: ['박물관', '사찰', '성', '전시관', '유적지', '문화재', '역사관', '기념관'],
        3: ['미술관', '공연장', '도서관', '갤러리', '문화센터', '영화관', '극장', '콘서트홀'],
        11: ['맛집', '카페', '레스토랑', '베이커리', '디저트', '전통차집', '브런치카페', '펍']
    };
    
    const baseCoords = {
        '서울특별시': [37.5665, 126.9780],
        '경기도': [37.4138, 127.5183],
        '강원도': [37.8228, 128.1555],
        '충청북도': [36.8000, 127.7000],
        '충청남도': [36.5184, 126.8000],
        '전라북도': [35.8196, 127.1088],
        '전라남도': [34.8160, 126.4629],
        '경상북도': [36.4919, 128.8889],
        '경상남도': [35.4606, 128.2132],
        '제주도': [33.4890, 126.4983]
    }[region] || [37.5665, 126.9780];
    
    for (let i = 0; i < count; i++) {
        const typeCode = types[Math.floor(Math.random() * types.length)];
        const nameOptions = names[typeCode];
        const namePrefix = nameOptions[Math.floor(Math.random() * nameOptions.length)];
        
        const lat = baseCoords[0] + (Math.random() - 0.5) * 0.3;
        const lng = baseCoords[1] + (Math.random() - 0.5) * 0.3;
        
        places.push({
            VISIT_AREA_ID: `sample-${region}-${i}`,
            VISIT_AREA_NM: `${region} ${namePrefix} ${i+1}`,
            VISIT_AREA_TYPE_CD: typeCode,
            ROAD_NM_ADDR: `${region} 샘플구 샘플동 ${i+1}`,
            LOTNO_ADDR: `${region} 샘플구 샘플동 ${i+1}`,
            DGSTFN: (3 + Math.random() * 2).toFixed(1),
            X_COORD: lng,
            Y_COORD: lat,
            XCNTS_VALUE: lng.toString(),
            YDNTS_VALUE: lat.toString(),
            SIDO_NM: region,
            RESIDENCE_TIME_MIN: 60 + Math.floor(Math.random() * 120)
        });
    }
    
    return places;
}

// 선택된 장소 추가 함수
function addPlaceToSelection(place) {
    console.log('장소 추가:', place.VISIT_AREA_NM);
    
    // 좌표 필드 확인 및 변환
    if (!place.XCNTS_VALUE && place.X_COORD) {
        place.XCNTS_VALUE = place.X_COORD.toString();
    }
    if (!place.YDNTS_VALUE && place.Y_COORD) {
        place.YDNTS_VALUE = place.Y_COORD.toString();
    }
    
    // 좌표 값 확인
    if ((!place.XCNTS_VALUE && !place.X_COORD) || (!place.YDNTS_VALUE && !place.Y_COORD)) {
        console.warn('좌표가 없는 장소입니다:', place.VISIT_AREA_NM);
        alert(`"${place.VISIT_AREA_NM}" 장소에 좌표 정보가 없어 지도에 정확히 표시되지 않을 수 있습니다.`);
    }
    
    // 이미 선택된 장소 확인
    if (selectedPlaces.some(p => p.VISIT_AREA_ID === place.VISIT_AREA_ID)) {
        alert('이미 선택된 장소입니다.');
        return;
    }
    
    // 방문 시간 설정 (기본 90분)
    if (!place.RESIDENCE_TIME_MIN) {
        place.RESIDENCE_TIME_MIN = 90;
    }
    
    selectedPlaces.push(place);
    updateSelectedPlacesList();
    addMarkerToMap(place);
    
    // 장소가 2개 이상이면 자동으로 경로 업데이트
    if (selectedPlaces.length >= 2) {
        // 최적 경로 모드 확인
        const isOptimize = document.getElementById('optimize-option')?.checked || false;
        optimizeRoute(isOptimize);
    }
    
    // 선택된 장소 수 업데이트
    if (window.updateSelectedCount) {
        window.updateSelectedCount();
    }
}

// 선택된 장소 목록 업데이트
function updateSelectedPlacesList() {
    const container = document.getElementById('selected-places');
    if (!container) return;
    
    if (selectedPlaces.length === 0) {
        container.innerHTML = `
            <li class="list-group-item text-center text-muted">
                <i class="fas fa-hand-pointer mb-2 d-block" style="font-size: 2rem; opacity: 0.5;"></i>
                오른쪽에서 장소를 선택해주세요
            </li>
        `;
        return;
    }
    
    let html = '';
    selectedPlaces.forEach((place, index) => {
        const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
        const visitTime = place.RESIDENCE_TIME_MIN || 90;
        
        html += `
        <li class="list-group-item" draggable="true">
            <div class="d-flex justify-content-between align-items-center">
                <span>
                    <span class="badge bg-primary me-2">${index + 1}</span>
                    <i class="${categoryInfo.icon} me-1 text-muted"></i>
                    ${place.VISIT_AREA_NM}
                </span>
                <button class="btn btn-sm btn-outline-danger remove-place" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mt-2 d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <small class="text-muted me-2">방문 시간:</small>
                    <select class="form-select form-select-sm visit-time" style="width: 100px;" data-index="${index}">
                        <option value="30" ${visitTime === 30 ? 'selected' : ''}>30분</option>
                        <option value="60" ${visitTime === 60 ? 'selected' : ''}>1시간</option>
                        <option value="90" ${visitTime === 90 ? 'selected' : ''}>1시간 30분</option>
                        <option value="120" ${visitTime === 120 ? 'selected' : ''}>2시간</option>
                        <option value="180" ${visitTime === 180 ? 'selected' : ''}>3시간</option>
                    </select>
                </div>
                
                <div class="navigation-links">
                    <a href="${getNaverDirectionUrl(null, null, getPlaceCoords(place))}" target="_blank" class="btn btn-sm btn-outline-success" title="네이버 길찾기">
                        <i class="fas fa-map-marker-alt"></i> <small>길찾기</small>
                    </a>
                </div>
            </div>
        </li>`;
    });
    
    container.innerHTML = html;
    
    // 삭제 버튼 이벤트 처리
    const removeButtons = container.querySelectorAll('.remove-place');
    removeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removePlace(index);
        });
    });
    
    // 방문 시간 변경 이벤트 처리
    const visitTimeSelects = container.querySelectorAll('.visit-time');
    visitTimeSelects.forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const newTime = parseInt(this.value);
            if (index >= 0 && index < selectedPlaces.length) {
                selectedPlaces[index].RESIDENCE_TIME_MIN = newTime;
                console.log(`${selectedPlaces[index].VISIT_AREA_NM}의 방문 시간이 ${newTime}분으로 변경되었습니다.`);
                
                // 일정표 업데이트
                const isOptimize = document.getElementById('optimize-option')?.checked || false;
                if (selectedPlaces.length > 1) {
                    updateItineraryImproved(isOptimize ? findOptimalRoute(selectedPlaces) : selectedPlaces);
                }
            }
        });
    });
    
    // 드래그 앤 드롭 기능 추가
    makePlaceListSortable();
}

// 장소 좌표 얻기 (네이버 링크용)
function getPlaceCoords(place) {
    let lat, lng;
    
    if (place.YDNTS_VALUE) {
        lat = parseFloat(place.YDNTS_VALUE);
    } else if (place.Y_COORD) {
        lat = parseFloat(place.Y_COORD);
    }
    
    if (place.XCNTS_VALUE) {
        lng = parseFloat(place.XCNTS_VALUE);
    } else if (place.X_COORD) {
        lng = parseFloat(place.X_COORD);
    }
    
    return {lat, lng};
}

// 네이버 길찾기 URL 생성
function getNaverDirectionUrl(startCoords, waypointCoords, endCoords) {
    // 현재 위치에서 목적지까지
    if (!startCoords) {
        return `https://map.naver.com/v5/directions/-/-/${endCoords.lng},${endCoords.lat},${encodeURIComponent('목적지')}/-?c=14,0,0,0,dh`;
    }
    
    // 시작점에서 목적지까지
    if (!waypointCoords) {
        return `https://map.naver.com/v5/directions/${startCoords.lng},${startCoords.lat},${encodeURIComponent('출발지')}/-/${endCoords.lng},${endCoords.lat},${encodeURIComponent('목적지')}/-?c=14,0,0,0,dh`;
    }
    
    // 경유지 포함 경로
    let url = `https://map.naver.com/v5/directions/${startCoords.lng},${startCoords.lat},${encodeURIComponent('출발지')}/`;
    
    // 경유지 추가
    if (Array.isArray(waypointCoords)) {
        waypointCoords.forEach((coords, index) => {
            url += `${coords.lng},${coords.lat},${encodeURIComponent('경유지' + (index + 1))}/`;
        });
    } else {
        url += `${waypointCoords.lng},${waypointCoords.lat},${encodeURIComponent('경유지')}/`;
    }
    
    url += `${endCoords.lng},${endCoords.lat},${encodeURIComponent('목적지')}/-?c=14,0,0,0,dh`;
    
    return url;
}

// 장소 삭제 함수
function removePlace(index) {
    if (index >= 0 && index < selectedPlaces.length) {
        // 마커 제거
        if (markers[index]) {
            map.removeLayer(markers[index]);
            markers.splice(index, 1);
        }
        
        // 장소 제거
        selectedPlaces.splice(index, 1);
        
        // 목록 업데이트
        updateSelectedPlacesList();
        
        // 경로 업데이트
        if (routePath) {
            if (Array.isArray(routePath)) {
                routePath.forEach(path => map.removeLayer(path));
            } else {
                map.removeLayer(routePath);
            }
            routePath = null;
        }
        
        // 경로 다시 그리기 (2개 이상 남았을 때)
        if (selectedPlaces.length >= 2) {
            const isOptimize = document.getElementById('optimize-option')?.checked || false;
            optimizeRoute(isOptimize);
        }
        
        // 선택된 장소 수 업데이트
        if (window.updateSelectedCount) {
            window.updateSelectedCount();
        }
    }
}

// 지도에 마커 추가
function addMarkerToMap(place) {
    if (!map) return;
    
    // 좌표 확인
    let lat, lng;
    
    // X_COORD/Y_COORD 또는 XCNTS_VALUE/YDNTS_VALUE 중 하나를 사용
    if (place.YDNTS_VALUE) {
        lat = parseFloat(place.YDNTS_VALUE);
    } else if (place.Y_COORD) {
        lat = parseFloat(place.Y_COORD);
    }
    
    if (place.XCNTS_VALUE) {
        lng = parseFloat(place.XCNTS_VALUE);
    } else if (place.X_COORD) {
        lng = parseFloat(place.X_COORD);
    }
    
    // 좌표가 유효한지 확인
    if (isNaN(lat) || isNaN(lng)) {
        console.error('유효하지 않은 좌표:', place.VISIT_AREA_NM, lat, lng);
        
        // 좌표가 없으면 서울 중심으로 설정
        lat = 37.5665;
        lng = 126.9780;
    }
    
    // 마커 아이콘 설정
    const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
    
    // 마커 색상 설정 (카테고리별)
    const markerColors = {
        1: 'green',    // 자연 관광지
        2: 'red',      // 문화/역사/종교시설
        3: 'purple',   // 문화시설
        4: 'orange',   // 상업지구
        5: 'blue',     // 레저/스포츠
        6: 'darkpurple', // 테마시설
        11: 'cadetblue'  // 식당/카페
    };
    
    const markerColor = markerColors[place.VISIT_AREA_TYPE_CD] || 'blue';
    const markerNumber = markers.length + 1;
    
    // 마커 아이콘 설정
    const markerIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold;">${markerNumber}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    // 마커 생성 및 팝업 추가
    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
    marker.bindPopup(`
        <strong>${place.VISIT_AREA_NM}</strong><br>
        <small>${place.ROAD_NM_ADDR || place.LOTNO_ADDR || ''}</small><br>
        <span class="badge bg-primary">${categoryInfo.name}</span>
        <div class="mt-2">
            <small>방문 시간: ${place.RESIDENCE_TIME_MIN || 90}분</small>
            <div class="mt-2">
                <a href="${getNaverDirectionUrl(null, null, {lat, lng})}" target="_blank" class="btn btn-sm btn-success w-100">
                    <i class="fas fa-map-marker-alt"></i> 네이버 길찾기
                </a>
            </div>
        </div>
    `);
    
    markers.push(marker);
    
    // 마커에 맞게 지도 조정
    if (markers.length === 1) {
        map.setView([lat, lng], 14);
    } else {
        // 모든 마커가 보이도록 지도 확대/축소 조정
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// 지도 지역 업데이트 함수
function updateMapForRegion(region) {
    if (!map) {
        console.error('지도가 초기화되지 않았습니다.');
        return;
    }
    
    // 기존 마커 제거
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // 경로 제거
    if (routePath) {
        if (Array.isArray(routePath)) {
            routePath.forEach(path => map.removeLayer(path));
        } else {
            map.removeLayer(routePath);
        }
        routePath = null;
    }
    
    console.log('지역에 맞게 지도 업데이트:', region);
    
    // 지역별 중심점 및 줌 레벨 설정
    const regionCoords = {
        '서울특별시': { center: [37.5665, 126.9780], zoom: 11 },
        '경기도': { center: [37.4138, 127.5183], zoom: 9 },
        '강원도': { center: [37.8228, 128.1555], zoom: 8 },
        '충청북도': { center: [36.8000, 127.7000], zoom: 9 },
        '충청남도': { center: [36.5184, 126.8000], zoom: 9 },
        '전라북도': { center: [35.8196, 127.1088], zoom: 9 },
        '전라남도': { center: [34.8160, 126.4629], zoom: 9 },
        '경상북도': { center: [36.4919, 128.8889], zoom: 8 },
        '경상남도': { center: [35.4606, 128.2132], zoom: 9 },
        '제주도': { center: [33.4890, 126.4983], zoom: 10 }
    };
    
    if (regionCoords[region]) {
        map.setView(regionCoords[region].center, regionCoords[region].zoom);
    } else {
        // 기본값: 한국 중심
        map.setView([36.5, 127.5], 7);
    }
}

// 두 지점 간의 거리 계산 (Haversine 공식)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = value => value * Math.PI / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = EARTH_RADIUS_KM * c;
    
    return distance; // 킬로미터 단위
}

// 이동 시간 추정 (거리에 기반)
function estimateTravelTime(lat1, lon1, lat2, lon2) {
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    // 평균 속도로 나누어 시간(분) 계산, 기본 10분 이상
    const timeInHours = distance / AVERAGE_SPEED_KM_PER_HOUR;
    const timeInMinutes = Math.max(Math.round(timeInHours * 60), 10);
    
    return timeInMinutes;
}

// 최적 경로 계산 함수
function optimizeRoute(useOptimization = true) {
    console.log('최적 경로 계산 함수 실행됨 (최적화 모드:', useOptimization, ')');
    console.log('선택된 장소 수:', selectedPlaces.length);
    
    if (selectedPlaces.length < 2) {
        alert('최소 2개 이상의 장소를 선택해주세요.');
        return;
    }
    
    try {
        // 기존 경로 제거
        if (routePath) {
            if (Array.isArray(routePath)) {
                routePath.forEach(path => map.removeLayer(path));
            } else {
                map.removeLayer(routePath);
            }
            routePath = null;
        }
        
        // 최적 경로 계산 (순서 최적화)
        let orderedPlaces = selectedPlaces;
        if (useOptimization) {
            orderedPlaces = findOptimalRoute(selectedPlaces);
        }
        
        // 경로 그리기 (내비게이션 같은 느낌)
        drawRouteWithCurves(orderedPlaces);
        
        // 일정표 업데이트 (개선된 알고리즘)
        updateItineraryImproved(orderedPlaces);
        
        console.log('경로가 성공적으로 그려졌습니다.');
    } catch (error) {
        console.error('경로 계산 중 오류 발생:', error);
        alert('경로 계산 중 오류가 발생했습니다: ' + error.message);
    }
}

// 최적 경로 계산 (최근접 이웃 알고리즘)
function findOptimalRoute(places) {
    console.log('최적 경로 계산 중...');
    
    // 유효한 장소만 필터링
    const validPlaces = places.filter(place => {
        let hasCoords = false;
        
        if ((place.YDNTS_VALUE || place.Y_COORD) && (place.XCNTS_VALUE || place.X_COORD)) {
            const lat = parseFloat(place.YDNTS_VALUE || place.Y_COORD);
            const lng = parseFloat(place.XCNTS_VALUE || place.X_COORD);
            hasCoords = !isNaN(lat) && !isNaN(lng);
        }
        
        return hasCoords;
    });
    
    if (validPlaces.length < 2) {
        console.warn('유효한 좌표가 있는 장소가 충분하지 않습니다.');
        return places;
    }
    
    // 거리 행렬 계산
    const n = validPlaces.length;
    const distanceMatrix = Array(n).fill().map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            
            const place1 = validPlaces[i];
            const place2 = validPlaces[j];
            
            const lat1 = parseFloat(place1.YDNTS_VALUE || place1.Y_COORD);
            const lng1 = parseFloat(place1.XCNTS_VALUE || place1.X_COORD);
            const lat2 = parseFloat(place2.YDNTS_VALUE || place2.Y_COORD);
            const lng2 = parseFloat(place2.XCNTS_VALUE || place2.X_COORD);
            
            distanceMatrix[i][j] = calculateDistance(lat1, lng1, lat2, lng2);
        }
    }
    
    // 최근접 이웃 알고리즘 (Nearest Neighbor)
    const visited = Array(n).fill(false);
    const route = [0]; // 첫 번째 장소를 시작점으로
    visited[0] = true;
    
    for (let i = 1; i < n; i++) {
        let lastIdx = route[route.length - 1];
        let nearestIdx = -1;
        let minDist = Infinity;
        
        for (let j = 0; j < n; j++) {
            if (!visited[j] && distanceMatrix[lastIdx][j] < minDist) {
                nearestIdx = j;
                minDist = distanceMatrix[lastIdx][j];
            }
        }
        
        if (nearestIdx !== -1) {
            route.push(nearestIdx);
            visited[nearestIdx] = true;
        }
    }
    
    // 결과 경로에 따라 장소 재정렬
    const orderedPlaces = route.map(idx => validPlaces[idx]);
    
    console.log('최적화된 경로 계산 완료:', orderedPlaces.map(p => p.VISIT_AREA_NM));
    return orderedPlaces;
}

// 경로 그리기 함수 (내비게이션 같은 느낌으로 수정)
function drawRouteWithCurves(places) {
    if (!map) return;
    
    const points = [];
    const validPlaces = [];
    
    // 좌표 추출 및 검증
    for (const place of places) {
        let lat, lng;
        
        if (place.YDNTS_VALUE) {
            lat = parseFloat(place.YDNTS_VALUE);
        } else if (place.Y_COORD) {
            lat = parseFloat(place.Y_COORD);
        }
        
        if (place.XCNTS_VALUE) {
            lng = parseFloat(place.XCNTS_VALUE);
        } else if (place.X_COORD) {
            lng = parseFloat(place.X_COORD);
        }
        
        if (isNaN(lat) || isNaN(lng)) {
            continue;
        }
        
        points.push([lat, lng]);
        validPlaces.push(place);
    }
    
    if (points.length < 2) {
        console.error('유효한 좌표가 있는 장소가 2개 미만입니다.');
        return;
    }
    
    // 마커 업데이트 (번호 재설정)
    for (let i = 0; i < markers.length; i++) {
        if (markers[i]) {
            map.removeLayer(markers[i]);
        }
    }
    
    markers = []; // 마커 배열 초기화
    
    // 새 순서로 마커 다시 생성
    for (let i = 0; i < validPlaces.length; i++) {
        const place = validPlaces[i];
        let lat, lng;
        
        if (place.YDNTS_VALUE) {
            lat = parseFloat(place.YDNTS_VALUE);
        } else if (place.Y_COORD) {
            lat = parseFloat(place.Y_COORD);
        }
        
        if (place.XCNTS_VALUE) {
            lng = parseFloat(place.XCNTS_VALUE);
        } else if (place.X_COORD) {
            lng = parseFloat(place.X_COORD);
        }
        
        if (isNaN(lat) || isNaN(lng)) continue;
        
        // 마커 색상 설정 (카테고리별)
        const markerColors = {
            1: 'green',    // 자연 관광지
            2: 'red',      // 문화/역사/종교시설
            3: 'purple',   // 문화시설
            4: 'orange',   // 상업지구
            5: 'blue',     // 레저/스포츠
            6: 'darkpurple', // 테마시설
            11: 'cadetblue'  // 식당/카페
        };
        
        const markerColor = markerColors[place.VISIT_AREA_TYPE_CD] || 'blue';
        const markerNumber = i + 1; // 인덱스 기반 번호 부여
        
        // 마커 아이콘 설정
        const markerIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${markerColor}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold;">${markerNumber}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // 마커 생성 및 팝업 추가
        const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
        const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
        marker.bindPopup(`
            <strong>${place.VISIT_AREA_NM}</strong><br>
            <small>${place.ROAD_NM_ADDR || place.LOTNO_ADDR || ''}</small><br>
            <span class="badge bg-primary">${categoryInfo.name}</span>
            <div class="mt-2">
                <small>방문 시간: ${place.RESIDENCE_TIME_MIN || 90}분</small>
                <div class="mt-2">
                    <a href="${getNaverDirectionUrl(null, null, {lat, lng})}" target="_blank" class="btn btn-sm btn-success w-100">
                        <i class="fas fa-map-marker-alt"></i> 네이버 길찾기
                    </a>
                </div>
            </div>
        `);
        
        markers.push(marker);
    }
    
    // 내비게이션 느낌을 위해 점 사이에 여러 중간 지점을 추가
    const pathSegments = [];
    const pathArrows = [];
    
    for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        
        // 두 점 사이의 직선거리
        const distance = calculateDistance(from[0], from[1], to[0], to[1]);
        
        // 거리에 따라 중간점 개수 조절 (거리가 멀수록 중간점 많이)
        const numPoints = Math.max(2, Math.min(10, Math.floor(distance * 2)));
        
        // 중간점 계산
        const enhancedPoints = [from];
        
        for (let j = 1; j < numPoints; j++) {
            const ratio = j / numPoints;
            
            // 직선 보간
            const midLat = from[0] + (to[0] - from[0]) * ratio;
            const midLng = from[1] + (to[1] - from[1]) * ratio;
            
            // 내비 느낌을 주기 위한 랜덤 오프셋 추가
            const offsetSize = Math.min(0.005, distance * 0.03); // 거리에 따라 오프셋 크기 조절
            const randomLat = midLat + (Math.random() - 0.5) * offsetSize;
            const randomLng = midLng + (Math.random() - 0.5) * offsetSize;
            
            enhancedPoints.push([randomLat, randomLng]);
        }
        
        enhancedPoints.push(to);
        
        // 경로 그리기
        const pathSegment = L.polyline(enhancedPoints, {
            color: 'blue',
            weight: 4,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map);
        
        pathSegments.push(pathSegment);
        
        // 경로 중간에 화살표 추가 (방향 표시)
        const middleIndex = Math.floor(enhancedPoints.length / 2);
        const arrowPoint = enhancedPoints[middleIndex];
        
        // 진행 방향 계산
        const prevPoint = enhancedPoints[middleIndex - 1];
        const nextPoint = enhancedPoints[middleIndex + 1];
        const angle = Math.atan2(nextPoint[0] - prevPoint[0], nextPoint[1] - prevPoint[1]) * 180 / Math.PI;
        
        // 화살표 마커
        const arrowIcon = L.divIcon({
            className: 'route-arrow-icon',
            html: `<div style="width: 20px; height: 20px; background-color: white; border: 2px solid blue; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 12px; transform: rotate(${angle}deg)">→</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        const arrowMarker = L.marker(arrowPoint, { icon: arrowIcon }).addTo(map);
        pathArrows.push(arrowMarker);
    }
    
    // 경로 그룹 저장 (모든 경로 및 화살표 모음)
    routePath = [...pathSegments, ...pathArrows];
    
    // 지도가 경로를 포함하도록 조정
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.1));
    
    // 선택된 장소 목록 변경 (최적화된 순서로)
    if (places !== selectedPlaces) {
        selectedPlaces = [...places]; // 배열 복사
        updateSelectedPlacesList();
    }
}

// 개선된 일정표 생성 함수
function updateItineraryImproved(validPlaces) {
    const tableBody = document.querySelector('#itinerary-table tbody');
    if (!tableBody) return;
    
    if (validPlaces.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">선택된 장소가 없습니다.</td></tr>';
        return;
    }
    
    // 일정 설정
    const days = parseInt(document.getElementById('days').value) || 3;
    
    // 일정표 생성
    let html = '';
    
    // 각 날짜별 시작 시간
    const dayStartTime = 9 * 60; // 09:00 (분 단위)
    const dayEndTime = 21 * 60;  // 21:00 (분 단위)
    
    // 총 이동 거리 계산
    let totalDistance = 0;
    for (let i = 0; i < validPlaces.length - 1; i++) {
        const place1 = validPlaces[i];
        const place2 = validPlaces[i+1];
        
        const lat1 = parseFloat(place1.YDNTS_VALUE || place1.Y_COORD);
        const lng1 = parseFloat(place1.XCNTS_VALUE || place1.X_COORD);
        const lat2 = parseFloat(place2.YDNTS_VALUE || place2.Y_COORD);
        const lng2 = parseFloat(place2.XCNTS_VALUE || place2.X_COORD);
        
        if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
            totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
        }
    }
    
    // 일자별 장소 분배 (균등하게)
    const placesPerDay = Math.ceil(validPlaces.length / days);
    
    for (let day = 0; day < days; day++) {
        const startIdx = day * placesPerDay;
        const endIdx = Math.min((day + 1) * placesPerDay, validPlaces.length);
        
        // 각 날짜의 장소 수
        const dayPlaces = validPlaces.slice(startIdx, endIdx);
        
        if (dayPlaces.length === 0) {
            html += `
            <tr>
                <td rowspan="1">Day ${day + 1}</td>
                <td colspan="3" class="text-center text-muted">계획된 일정이 없습니다.</td>
            </tr>`;
            continue;
        }
        
        let currentTime = dayStartTime; // 분 단위로 시간 관리
        let lastLat = null, lastLng = null;
        
        // 각 장소에 대한 일정 생성
        for (let i = 0; i < dayPlaces.length; i++) {
            const place = dayPlaces[i];
            
            // 좌표 추출
            let lat, lng;
            if (place.YDNTS_VALUE) {
                lat = parseFloat(place.YDNTS_VALUE);
            } else if (place.Y_COORD) {
                lat = parseFloat(place.Y_COORD);
            }
            
            if (place.XCNTS_VALUE) {
                lng = parseFloat(place.XCNTS_VALUE);
            } else if (place.X_COORD) {
                lng = parseFloat(place.X_COORD);
            }
            
            // 첫 번째 장소가 아니면 이전 장소에서의 이동 시간 계산
            let travelTime = 0;
            let travelDistance = 0;
            if (lastLat !== null && lastLng !== null) {
                travelDistance = calculateDistance(lastLat, lastLng, lat, lng);
                travelTime = estimateTravelTime(lastLat, lastLng, lat, lng);
                
                // 이동 시간 표시 (10분 이상일 때만)
                if (travelTime >= 10) {
                    const moveStartTime = formatTime(currentTime);
                    currentTime += travelTime;
                    const moveEndTime = formatTime(currentTime);
                    
                    html += `
                    <tr class="table-light">
                        ${i === 0 ? `<td rowspan="${dayPlaces.length * 2 - 1}">Day ${day + 1}</td>` : ''}
                        <td>${moveStartTime} - ${moveEndTime}</td>
                        <td><i class="fas fa-car text-muted"></i> 이동 시간</td>
                        <td>약 ${travelTime}분 소요 (${travelDistance.toFixed(1)}km)</td>
                    </tr>`;
                } else {
                    // 이동 시간이 짧으면 조금만 추가
                    currentTime += 5;
                }
            }
            
            // 방문 시간 계산
            const visitTime = place.RESIDENCE_TIME_MIN || 90;
            const visitStartTime = formatTime(currentTime);
            currentTime += visitTime;
            const visitEndTime = formatTime(currentTime);
            
            // 방문 종료 시간이 너무 늦으면 경고
            const isLate = currentTime > dayEndTime;
            
            // 장소 유형에 따른 아이콘 및 카테고리
            const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
            
            // 네이버 지도 URL
            const naverMapUrl = getNaverDirectionUrl(null, null, {lat, lng});
            
            html += `
            <tr${isLate ? ' class="table-warning"' : ''}>
                ${i === 0 && travelTime < 10 ? `<td rowspan="${dayPlaces.length * 2 - 1}">Day ${day + 1}</td>` : ''}
                <td>${visitStartTime} - ${visitEndTime}</td>
                <td>
                    <i class="${categoryInfo.icon} me-2"></i>
                    ${place.VISIT_AREA_NM}
                    ${isLate ? '<span class="badge bg-warning text-dark ms-2">늦은 시간</span>' : ''}
                </td>
                <td>
                    ${place.ROAD_NM_ADDR || place.LOTNO_ADDR || ''}
                    <a href="${naverMapUrl}" target="_blank" class="btn btn-sm btn-outline-success ms-2">
                        <i class="fas fa-map-marker-alt"></i> 길찾기
                    </a>
                </td>
            </tr>`;
            
            // 마지막 방문 좌표 저장
            lastLat = lat;
            lastLng = lng;
            
            // 방문 후 휴식 시간 (마지막 장소가 아닌 경우만)
            if (i < dayPlaces.length - 1 && currentTime + 30 < dayEndTime) {
                currentTime += 30; // 30분 휴식
            }
        }
    }
    
    // 경로 요약 정보 추가
    html += `
    <tr class="table-info">
        <td colspan="4">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>총 이동 거리:</strong> ${totalDistance.toFixed(1)}km
                    <span class="ms-3"><strong>총 장소 수:</strong> ${validPlaces.length}개</span>
                </div>
                <div>
                    <a href="${generateFullRouteNaverUrl(validPlaces)}" target="_blank" class="btn btn-success btn-sm">
                        <i class="fas fa-map-marked-alt"></i> 전체 경로 네이버 지도에서 보기
                    </a>
                </div>
            </div>
        </td>
    </tr>`;
    
    tableBody.innerHTML = html;
}

// 전체 경로에 대한 네이버 URL 생성
function generateFullRouteNaverUrl(places) {
    if (places.length < 2) return '#';
    
    // 장소 좌표 추출
    const coords = places.map(place => {
        let lat, lng;
        
        if (place.YDNTS_VALUE) {
            lat = parseFloat(place.YDNTS_VALUE);
        } else if (place.Y_COORD) {
            lat = parseFloat(place.Y_COORD);
        }
        
        if (place.XCNTS_VALUE) {
            lng = parseFloat(place.XCNTS_VALUE);
        } else if (place.X_COORD) {
            lng = parseFloat(place.X_COORD);
        }
        
        return {lat, lng, name: place.VISIT_AREA_NM};
    }).filter(coord => !isNaN(coord.lat) && !isNaN(coord.lng));
    
    if (coords.length < 2) return '#';
    
    // 첫 번째와 마지막 장소
    const start = coords[0];
    const end = coords[coords.length - 1];
    
    // 중간 경유지 (최대 3개만 - 네이버 지도 제한)
    const waypoints = coords.slice(1, coords.length - 1);
    const useWaypoints = waypoints.slice(0, Math.min(3, waypoints.length));
    
    // URL 생성
    let url = `https://map.naver.com/v5/directions/${start.lng},${start.lat},${encodeURIComponent(start.name)}/`;
    
    // 경유지 추가
    useWaypoints.forEach(wp => {
        url += `${wp.lng},${wp.lat},${encodeURIComponent(wp.name)}/`;
    });
    
    // 도착지 추가
    url += `${end.lng},${end.lat},${encodeURIComponent(end.name)}/-?c=14,0,0,0,dh`;
    
    return url;
}

// 시간 포맷 함수 (분 -> HH:MM)
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// 경로 모드 전환 토글 추가
function addRouteModeToggle() {
    // 이미 있는지 확인
    if (document.getElementById('route-mode-toggle')) return;
    
    const optimizeBtn = document.getElementById('optimize-route');
    if (!optimizeBtn) return;
    
    // 부모 요소 찾기
    const parent = optimizeBtn.parentElement;
    
    // 체크박스 + 라벨 생성
    const toggleHTML = `
    <div class="form-check mt-2">
        <input class="form-check-input" type="checkbox" id="optimize-option" checked>
        <label class="form-check-label" for="optimize-option">
            최적 경로로 자동 정렬
        </label>
    </div>
    <div class="text-muted small mt-1">
        <i class="fas fa-info-circle"></i> 체크 해제 시 선택한 순서대로 경로가 계산됩니다.
    </div>
    `;
    
    // 옵션 추가
    const toggleDiv = document.createElement('div');
    toggleDiv.id = 'route-mode-toggle';
    toggleDiv.innerHTML = toggleHTML;
    parent.insertBefore(toggleDiv, optimizeBtn);
    
    // 선택된 장소 목록에 드래그 앤 드롭 기능 추가
    makePlaceListSortable();
}

// 선택된 장소 목록 정렬 가능하게 만들기
function makePlaceListSortable() {
    const container = document.getElementById('selected-places');
    if (!container) return;
    
    // 간단한 드래그 앤 드롭 구현
    let draggedItem = null;
    
    container.addEventListener('dragstart', function(e) {
        if (e.target.classList.contains('list-group-item')) {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.innerHTML);
            e.target.style.opacity = '0.5';
        }
    });
    
    container.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (e.target.classList.contains('list-group-item')) {
            e.target.style.borderTop = '2px solid #007bff';
        }
    });
    
    container.addEventListener('dragleave', function(e) {
        if (e.target.classList.contains('list-group-item')) {
            e.target.style.borderTop = '';
        }
    });
    
    container.addEventListener('drop', function(e) {
        e.preventDefault();
        
        if (e.target.classList.contains('list-group-item') && draggedItem) {
            // 인덱스 찾기
            const items = Array.from(container.querySelectorAll('.list-group-item'));
            const fromIndex = items.indexOf(draggedItem);
            const toIndex = items.indexOf(e.target);
            
            // 순서 변경
            if (fromIndex !== -1 && toIndex !== -1) {
                // 선택된 장소 배열 업데이트
                const movedPlace = selectedPlaces.splice(fromIndex, 1)[0];
                selectedPlaces.splice(toIndex, 0, movedPlace);
                
                // 마커 배열 업데이트
                if (markers.length > 0) {
                    const movedMarker = markers.splice(fromIndex, 1)[0];
                    markers.splice(toIndex, 0, movedMarker);
                }
                
                // UI 업데이트
                updateSelectedPlacesList();
                
                // 경로 업데이트 (최적화 모드가 아닌 경우)
                const isOptimize = document.getElementById('optimize-option')?.checked || false;
                if (!isOptimize && selectedPlaces.length > 1) {
                    // 경로 다시 그리기
                    if (routePath && map) {
                        if (Array.isArray(routePath)) {
                            routePath.forEach(path => map.removeLayer(path));
                        } else {
                            map.removeLayer(routePath);
                        }
                        routePath = null;
                    }
                    drawRouteWithCurves(selectedPlaces);
                    updateItineraryImproved(selectedPlaces);
                }
            }
            
            // 스타일 초기화
            e.target.style.borderTop = '';
            draggedItem.style.opacity = '';
            draggedItem = null;
        }
    });
    
    container.addEventListener('dragend', function(e) {
        if (e.target.classList.contains('list-group-item')) {
            e.target.style.opacity = '';
            
            // 모든 테두리 초기화
            const items = container.querySelectorAll('.list-group-item');
            items.forEach(item => {
                item.style.borderTop = '';
            });
        }
    });
}

// 인기 경로 버튼 이벤트 설정
function setupPopularRouteButtons() {
    const loadRouteButtons = document.querySelectorAll('.load-route-btn');
    loadRouteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.card');
            const routeName = card.querySelector('.card-header').textContent;
            const placeElements = card.querySelectorAll('.list-group-item');
            
            // 기존 선택 초기화 확인
            if (selectedPlaces.length > 0) {
                if (!confirm('기존에 선택한 장소를 모두 지우고 이 코스를 불러올까요?')) {
                    return;
                }
                
                // 기존 선택 초기화
                selectedPlaces = [];
                markers.forEach(marker => map.removeLayer(marker));
                markers = [];
                
                if (routePath) {
                    if (Array.isArray(routePath)) {
                        routePath.forEach(path => map.removeLayer(path));
                    } else {
                        map.removeLayer(routePath);
                    }
                    routePath = null;
                }
            }
            
            loadPopularRoute(routeName, Array.from(placeElements).map(item => item.textContent));
        });
    });
}

// 인기 경로 로드 함수
async function loadPopularRoute(routeName, placeNames) {
    console.log(`"${routeName}" 코스 불러오기:`, placeNames);
    
    // 플래그 지역 설정
    let region = '서울특별시'; // 기본값
    if (routeName.includes('제주')) region = '제주도';
    else if (routeName.includes('부산')) region = '부산광역시';
    
    try {
        // 더미 데이터 생성 (실제로는 API에서 해당 장소 정보를 가져와야 함)
        for (let i = 0; i < placeNames.length; i++) {
            const placeName = placeNames[i];
            
            // 장소 타입 추정
            let placeType = 2; // 기본: 문화/역사/종교시설
            if (placeName.includes('해수욕장') || placeName.includes('공원')) placeType = 1; // 자연
            else if (placeName.includes('카페') || placeName.includes('시장')) placeType = 11; // 식당/카페
            
            // 더미 좌표 설정 (지역별로 달라지도록)
            const baseCoords = {
                '서울특별시': [37.5665, 126.9780],
                '부산광역시': [35.1796, 129.0756],
                '제주도': [33.4890, 126.4983]
            }[region];
            
            // 약간의 좌표 변화
            const lat = baseCoords[0] + (i - placeNames.length/2) * 0.01;
            const lng = baseCoords[1] + (i - placeNames.length/2) * 0.01;
            
            // 더미 장소 데이터
            const dummyPlace = {
                VISIT_AREA_ID: `popular-${region}-${i}`,
                VISIT_AREA_NM: placeName,
                VISIT_AREA_TYPE_CD: placeType,
                ROAD_NM_ADDR: `${region} 인기 코스 ${i+1}`,
                LOTNO_ADDR: `${region} 인기 코스 ${i+1}`,
                DGSTFN: 4.5,
                X_COORD: lng,
                Y_COORD: lat,
                XCNTS_VALUE: lng.toString(),
                YDNTS_VALUE: lat.toString(),
                SIDO_NM: region,
                RESIDENCE_TIME_MIN: 90
            };
            
            addPlaceToSelection(dummyPlace);
        }
        
        // 경로 계산
        optimizeRoute();
        
        // 성공 메시지
        alert(`"${routeName}" 코스를 성공적으로 불러왔습니다.`);
        
    } catch (error) {
        console.error('인기 코스 불러오기 오류:', error);
        alert('인기 코스를 불러오는 중 오류가 발생했습니다.');
    }
}

// 일정표 관련 버튼 이벤트 설정
function setupItineraryButtons() {
    // 일정표 저장 버튼
    const saveItineraryBtn = document.getElementById('save-itinerary');
    if (saveItineraryBtn) {
        saveItineraryBtn.addEventListener('click', function() {
            if (selectedPlaces.length === 0) {
                alert('저장할 일정이 없습니다. 장소를 선택해주세요.');
                return;
            }
            
            saveItinerary();
        });
    }
    
    // 일정 공유 버튼
    const shareItineraryBtn = document.getElementById('share-itinerary');
    if (shareItineraryBtn) {
        shareItineraryBtn.addEventListener('click', function() {
            if (selectedPlaces.length === 0) {
                alert('공유할 일정이 없습니다. 장소를 선택해주세요.');
                return;
            }
            
            shareItinerary();
        });
    }
}

// 일정표 저장 함수
function saveItinerary() {
    try {
        // 일정 데이터 준비
        const itineraryData = {
            title: `${selectedRegion || '나의'} 여행 일정`,
            days: parseInt(document.getElementById('days').value) || 3,
            createdAt: new Date().toISOString(),
            places: selectedPlaces.map(place => ({
                id: place.VISIT_AREA_ID,
                name: place.VISIT_AREA_NM,
                type: place.VISIT_AREA_TYPE_CD,
                address: place.ROAD_NM_ADDR || place.LOTNO_ADDR,
                coords: {
                    lat: place.YDNTS_VALUE || place.Y_COORD,
                    lng: place.XCNTS_VALUE || place.X_COORD
                },
                visitTime: place.RESIDENCE_TIME_MIN || 90
            }))
        };
        
        // 로컬 스토리지에 저장 (실제로는 서버에 저장하는 API 호출)
        const savedItineraries = JSON.parse(localStorage.getItem('savedItineraries') || '[]');
        savedItineraries.push(itineraryData);
        localStorage.setItem('savedItineraries', JSON.stringify(savedItineraries));
        
        alert('일정이 저장되었습니다.');
    } catch (error) {
        console.error('일정 저장 오류:', error);
        alert('일정을 저장하는 중 오류가 발생했습니다.');
    }
}

// 일정표 공유 함수
function shareItinerary() {
    try {
        // 공유용 ID 생성 (실제로는 서버에서 생성)
        const shareId = 'IT' + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // 공유 URL 생성
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
        
        // 클립보드에 복사
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`공유 URL이 클립보드에 복사되었습니다:\n${shareUrl}`);
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
            alert(`공유 URL: ${shareUrl}`);
        });
    } catch (error) {
        console.error('일정 공유 오류:', error);
        alert('일정을 공유하는 중 오류가 발생했습니다.');
    }
}

// URL 공유 파라미터 확인 (페이지 로드 시)
function checkShareParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    
    if (shareId) {
        console.log('공유 ID 발견:', shareId);
        // 실제로는 서버에서 공유 ID에 해당하는 일정 데이터를 가져와야 함
        alert(`공유된 일정(ID: ${shareId})을 불러옵니다. 실제 구현에서는 서버에서 데이터를 가져옵니다.`);
    }
}

// 페이지 로드 시 공유 파라미터 확인
document.addEventListener('DOMContentLoaded', function() {
    checkShareParameter();
});

// 전역 함수로 노출
window.switchCategory = switchCategory;
window.scrollCards = scrollCards;