// assets/js/regions.js
// 기존 코드 위에 추가

// 보안 API 키로 지도 로드
async function loadMapWithSecureAPI() {
    try {
      // 지도 컨테이너 확인
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('지도 컨테이너를 찾을 수 없습니다.');
        return;
      }
      
      // 로딩 표시
      mapContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">지도 로딩 중...</span></div></div>';
      
      // Netlify Function에서 API 키 요청
      const response = await fetch('/.netlify/functions/getMapData');
      if (!response.ok) {
        throw new Error('API 키를 가져올 수 없습니다.');
      }
      
      const data = await response.json();
      const apiKey = data.apiKey;
      
      // 기존 구글 지도 스크립트가 있으면 제거
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // 새 스크립트 동적 추가
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initializeMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error('Google Maps 스크립트 로드 실패'));
        
        // 콜백 함수 정의
        window.initializeMap = function() {
          // 이 함수는 구글 지도 API가 로드된 후 호출됩니다
          // 기존 지도 초기화 코드를 여기서 호출
          initializeRegionsMap();
          resolve();
        };
        
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('지도 로딩에 실패했습니다:', error);
      const mapContainer = document.getElementById('map');
      if (mapContainer) {
        mapContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>지도를 로드할 수 없습니다. 잠시 후 다시 시도해주세요.
          </div>
        `;
      }
    }
  }
  
  // 기존 지도 초기화 함수
  function initializeRegionsMap() {
    const mapContainer = document.getElementById('map');
    
    // 기본 지도 옵션 (한국 중심)
    const mapOptions = {
      center: { lat: 36.2, lng: 127.9 }, // 한국 중심 좌표
      zoom: 7,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
      }
    };
    
    // 지도 생성
    const map = new google.maps.Map(mapContainer, mapOptions);
    
    // 여기에 마커, 정보창 등 추가 로직 구현
    // ...
    
    // 지도 인스턴스를 전역으로 저장 (다른 함수에서 접근할 수 있도록)
    window.regionsMap = map;
  }
  
  // 페이지 로드 시 실행
  document.addEventListener('DOMContentLoaded', () => {
    // 보안 API 로드 함수 호출
    loadMapWithSecureAPI();
    
    // 기타 이벤트 리스너 및 기능 초기화
    // ...
  });





// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let map;
    let markers = [];
    let touristData = [];
    let currentRegion = 'all';
    let currentCategories = ['1', '2', '3', '4', '5', '6', '11', '24']; // 기본 카테고리
    let minSatisfaction = 3; // 기본 만족도 필터 (3점 이상)
    let visibleItems = 12; // 처음에 보여줄 아이템 수
    let categoryChart = null;
    let satisfactionChart = null;
        
    // 데이터 로드 및 초기화
    initializeMap();
    loadTouristData();
    
    // 지역 목록 클릭 이벤트 처리
    const regionLinks = document.querySelectorAll('#region-list a');
    regionLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 이전 선택 항목 제거
            document.querySelector('#region-list a.active').classList.remove('active');
            
            // 현재 선택 항목 활성화
            this.classList.add('active');
            
            // 지역 변경
            currentRegion = this.getAttribute('data-region');
            updateRegionInfo();
            filterMarkers();
            displayPlaces();
            updateCharts();
            updateTopPlacesTable();
        });
    });
    
    // 필터 적용 버튼 클릭 이벤트
    document.getElementById('apply-filter').addEventListener('click', function() {
        // 선택된 카테고리 가져오기
        currentCategories = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        filterMarkers();
        displayPlaces();
        updateCharts();
    });
    
    // 만족도 필터 슬라이더 이벤트
    document.getElementById('satisfaction-range').addEventListener('input', function() {
        minSatisfaction = parseInt(this.value);
        document.getElementById('satisfaction-value').textContent = minSatisfaction;
        
        filterMarkers();
        displayPlaces();
        updateCharts();
    });
    
    // 더보기 버튼 클릭 이벤트
    document.getElementById('load-more').addEventListener('click', function() {
        visibleItems += 12; // 12개씩 추가로 표시
        displayPlaces();
    });
    
    // 구글 지도 초기화
    function initializeMap() {
        try {
            const container = document.getElementById('map');
            if (!container) {
                console.error('지도 컨테이너를 찾을 수 없습니다');
                return;
            }
            
            // 구글 맵 객체 생성
            map = new google.maps.Map(container, {
                center: { lat: 36.2, lng: 127.9 }, // 한국 중심 좌표
                zoom: 7, // 확대 레벨
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true
            });
            
            console.log('구글 지도 초기화 완료');
            
        } catch (error) {
            console.error('지도 초기화 중 오류:', error);
            
            // 오류 발생 시 대체 메시지 표시
            const container = document.getElementById('map');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-map-marked-alt fa-5x text-muted mb-3"></i>
                        <h4>지도를 불러올 수 없습니다</h4>
                        <p>구글 지도 API 키가 필요합니다.</p>
                    </div>
                `;
            }
        }
    }
    
    // 여행지 데이터 로드
    async function loadTouristData() {
        try {
            // 먼저 캐시된 데이터가 있는지 확인
            if (window.cachedTouristData) {
                touristData = window.cachedTouristData;
                console.log('캐시된 데이터 사용');
            } else {
                const fullPath = '/naratour/data/ml_filtered_master_tourist_only.jsonl';
                console.log('데이터 로드 시도:', fullPath);
                
                const response = await fetch(fullPath);
                
                if (!response.ok) {
                    throw new Error(`HTTP 오류! 상태: ${response.status}`);
                }
                
                const text = await response.text();
                console.log('로드된 데이터 미리보기:', text.substring(0, 100));
                
                // JSONL 파싱
                touristData = text.trim().split('\n')
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (e) {
                            console.error('파싱 오류:', e, line.substring(0, 50) + '...');
                            return null;
                        }
                    })
                    .filter(item => item !== null);
                
                // 전역 캐시에 저장
                window.cachedTouristData = touristData;
                console.log('새 데이터 로드 완료:', touristData.length, '개 항목');
            }
            
            if (!touristData || touristData.length === 0) {
                console.error('데이터를 불러올 수 없습니다.');
                return;
            }
            
            // 마커 생성 및 지도에 표시
            createMarkers();
            
            // 장소 목록 표시
            displayPlaces();
            
            // 차트 초기화
            initializeCharts();
            
            // 인기 여행지 테이블 업데이트
            updateTopPlacesTable();
            
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
    }
    
    // 마커 생성 및 지도에 표시 (구글 맵 버전)
    function createMarkers() {
        try {
            // 기존 마커 제거
            markers.forEach(marker => {
                if (marker.marker && marker.marker.setMap) {
                    marker.marker.setMap(null);
                }
            });
            markers = [];
            
            if (!map) {
                console.error('지도가 초기화되지 않았습니다.');
                return;
            }
            
            // 새 마커 생성 (구글 맵 마커)
            touristData.forEach((place, index) => {
                // 좌표 정보가 있는 경우에만 마커 생성
                if (place.X_COORD && place.Y_COORD) {
                    try {
                        // 구글 맵용 좌표 객체
                        const position = { lat: place.Y_COORD, lng: place.X_COORD };
                        
                        // 구글 맵 마커 생성
                        const marker = new google.maps.Marker({
                            position: position,
                            map: null, // 처음에는 지도에 표시하지 않음
                            title: place.VISIT_AREA_NM || '이름 없음'
                        });
                        
                        // 마커에 클릭 이벤트 추가
                        marker.addListener('click', function() {
                            showPlaceInfo(place);
                        });
                        
                        // 마커 정보 저장
                        markers.push({
                            marker: marker,
                            place: place
                        });
                    } catch (err) {
                        console.error('마커 생성 중 오류:', err);
                    }
                }
            });
            
            // 초기 필터 적용
            filterMarkers();
        } catch (error) {
            console.error('마커 생성 중 오류:', error);
        }
    }
    
    // 마커 필터링
    function filterMarkers() {
        try {
            if (!map) return;
            
            markers.forEach(item => {
                const marker = item.marker;
                const place = item.place;
                
                // 지역 필터
                const regionMatch = currentRegion === 'all' || place.SIDO_NM === currentRegion;
                
                // 카테고리 필터
                const category = place.VISIT_AREA_TYPE_CD ? place.VISIT_AREA_TYPE_CD.toString() : '';
                const categoryMatch = currentCategories.includes(category);
                
                // 만족도 필터
                const satisfaction = place.DGSTFN || 0;
                const satisfactionMatch = satisfaction >= minSatisfaction;
                
                // 조건에 맞으면 지도에 표시, 아니면 숨김
                if (regionMatch && categoryMatch && satisfactionMatch) {
                    marker.setMap(map);
                } else {
                    marker.setMap(null);
                }
            });
        } catch (error) {
            console.error('마커 필터링 중 오류:', error);
        }
    }
    
    // 장소 정보 표시
    function showPlaceInfo(place) {
        try {
            const name = place.VISIT_AREA_NM || '이름 없음';
            const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '주소 정보 없음';
            const satisfaction = place.DGSTFN || '-';
            const visitDate = formatDate(place.VISIT_START_YMD);
            const stayTime = place.RESIDENCE_TIME_MIN ? `${place.RESIDENCE_TIME_MIN}분` : '정보 없음';
            
            let categoryName = '기타';
            switch(place.VISIT_AREA_TYPE_CD) {
                case 1: categoryName = '관광명소'; break;
                case 2: categoryName = '숙박'; break;
                case 3: categoryName = '쇼핑'; break;
                case 4: categoryName = '맛집'; break;
                case 5: categoryName = '교통'; break;
                case 6: categoryName = '문화시설'; break;
            }
            
            // 구글 맵 인포윈도우로 표시하는 대신 alert로 표시
            const content = `
            ${name}
            주소: ${address}
            유형: ${categoryName}
            방문 날짜: ${visitDate}
            체류 시간: ${stayTime}
            만족도: ${satisfaction}/5`;
            
            alert(content);
            
            // 구글 맵 인포윈도우를 사용하려면 아래 코드 활성화:
            /*
            const infowindow = new google.maps.InfoWindow({
                content: `
                <div style="padding:10px;width:300px;">
                    <h5 style="margin-top:0;margin-bottom:10px;">${name}</h5>
                    <p style="margin:0;font-size:0.9em;color:#666;">${address}</p>
                    <p style="margin:8px 0;">유형: ${categoryName}</p>
                    <p style="margin:8px 0;">방문 날짜: ${visitDate}</p>
                    <p style="margin:8px 0;">체류 시간: ${stayTime}</p>
                    <p style="margin:8px 0;">만족도: ${satisfaction}/5</p>
                </div>`
            });
            
            // 마커 찾기
            const markerObj = markers.find(m => m.place.VISIT_AREA_ID === place.VISIT_AREA_ID);
            if (markerObj && markerObj.marker) {
                infowindow.open(map, markerObj.marker);
            }
            */
        } catch (error) {
            console.error('장소 정보 표시 중 오류:', error);
        }
    }
    
    // 장소 목록 표시
    function displayPlaces() {
        try {
            const container = document.getElementById('region-places-container');
            if (!container) {
                console.error('region-places-container 요소를 찾을 수 없습니다');
                return;
            }
            
            // 필터링된 장소 목록
            const filteredPlaces = touristData.filter(place => {
                // 지역 필터
                const regionMatch = currentRegion === 'all' || place.SIDO_NM === currentRegion;
                
                // 카테고리 필터
                const category = place.VISIT_AREA_TYPE_CD ? place.VISIT_AREA_TYPE_CD.toString() : '';
                const categoryMatch = currentCategories.includes(category);
                
                // 만족도 필터
                const satisfaction = place.DGSTFN || 0;
                const satisfactionMatch = satisfaction >= minSatisfaction;
                
                return regionMatch && categoryMatch && satisfactionMatch;
            });
            
            // 데이터가 없는 경우 메시지 표시
            if (filteredPlaces.length === 0) {
                container.innerHTML = '<div class="col-12 text-center py-5"><p>검색 조건에 맞는 장소가 없습니다.</p></div>';
                
                const loadMoreBtn = document.getElementById('load-more');
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = 'none';
                }
                return;
            }
            
            // 만족도 기준으로 정렬 (높은 순)
            filteredPlaces.sort((a, b) => (b.DGSTFN || 0) - (a.DGSTFN || 0));
            
            // 표시할 아이템 선택 (페이지네이션)
            const placesToShow = filteredPlaces.slice(0, visibleItems);
            
            // HTML 생성
            let html = '';
            placesToShow.forEach(place => {
                const name = place.VISIT_AREA_NM || '이름 없음';
                const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '';
                const satisfaction = place.DGSTFN || '-';
                const visitDate = formatDate(place.VISIT_START_YMD);
                
                // 관광지 유형에 따른 아이콘 및 카테고리 설정
                let categoryIcon = 'fas fa-map-marker-alt';
                let category = '기타';
                
                switch(place.VISIT_AREA_TYPE_CD) {
                    case 1:
                        categoryIcon = 'fas fa-mountain';
                        category = '자연 관광지';
                        break;
                    case 2:
                        categoryIcon = 'fas fa-landmark';
                        category = '문화/역사/종교시설';
                        break;
                    case 3:
                        categoryIcon = 'fas fa-theater-masks';
                        category = '문화시설';
                        break;
                    case 4:
                        categoryIcon = 'fas fa-store';
                        category = '상업지구';
                        break;
                    case 5:
                        categoryIcon = 'fas fa-running';
                        category = '레저/스포츠';
                        break;
                    case 6:
                        categoryIcon = 'fas fa-ticket-alt';
                        category = '테마시설';
                        break;
                    case 7:
                        categoryIcon = 'fas fa-hiking';
                        category = '산책로/둘레길';
                        break;
                    case 8:
                        categoryIcon = 'fas fa-calendar-alt';
                        category = '축제/행사';
                        break;
                    case 9:
                        categoryIcon = 'fas fa-bus';
                        category = '교통시설';
                        break;
                    case 10:
                        categoryIcon = 'fas fa-shopping-bag';
                        category = '상점';
                        break;
                    case 11:
                        categoryIcon = 'fas fa-utensils';
                        category = '식당/카페';
                        break;
                    case 12:
                        categoryIcon = 'fas fa-building';
                        category = '공공시설';
                        break;
                    case 13:
                        categoryIcon = 'fas fa-film';
                        category = '엔터테인먼트';
                        break;
                    case 21:
                        categoryIcon = 'fas fa-home';
                        category = '집(본인)';
                        break;
                    case 22:
                        categoryIcon = 'fas fa-house-user';
                        category = '집(가족/친척)';
                        break;
                    case 23:
                        categoryIcon = 'fas fa-briefcase';
                        category = '회사';
                        break;
                    case 24:
                        categoryIcon = 'fas fa-bed';
                        category = '숙소';
                        break;
                }
                
                html += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <div class="card-header bg-primary text-white">
                            <i class="${categoryIcon} me-2"></i>${category}
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${name}</h5>
                            <p class="card-text text-muted small">${address}</p>
                            <p class="card-text">
                                <small class="text-muted">
                                    <i class="fas fa-calendar me-1"></i>${visitDate}
                                </small>
                            </p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-info">
                                    ${place.RESIDENCE_TIME_MIN ? place.RESIDENCE_TIME_MIN + '분 체류' : '체류 시간 정보 없음'}
                                </span>
                                <span class="badge bg-success">
                                    <i class="fas fa-star me-1"></i>${satisfaction}/5
                                </span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-outline-primary view-details" 
                                    data-place-id="${place.VISIT_AREA_ID || ''}">
                                상세 정보
                            </button>
                        </div>
                    </div>
                </div>`;
            });
            
            container.innerHTML = html;
            
            // 더보기 버튼 표시/숨김
            const loadMoreBtn = document.getElementById('load-more');
            if (loadMoreBtn) {
                if (filteredPlaces.length <= visibleItems) {
                    loadMoreBtn.style.display = 'none';
                } else {
                    loadMoreBtn.style.display = 'inline-block';
                }
            }

// 상세 정보 버튼 이벤트 리스너 추가
document.querySelectorAll('.view-details').forEach(button => {
    button.addEventListener('click', function() {
        const placeId = this.getAttribute('data-place-id');
        const place = touristData.find(p => p.VISIT_AREA_ID === placeId);
        if (place) {
            showPlaceInfo(place);
        }
    });
});
} catch (error) {
console.error('장소 목록 표시 중 오류:', error);
}
}

// 지역 정보 업데이트
function updateRegionInfo() {
try {
const regionTitle = document.getElementById('region-title');
const regionDescription = document.getElementById('region-description');

if (!regionTitle || !regionDescription) {
    console.error('지역 정보 요소를 찾을 수 없습니다');
    return;
}

// 지역별 타이틀 및 설명 업데이트
if (currentRegion === 'all') {
    regionTitle.textContent = '전체 지역 정보';
    regionDescription.textContent = '대한민국의 주요 여행지 정보를 확인하세요.';
} else {
    regionTitle.textContent = `${currentRegion} 여행 정보`;
    regionDescription.textContent = `${currentRegion}의 다양한 여행지를 확인하세요.`;
}

// 지도 중심 및 확대 레벨 조정
if (!map) return;

if (currentRegion !== 'all') {
    // 지역별 중심 좌표 (실제 구현 시 정확한 좌표 사용)
    const regionCoords = {
        '서울특별시': { lat: 37.5665, lng: 126.9780, zoom: 8 },
        '경기도': { lat: 37.4138, lng: 127.5183, zoom: 9 },
        '강원도': { lat: 37.8228, lng: 128.1555, zoom: 9 },
        '충청북도': { lat: 36.6357, lng: 127.4914, zoom: 9 },
        '충청남도': { lat: 36.5184, lng: 126.8000, zoom: 9 },
        '전라북도': { lat: 35.7175, lng: 127.1530, zoom: 9 },
        '전라남도': { lat: 34.8679, lng: 126.9910, zoom: 9 },
        '경상북도': { lat: 36.4919, lng: 128.8889, zoom: 9 },
        '경상남도': { lat: 35.4606, lng: 128.2132, zoom: 9 },
        '제주도': { lat: 33.4996, lng: 126.5312, zoom: 10 }
    };
    
    if (regionCoords[currentRegion]) {
        const coords = regionCoords[currentRegion];
        map.setCenter({ lat: coords.lat, lng: coords.lng });
        map.setZoom(coords.zoom);
    }
} else {
    // 전체 지역 선택 시 한국 전체가 보이도록 설정
    map.setCenter({ lat: 36.2, lng: 127.9 });
    map.setZoom(7);
}
} catch (error) {
console.error('지역 정보 업데이트 중 오류:', error);
}
}

// 차트 초기화
function initializeCharts() {
try {
// 카테고리별 분포 차트
const categoryCtx = document.getElementById('category-chart');
if (!categoryCtx) {
    console.error('category-chart 요소를 찾을 수 없습니다');
    return;
}

// 카테고리별 분포 차트
categoryChart = new Chart(categoryCtx, {
    type: 'doughnut',
    data: {
        labels: [
            '자연 관광지', 
            '문화/역사/종교시설', 
            '문화시설', 
            '상업지구', 
            '레저/스포츠', 
            '테마시설',
            '산책로/둘레길',
            '축제/행사',
            '교통시설',
            '상점',
            '식당/카페',
            '기타'
        ],
        datasets: [{
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
                '#FF9F40', '#C9CBCF', '#FF8A80', '#8BC34A', '#9C27B0',
                '#FFEB3B', '#607D8B'
            ]
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    boxWidth: 12,
                    font: {
                        size: 10
                    }
                }
            },
            title: {
                display: true,
                text: '카테고리별 장소 분포'
            }
        }
    }
});

// 만족도 분포 차트
const satisfactionCtx = document.getElementById('satisfaction-chart');
if (!satisfactionCtx) {
    console.error('satisfaction-chart 요소를 찾을 수 없습니다');
    return;
}

satisfactionChart = new Chart(satisfactionCtx, {
    type: 'bar',
    data: {
        labels: ['1점', '2점', '3점', '4점', '5점'],
        datasets: [{
            label: '만족도 분포',
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
                '#FF6384', '#FF9F40', '#FFCE56', '#4BC0C0', '#36A2EB'
            ]
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            title: {
                display: true,
                text: '만족도별 분포'
            }
        }
    }
});

// 초기 차트 데이터 업데이트
updateCharts();
} catch (error) {
console.error('차트 초기화 중 오류:', error);
}
}

// 차트 데이터 업데이트
function updateCharts() {
try {
if (!categoryChart || !satisfactionChart) {
    console.error('차트가 초기화되지 않았습니다');
    return;
}

// 필터링된 장소 목록
const filteredPlaces = touristData.filter(place => {
    // 지역 필터
    const regionMatch = currentRegion === 'all' || place.SIDO_NM === currentRegion;
    
    // 카테고리 필터
    const category = place.VISIT_AREA_TYPE_CD ? place.VISIT_AREA_TYPE_CD.toString() : '';
    const categoryMatch = currentCategories.includes(category);
    
    // 만족도 필터
    const satisfaction = place.DGSTFN || 0;
    const satisfactionMatch = satisfaction >= minSatisfaction;
    
    return regionMatch && categoryMatch && satisfactionMatch;
});

// 카테고리별 분포 데이터
const categoryData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 카테고리별 개수

filteredPlaces.forEach(place => {
    const type = place.VISIT_AREA_TYPE_CD;
    if (type >= 1 && type <= 8) {
        categoryData[type - 1]++; // 1-8 카테고리
    } else if (type === 9) {
        categoryData[8]++; // 교통시설
    } else if (type === 10) {
        categoryData[9]++; // 상점
    } else if (type === 11) {
        categoryData[10]++; // 식당/카페
    } else {
        categoryData[11]++; // 기타
    }
});

categoryChart.data.datasets[0].data = categoryData;
categoryChart.update();

// 만족도 분포 데이터
const satisfactionData = [0, 0, 0, 0, 0]; // [1점, 2점, 3점, 4점, 5점]

filteredPlaces.forEach(place => {
    const satisfaction = place.DGSTFN;
    if (satisfaction >= 1 && satisfaction <= 5) {
        satisfactionData[satisfaction - 1]++;
    }
});

satisfactionChart.data.datasets[0].data = satisfactionData;
satisfactionChart.update();
} catch (error) {
console.error('차트 업데이트 중 오류:', error);
}
}

// 인기 여행지 테이블 업데이트
function updateTopPlacesTable() {
try {
const tableBody = document.getElementById('top-places-table')?.querySelector('tbody');
if (!tableBody) {
    console.error('top-places-table 또는 tbody 요소를 찾을 수 없습니다');
    return;
}

// 필터링된 장소 목록
const filteredPlaces = touristData.filter(place => {
    // 지역 필터만 적용 (카테고리 및 만족도 필터는 적용하지 않음)
    return currentRegion === 'all' || place.SIDO_NM === currentRegion;
});

// 만족도 기준으로 정렬 (높은 순)
const topPlaces = filteredPlaces
    .filter(place => place.DGSTFN && place.DGSTFN > 0) // 만족도가 있는 항목만
    .sort((a, b) => b.DGSTFN - a.DGSTFN)
    .slice(0, 5); // 상위 5개

// HTML 생성
let html = '';
if (topPlaces.length > 0) {
    topPlaces.forEach((place, index) => {
        const name = place.VISIT_AREA_NM || '이름 없음';
        const region = place.SIDO_NM || '';
        const satisfaction = place.DGSTFN || '-';
        
        // 관광지 유형에 따른 카테고리 설정
        let category = '기타';
        switch(place.VISIT_AREA_TYPE_CD) {
            case 1: category = '관광명소'; break;
            case 2: category = '숙박'; break;
            case 3: category = '쇼핑'; break;
            case 4: category = '맛집'; break;
            case 5: category = '교통'; break;
            case 6: category = '문화시설'; break;
        }
        
        html += `
        <tr>
            <td>${index + 1}</td>
            <td>${name}</td>
            <td>${region}</td>
            <td>${category}</td>
            <td>
                <span class="badge bg-success">
                    <i class="fas fa-star me-1"></i>${satisfaction}/5
                </span>
            </td>
        </tr>`;
    });
} else {
    html = '<tr><td colspan="5" class="text-center">데이터가 없습니다.</td></tr>';
}

tableBody.innerHTML = html;
} catch (error) {
console.error('인기 여행지 테이블 업데이트 중 오류:', error);
}
}

// 날짜 포맷팅 함수 (YYYYMMDD -> YYYY년 MM월 DD일)
function formatDate(dateStr) {
if (!dateStr) return '날짜 정보 없음';

try {
const year = dateStr.substring(0, 4);
const month = dateStr.substring(4, 6);
const day = dateStr.substring(6, 8);

return `${year}년 ${month}월 ${day}일`;
} catch (error) {
console.error('날짜 포맷팅 중 오류:', error, dateStr);
return '날짜 정보 없음';
}
}
});
