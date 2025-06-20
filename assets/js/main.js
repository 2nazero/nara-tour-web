// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM이 로드되었습니다.');
    
    // 현재 페이지 파악
    const currentPath = window.location.pathname;
    console.log('현재 페이지 경로:', currentPath);
    
    // 메인 페이지에서만 실행되는 코드
    if (
        currentPath === '/' ||
        currentPath.endsWith('index.html') ||
        currentPath.endsWith('/naratour/') ||
        currentPath.endsWith('/naratour')
    ) {
        console.log('메인 페이지 코드 실행 중...');
        
        // 요소 존재 여부 확인
        const container = document.getElementById('popular-destinations-container');
        console.log('컨테이너 요소 찾음:', container);
        
        if (container) {
            // 인기 여행지 데이터 로드
            loadPopularDestinations();
        } else {
            console.error('popular-destinations-container 요소를 찾을 수 없습니다.');
        }
        
        // 지역별 인기 여행지 탭 생성 및 데이터 로드
        const tabsContainer = document.getElementById('region-tabs');
        if (tabsContainer) {
            initializeRegionTabs();
        }

        // 팝업 초기화
        initializePopup();
    }
});

// 팝업 관련 함수들
function initializePopup() {
    // 팝업 이벤트 리스너 등록
    const popupOverlay = document.getElementById('popup-overlay');
    
    if (popupOverlay) {
        // 오버레이 클릭 시 팝업 일시적으로 닫기
        popupOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closePopupTemporary();
            }
        });

        // ESC 키로 팝업 일시적으로 닫기
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && popupOverlay.classList.contains('active')) {
                closePopupTemporary();
            }
        });

        // 페이지 로드 후 팝업 표시 조건 확인
        checkAndShowPopup();
    }
}

function showPopup() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
        popupOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }
}

// 일시적으로 팝업 닫기 (세션 동안만)
function closePopupTemporary() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
        popupOverlay.classList.remove('active');
        document.body.style.overflow = ''; // 스크롤 복원
    }
    
    // 세션 동안 팝업이 닫혔다는 플래그 설정
    sessionStorage.setItem('naratour_popup_closed_temporary', 'true');
    console.log('팝업이 일시적으로 닫혔습니다.');
}

// 오늘 다시 안보기로 팝업 닫기 (24시간)
function closePopupToday() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
        popupOverlay.classList.remove('active');
        document.body.style.overflow = ''; // 스크롤 복원
    }
    
    try {
        const today = new Date().toDateString();
        localStorage.setItem('naratour_popup_hidden_until', today);
        console.log('팝업이 오늘 하루 동안 숨겨졌습니다.');
    } catch (error) {
        console.log('localStorage를 사용할 수 없습니다.');
        // localStorage를 사용할 수 없는 경우 세션 스토리지 사용
        sessionStorage.setItem('naratour_popup_closed_temporary', 'true');
    }
}

// 팝업 표시 조건 확인
function checkAndShowPopup() {
    try {
        const today = new Date().toDateString();
        const hiddenUntil = localStorage.getItem('naratour_popup_hidden_until');
        const closedTemporary = sessionStorage.getItem('naratour_popup_closed_temporary');
        
        // 오늘 다시 안보기로 설정되어 있는지 확인
        if (hiddenUntil === today) {
            console.log('오늘 하루 팝업이 숨겨져 있습니다.');
            return;
        }
        
        // 세션 동안 일시적으로 닫혔는지 확인
        if (closedTemporary === 'true') {
            console.log('이번 세션에서 팝업이 일시적으로 닫혔습니다.');
            return;
        }
        
        // 조건을 만족하면 3초 후 팝업 표시
        setTimeout(() => {
            showPopup();
        }, 3000);
        
    } catch (error) {
        // localStorage를 사용할 수 없는 경우
        console.log('localStorage를 사용할 수 없습니다.');
        const closedTemporary = sessionStorage.getItem('naratour_popup_closed_temporary');
        
        if (closedTemporary !== 'true') {
            setTimeout(showPopup, 3000);
        }
    }
}

// 팝업 상태 리셋 (개발/테스트용)
function resetPopupStatus() {
    try {
        localStorage.removeItem('naratour_popup_hidden_until');
        sessionStorage.removeItem('naratour_popup_closed_temporary');
        console.log('팝업 상태가 리셋되었습니다.');
    } catch (error) {
        console.log('스토리지 리셋 중 오류가 발생했습니다.');
    }
}

// 즉시 팝업 표시 (테스트용)
function showPopupNow() {
    showPopup();
}

// 기존 closePopup 함수는 closePopupTemporary로 동작하도록 변경
function closePopup() {
    closePopupTemporary();
}

// 전역 변수로 데이터 캐싱
let cachedTouristData = null;

// JSONL 파일 로드 및 파싱 함수
async function loadJSONLFile(filePath) {
    if (cachedTouristData) {
        return cachedTouristData;
    }
    
    try {
        const fullPath = `https://gzfs7zdkmhsfxj37ahdxxujk2a0arajr.lambda-url.us-east-1.on.aws`;
        console.log('데이터 로드 시도:', fullPath);
        
        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('로드된 데이터 미리보기:', text.substring(0, 100));
        
        cachedTouristData = text.trim().split('\n')
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error('파싱 오류:', e, line.substring(0, 50) + '...');
                    return null;
                }
            })
            .filter(item => item !== null);
        
        return cachedTouristData;
    } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
        return [];
    }
}

// 인기 여행지 데이터 로드 및 표시
async function loadPopularDestinations() {
    const container = document.getElementById('popular-destinations-container');
    
    try {
        const touristData = await loadJSONLFile();
        if (!touristData || touristData.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p>데이터를 불러올 수 없습니다.</p></div>';
            return;
        }
        
        const popularDestinations = touristData
            .filter(item => item.DGSTFN && item.DGSTFN > 0)
            .sort((a, b) => b.DGSTFN - a.DGSTFN)
            .slice(0, 6);
        
        let html = '';
        popularDestinations.forEach(destination => {
            const name = destination.VISIT_AREA_NM || '이름 없음';
            const address = destination.ROAD_NM_ADDR || destination.LOTNO_ADDR || '';
            const region = destination.SIDO_NM || '';
            const satisfaction = destination.DGSTFN || 0;
            let category = '기타', categoryIcon = 'fas fa-map-marker-alt';
            
            switch (destination.VISIT_AREA_TYPE_CD) {
                case 1:  category = '자연 관광지'; categoryIcon = 'fas fa-mountain'; break;
                case 2:  category = '문화/역사/종교시설'; categoryIcon = 'fas fa-landmark'; break;
                case 3:  category = '문화시설'; categoryIcon = 'fas fa-theater-masks'; break;
                case 4:  category = '상업지구'; categoryIcon = 'fas fa-store'; break;
                case 5:  category = '레저/스포츠'; categoryIcon = 'fas fa-running'; break;
                case 6:  category = '테마시설'; categoryIcon = 'fas fa-ticket-alt'; break;
                case 7:  category = '산책로/둘레길'; categoryIcon = 'fas fa-hiking'; break;
                case 8:  category = '축제/행사'; categoryIcon = 'fas fa-calendar-alt'; break;
                case 9:  category = '교통시설'; categoryIcon = 'fas fa-bus'; break;
                case 10: category = '상점'; categoryIcon = 'fas fa-shopping-bag'; break;
                case 11: category = '식당/카페'; categoryIcon = 'fas fa-utensils'; break;
                case 24: category = '숙소'; categoryIcon = 'fas fa-bed'; break;
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
        const touristData = await loadJSONLFile();
        if (!touristData || touristData.length === 0) return;
        
        // 고유 지역 목록 추출
        const regions = [...new Set(
            touristData
                .filter(item => item.SIDO_NM)
                .map(item => item.SIDO_NM)
        )].sort();
        
        // 탭 메뉴 생성
        const tabsContainer = document.getElementById('region-tabs');
        if (!tabsContainer) return;
        
        let tabsHtml = `
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="all-tab" data-bs-toggle="pill" data-bs-target="#all" type="button" role="tab" aria-controls="all" aria-selected="true">전체</button>
            </li>`;
        regions.forEach(region => {
            const id = region.replace(/\s+/g, '-').toLowerCase();
            tabsHtml += `
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="${id}-tab" data-bs-toggle="pill" data-bs-target="#${id}" type="button" role="tab" aria-controls="${id}" aria-selected="false">${region}</button>
            </li>`;
        });
        tabsContainer.innerHTML = tabsHtml;
        
        // 탭 콘텐츠 생성
        const tabContentContainer = document.getElementById('region-tab-content');
        if (!tabContentContainer) return;
        
        // 전체 탭
        let tabContentHtml = `
            <div class="tab-pane fade show active" id="all" role="tabpanel" aria-labelledby="all-tab">
                <div class="row">`;
        const allPopular = touristData
            .filter(item => item.DGSTFN && item.DGSTFN > 0)
            .sort((a, b) => b.DGSTFN - a.DGSTFN)
            .slice(0, 3);
        allPopular.forEach(dest => {
            tabContentHtml += createDestinationCard(dest);
        });
        tabContentHtml += `
                </div>
            </div>`;
        
        // 지역별 탭
        regions.forEach(region => {
            const regionId = region.replace(/\s+/g, '-').toLowerCase();
            const regionDestinations = touristData
                .filter(item => item.SIDO_NM === region && item.DGSTFN)
                .sort((a, b) => b.DGSTFN - a.DGSTFN)
                .slice(0, 3);
            
            tabContentHtml += `
            <div class="tab-pane fade" id="${regionId}" role="tabpanel" aria-labelledby="${regionId}-tab">
                <div class="row">`;
            
            if (regionDestinations.length > 0) {
                regionDestinations.forEach(dest => {
                    tabContentHtml += createDestinationCard(dest);
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
    const satisfaction = destination.DGSTFN || 0;
    let category = '기타', categoryIcon = 'fas fa-map-marker-alt';
    
    switch (destination.VISIT_AREA_TYPE_CD) {
        case 1:  category = '자연 관광지'; categoryIcon = 'fas fa-mountain'; break;
        case 2:  category = '문화/역사/종교시설'; categoryIcon = 'fas fa-landmark'; break;
        case 3:  category = '문화시설'; categoryIcon = 'fas fa-theater-masks'; break;
        case 4:  category = '상업지구'; categoryIcon = 'fas fa-store'; break;
        case 5:  category = '레저/스포츠'; categoryIcon = 'fas fa-running'; break;
        case 6:  category = '테마시설'; categoryIcon = 'fas fa-ticket-alt'; break;
        case 7:  category = '산책로/둘레길'; categoryIcon = 'fas fa-hiking'; break;
        case 8:  category = '축제/행사'; categoryIcon = 'fas fa-calendar-alt'; break;
        case 9:  category = '교통시설'; categoryIcon = 'fas fa-bus'; break;
        case 10: category = '상점'; categoryIcon = 'fas fa-shopping-bag'; break;
        case 11: category = '식당/카페'; categoryIcon = 'fas fa-utensils'; break;
        case 12: category = '공공시설'; categoryIcon = 'fas fa-building'; break;
        case 13: category = '엔터테인먼트'; categoryIcon = 'fas fa-film'; break;
        case 21: category = '집(본인)'; categoryIcon = 'fas fa-home'; break;
        case 22: category = '집(가족/친척)'; categoryIcon = 'fas fa-house-user'; break;
        case 23: category = '회사'; categoryIcon = 'fas fa-briefcase'; break;
        case 24: category = '숙소'; categoryIcon = 'fas fa-bed'; break;
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