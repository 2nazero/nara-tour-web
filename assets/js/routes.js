// assets/js/routes.js

// 전역 변수 선언
let map;
let markers = [];
let touristData = [];
let selectedPlaces = [];
let routeLine;
let isDataLoading = false; // 데이터 로딩 상태 추적
let regionDataCache = {}; // 지역별 데이터 캐시

// 문서 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 로드됨, 요소 확인");
    
    // 페이지 요소 확인 로깅
    const routeMap = document.getElementById('route-map');
    const routeForm = document.getElementById('route-form');
    
    console.log("route-map 요소:", routeMap);
    console.log("route-form 요소:", routeForm);
    
    // 지도 초기화 (요소 확인 후)
    if (routeMap) {
        initializeLeafletMap('route-map');
    } else {
        console.error("route-map 요소를 찾을 수 없습니다!");
    }
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 지역 데이터 인덱스 로드 (미리 만들어진 지역별 파일을 사용할 경우)
    loadRegionIndex();
});

// 지역 데이터 인덱스 로드
async function loadRegionIndex() {
    try {
        // 실제 구현에서는 regions.json 파일에 지역별 데이터 파일 목록이 포함되어 있어야 함
        // 지금은 예시로 생성
        regionDataCache = {
            '서울특별시': { file: 'seoul.json', loaded: false, data: null },
            '경기도': { file: 'gyeonggi.json', loaded: false, data: null },
            '강원도': { file: 'gangwon.json', loaded: false, data: null },
            '충청북도': { file: 'chungbuk.json', loaded: false, data: null },
            '충청남도': { file: 'chungnam.json', loaded: false, data: null },
            '전라북도': { file: 'jeonbuk.json', loaded: false, data: null },
            '전라남도': { file: 'jeonnam.json', loaded: false, data: null },
            '경상북도': { file: 'gyeongbuk.json', loaded: false, data: null },
            '경상남도': { file: 'gyeongnam.json', loaded: false, data: null },
            '제주도': { file: 'jeju.json', loaded: false, data: null }
        };
        
        console.log('지역 데이터 인덱스 로드됨');
    } catch (error) {
        console.error('지역 데이터 인덱스 로드 실패:', error);
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 폼 제출 이벤트 처리
    const routeForm = document.getElementById('route-form');
    if (routeForm) {
        console.log("폼 요소 찾음:", routeForm);
        routeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const regionSelect = document.getElementById('region-select');
            if (regionSelect && regionSelect.value) {
                loadRecommendedPlaces(regionSelect.value);
            } else {
                alert('지역을 선택해주세요.');
            }
        });
    } else {
        console.error('경로 폼을 찾을 수 없습니다. 폼 선택자를 확인하세요.');
    }
    
    // 경로 최적화 버튼 클릭 이벤트
    const optimizeButton = document.getElementById('optimize-route');
    if (optimizeButton) {
        optimizeButton.addEventListener('click', function() {
            if (selectedPlaces.length < 2) {
                alert('경로를 계산하려면 최소 2개 이상의 장소를 선택해주세요.');
                return;
            }
            
            optimizeRoute();
            generateItinerary();
        });
    }
    
    // 일정표 저장 버튼 클릭 이벤트
    const saveButton = document.getElementById('save-itinerary');
    if (saveButton) {
        saveButton.addEventListener('click', saveItinerary);
    }
    
    // 공유하기 버튼 클릭 이벤트
    const shareButton = document.getElementById('share-itinerary');
    if (shareButton) {
        shareButton.addEventListener('click', shareItinerary);
    }
    
    // 인기 코스 불러오기 버튼 이벤트
    const loadRouteButtons = document.querySelectorAll('.load-route-btn');
    loadRouteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const listItems = this.closest('.card-body').querySelectorAll('.list-group-item');
            const places = Array.from(listItems).map(item => item.textContent);
            loadPopularRoute(places);
        });
    });
    
    // 지역 선택 드롭다운 변경 이벤트
    const regionSelect = document.getElementById('region-select');
    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            const selectedRegion = this.value;
            if (selectedRegion) {
                updateMapForRegion(selectedRegion);
            }
        });
    }
}

// Leaflet 맵 초기화 (API 키 필요 없음)
function initializeLeafletMap(containerId) {
    // 지도 컨테이너 검색
    const mapContainer = document.getElementById(containerId);
    
    if (!mapContainer) {
        console.error(`지도 컨테이너 ID '${containerId}'를 찾을 수 없습니다.`);
        return;
    }
    
    // 컨테이너 크기 확인
    console.log(`지도 컨테이너 크기: ${mapContainer.clientWidth}x${mapContainer.clientHeight}`);
    
    // Leaflet 맵 생성
    map = L.map(mapContainer).setView([36.2, 127.9], 7);
    
    // OpenStreetMap 타일 추가 (API 키 필요 없음)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    console.log('Leaflet 지도 초기화 완료');
    
    // 테스트 마커 추가 (지도가 제대로 작동하는지 확인용)
    L.marker([37.5665, 126.9780]).addTo(map)
        .bindPopup('서울')
        .openPopup();
}

// 지역별 데이터 로드 (데이터 분할 접근법)
async function loadRegionData(region) {
    // 이미 로드된 데이터가 있는지 확인
    if (regionDataCache[region] && regionDataCache[region].loaded) {
        console.log(`${region} 캐시된 데이터 사용`);
        return regionDataCache[region].data;
    }
    
    // 지역 데이터가 아직 로드되지 않은 경우
    try {
        console.log(`${region} 데이터 로드 시작`);
        
        // 대체 방법 - 모든 데이터 로드 후 지역으로 필터링
        // 실제 구현에서는 지역별 파일로 교체해야 함
        const response = await fetch('../data/ml_filtered_master_tourist_only.jsonl');
        
        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('데이터 파일 로드 완료, 파싱 시작');
        
        // Web Worker를 사용한 데이터 파싱 (큰 파일의 경우)
        // 여기서는 간단하게 메인 스레드에서 처리 (작은 예시를 위해)
        
        // 파일을 라인별로 분할
        const lines = text.trim().split('\n');
        
        // 타임아웃 방지를 위해 청크 단위 처리
        const chunkSize = 200;
        let processedData = [];
        
        // 각 청크 처리
        for (let i = 0; i < Math.min(lines.length, 1000); i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize);
            
            // 각 라인 파싱
            const parsedChunk = chunk.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            }).filter(item => item !== null && item.SIDO_NM === region);
            
            // 결과 누적
            processedData = processedData.concat(parsedChunk);
            
            // UI 차단 방지를 위해 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // 캐시에 저장
        regionDataCache[region] = {
            loaded: true,
            data: processedData
        };
        
        console.log(`${region} 데이터 로드 완료:`, processedData.length, '개 항목');
        return processedData;
    } catch (error) {
        console.error(`${region} 데이터 로드 중 오류:`, error);
        
        // 오류 시 빈 배열 반환
        return [];
    }
}

// 추천 장소 로드 및 표시
async function loadRecommendedPlaces(region) {
    const container = document.getElementById('recommended-places');
    if (!container) {
        console.error('추천 장소 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // 지역 선택 확인
    if (!region) {
        const regionSelect = document.getElementById('region-select');
        if (!regionSelect || !regionSelect.value) {
            alert('지역을 선택해주세요.');
            return;
        }
        region = regionSelect.value;
    }
    
    // 로딩 표시
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">${region} 추천 장소를 불러오는 중...</p>
        </div>
    `;
    
    try {
        // 지역 데이터 로드
        const regionData = await loadRegionData(region);
        
        // 데이터가 없는 경우
        if (!regionData || regionData.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-3">
                    <p>${region}에 데이터가 없습니다.</p>
                </div>
            `;
            return;
        }
        
        // 선호 장소 유형 필터링
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        const preferredTypes = Array.from(checkboxes).map(checkbox => parseInt(checkbox.value));
        
        console.log('선호 유형:', preferredTypes);
        
        // 선호 유형과 관련된 여행지 필터링
        let filteredPlaces = regionData;
        
        // 선호 유형이 선택된 경우에만 필터링
        if (preferredTypes.length > 0) {
            filteredPlaces = regionData.filter(place => 
                preferredTypes.includes(place.VISIT_AREA_TYPE_CD)
            );
        }
        
        // 데이터가 없는 경우 메시지 표시
        if (filteredPlaces.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-3"><p>선택한 조건에 맞는 장소가 없습니다.</p></div>';
            return;
        }
        
        // 만족도 순으로 정렬 (있는 경우에만)
        filteredPlaces = filteredPlaces
            .filter(place => place.DGSTFN) // 만족도가 있는 항목만
            .sort((a, b) => b.DGSTFN - a.DGSTFN);
        
        // 최대 12개 장소만 표시
        const placesToShow = filteredPlaces.slice(0, 12);
        
        // 지도 중심 및 확대 레벨 조정
        updateMapForRegion(region);
        
        // HTML 생성
        let html = '';
        placesToShow.forEach((place, index) => {
            const name = place.VISIT_AREA_NM || '이름 없음';
            const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '';
            const satisfaction = place.DGSTFN || '-';
            
            // 관광지 유형에 따른 아이콘 및 카테고리 설정
            const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
            
            html += `
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <i class="${categoryInfo.icon} me-2"></i>${categoryInfo.name}
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${name}</h6>
                        <p class="card-text small text-muted">${address}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-success">
                                <i class="fas fa-star me-1"></i>${satisfaction}/5
                            </span>
                            <button class="btn btn-sm btn-outline-primary add-place" data-place-index="${index}">추가</button>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
        
        // 추가 버튼 이벤트 처리
        const addButtons = document.querySelectorAll('.add-place');
        addButtons.forEach(button => {
            button.addEventListener('click', function() {
                const placeIndex = parseInt(this.getAttribute('data-place-index'));
                            addPlaceToSelection(placesToShow[placeIndex]);
                        });
                    });
                    
                } catch (error) {
                    console.error('추천 장소 로드 중 오류 발생:', error);
                    container.innerHTML = '<div class="col-12 text-center"><p>데이터를 불러오는 중 오류가 발생했습니다.</p></div>';
                }
                }

// 카테고리 정보 가져오기
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
       12: { name: '공공시설', icon: 'fas fa-building' },
       13: { name: '엔터테인먼트', icon: 'fas fa-film' },
       21: { name: '집(본인)', icon: 'fas fa-home' },
       22: { name: '집(가족/친척)', icon: 'fas fa-house-user' },
       23: { name: '회사', icon: 'fas fa-briefcase' },
       24: { name: '숙소', icon: 'fas fa-bed' }
   };
   
   return categories[typeCode] || { name: '기타', icon: 'fas fa-map-marker-alt' };
}

// 장소를 선택 목록에 추가
function addPlaceToSelection(place) {
   // 이미 선택된 장소인지 확인
   const isAlreadySelected = selectedPlaces.some(selected => 
       selected.VISIT_AREA_ID === place.VISIT_AREA_ID
   );
   
   if (isAlreadySelected) {
       alert('이미 선택된 장소입니다.');
       return;
   }
   
   // 장소 추가
   selectedPlaces.push(place);
   
   // 선택된 장소 목록 업데이트
   updateSelectedPlacesList();
   
   // 지도에 마커 추가
   addMarkerToMap(place);
}

// 선택된 장소 목록 업데이트
function updateSelectedPlacesList() {
   const container = document.getElementById('selected-places');
   if (!container) {
       console.error('선택된 장소 목록 컨테이너를 찾을 수 없습니다.');
       return;
   }
   
   if (selectedPlaces.length === 0) {
       container.innerHTML = '<li class="list-group-item text-center text-muted">장소를 선택해주세요</li>';
       return;
   }
   
   let html = '';
   selectedPlaces.forEach((place, index) => {
       const name = place.VISIT_AREA_NM || '이름 없음';
       
       html += `
       <li class="list-group-item d-flex justify-content-between align-items-center">
           <span>${index + 1}. ${name}</span>
           <div>
               <button class="btn btn-sm btn-outline-secondary me-1 move-place" data-direction="up" data-place-index="${index}" ${index === 0 ? 'disabled' : ''}>
                   <i class="fas fa-arrow-up"></i>
               </button>
               <button class="btn btn-sm btn-outline-secondary me-1 move-place" data-direction="down" data-place-index="${index}" ${index === selectedPlaces.length - 1 ? 'disabled' : ''}>
                   <i class="fas fa-arrow-down"></i>
               </button>
               <button class="btn btn-sm btn-danger remove-place" data-place-index="${index}">
                   <i class="fas fa-times"></i>
               </button>
           </div>
       </li>`;
   });
   
   container.innerHTML = html;
   
   // 삭제 버튼 이벤트 처리
   const removeButtons = document.querySelectorAll('.remove-place');
   removeButtons.forEach(button => {
       button.addEventListener('click', function() {
           const placeIndex = parseInt(this.getAttribute('data-place-index'));
           removePlaceFromSelection(placeIndex);
       });
   });
   
   // 순서 이동 버튼 이벤트 처리
   const moveButtons = document.querySelectorAll('.move-place');
   moveButtons.forEach(button => {
       button.addEventListener('click', function() {
           const placeIndex = parseInt(this.getAttribute('data-place-index'));
           const direction = this.getAttribute('data-direction');
           movePlaceInSelection(placeIndex, direction);
       });
   });
}

// 장소를 선택 목록에서 제거
function removePlaceFromSelection(index) {
   selectedPlaces.splice(index, 1);
   updateSelectedPlacesList();
   refreshMarkers();
}

// 선택 목록에서 장소 순서 변경
function movePlaceInSelection(index, direction) {
   if (direction === 'up' && index > 0) {
       // 위로 이동
       [selectedPlaces[index], selectedPlaces[index - 1]] = [selectedPlaces[index - 1], selectedPlaces[index]];
   } else if (direction === 'down' && index < selectedPlaces.length - 1) {
       // 아래로 이동
       [selectedPlaces[index], selectedPlaces[index + 1]] = [selectedPlaces[index + 1], selectedPlaces[index]];
   }
   
   updateSelectedPlacesList();
   refreshMarkers();
}

// 지도에 마커 추가
function addMarkerToMap(place) {
   try {
       // 좌표 정보가 있는 경우에만 마커 생성
       if (!place.X_COORD || !place.Y_COORD) {
           console.warn('좌표 정보가 없는 장소:', place.VISIT_AREA_NM);
           return;
       }
       
       // Leaflet 마커 추가
       const position = [place.Y_COORD, place.X_COORD];
       
       // Leaflet 마커 생성
       const marker = L.marker(position).addTo(map);
       
       // 팝업 설정
       marker.bindPopup(`<b>${place.VISIT_AREA_NM || '이름 없음'}</b><br>${place.ROAD_NM_ADDR || ''}`);
       
       // 클릭 이벤트 추가
       marker.on('click', function() {
           showPlaceInfo(place);
       });
       
       // 마커 정보 저장
       markers.push({
           marker: marker,
           place: place
       });
   } catch (error) {
       console.error('마커 추가 중 오류:', error);
   }
}

// 모든 마커 새로고침
function refreshMarkers() {
   try {
       // 기존 마커 및 경로선 제거
       markers.forEach(item => {
           if (item.marker) {
               map.removeLayer(item.marker);
           }
       });
       markers = [];
       
       // 경로선 제거
       if (routeLine) {
           map.removeLayer(routeLine);
           routeLine = null;
       }
       
       // 새 마커 추가
       selectedPlaces.forEach(place => {
           addMarkerToMap(place);
       });
   } catch (error) {
       console.error('마커 새로고침 중 오류:', error);
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
       
       // 카테고리 정보 가져오기
       const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
       
       // 간단한 알림창으로 정보 표시
       const content = `
       ${name}
       주소: ${address}
       유형: ${categoryInfo.name}
       방문 날짜: ${visitDate}
       체류 시간: ${stayTime}
       만족도: ${satisfaction}/5`;
       
       alert(content);
   } catch (error) {
       console.error('장소 정보 표시 중 오류:', error);
   }
}

// 경로 최적화
function optimizeRoute() {
   try {
       if (!map || selectedPlaces.length < 2) return;
       
       // 기존 마커 제거
       refreshMarkers();
       
       // 경로선 생성을 위한 좌표 배열
       const path = selectedPlaces.map(place => {
           return [place.Y_COORD, place.X_COORD];
       });
       
       // Leaflet 경로선 생성
       routeLine = L.polyline(path, {
           color: 'red',
           weight: 3,
           opacity: 0.7
       }).addTo(map);
       
       // 경로가 모두 보이도록 지도 범위 조정
       map.fitBounds(routeLine.getBounds());
       
       // 마커 재추가 (경로 순서대로 번호 표시)
       markers = [];
       selectedPlaces.forEach((place, index) => {
           const position = [place.Y_COORD, place.X_COORD];
           
           // 커스텀 아이콘으로 순서 표시
           const numberIcon = L.divIcon({
               html: `<div style="background-color: #007bff; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; font-weight: bold;">${index + 1}</div>`,
               className: 'number-icon',
               iconSize: [25, 25],
               iconAnchor: [12, 12]
           });
           
           // 마커 생성
           const marker = L.marker(position, { icon: numberIcon }).addTo(map);
           
           // 팝업 설정
           marker.bindPopup(`<b>${place.VISIT_AREA_NM || '이름 없음'}</b><br>${place.ROAD_NM_ADDR || ''}`);
           
           // 클릭 이벤트 추가
           marker.on('click', function() {
               showPlaceInfo(place);
           });
           
           // 마커 정보 저장
           markers.push({
               marker: marker,
               place: place
           });
       });
   } catch (error) {
       console.error('경로 최적화 중 오류:', error);
   }
}

// 일정표 생성
function generateItinerary() {
   try {
       const daysSelect = document.getElementById('days');
       if (!daysSelect) {
           console.error('여행 일수 선택 요소를 찾을 수 없습니다.');
           return;
       }
       
       const days = parseInt(daysSelect.value);
       const table = document.getElementById('itinerary-table');
       if (!table) {
           console.error('일정표 테이블을 찾을 수 없습니다.');
           return;
       }
       
       const tbody = table.querySelector('tbody');
       if (!tbody) {
           console.error('일정표 테이블 본문을 찾을 수 없습니다.');
           return;
       }
       
       if (selectedPlaces.length === 0) {
           tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">경로를 계획하면 일정표가 표시됩니다.</td></tr>';
           return;
       }
       
       // 일별 일정 계산
       const placesPerDay = Math.ceil(selectedPlaces.length / days);
       
       // 테이블 내용 생성
       let html = '';
       for (let day = 1; day <= days; day++) {
           const startIndex = (day - 1) * placesPerDay;
           const endIndex = Math.min(startIndex + placesPerDay, selectedPlaces.length);
           const dayPlaces = selectedPlaces.slice(startIndex, endIndex);
           
           if (dayPlaces.length === 0) continue;
           
           // 일자별 장소 표시
           for (let i = 0; i < dayPlaces.length; i++) {
               const place = dayPlaces[i];
               const time = formatTimeForItinerary(i, dayPlaces.length);
               
               // 카테고리 정보 가져오기
               const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
               
               // 체류 시간 정보
               const stayTime = place.RESIDENCE_TIME_MIN 
                   ? `${place.RESIDENCE_TIME_MIN}분 소요` 
                   : '체류 시간 정보 없음';
               
               html += `
               <tr>
                   ${i === 0 ? `<td rowspan="${dayPlaces.length}">${day}일차</td>` : ''}
                   <td>${time}</td>
                   <td>${place.VISIT_AREA_NM || '이름 없음'}</td>
                   <td><i class="${categoryInfo.icon} me-2"></i>${categoryInfo.name} / ${stayTime}</td>
               </tr>`;
           }
       }
       
       tbody.innerHTML = html;
   } catch (error) {
       console.error('일정표 생성 중 오류:', error);
   }
}

// 일정표를 위한 시간 포맷
function formatTimeForItinerary(index, total) {
   // 하루 8시간 일정 기준 (9:00 ~ 17:00)
   const startHour = 9;
   const hourInterval = total > 1 ? 8 / (total - 1) : 0;
   
   const hour = startHour + (hourInterval * index);
   const hourInt = Math.floor(hour);
   const minute = Math.floor((hour - hourInt) * 60);
   
   return `${hourInt}:${minute < 10 ? '0' + minute : minute}`;
}

// 지도 업데이트 (지역별)
function updateMapForRegion(region) {
   try {
       if (!map) return;
       
       // 지역별 중심 좌표 및 확대 레벨 설정
       const regionCoords = {
           '서울특별시': { lat: 37.5665, lng: 126.9780, zoom: 11 },
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
       
       if (regionCoords[region]) {
           const coords = regionCoords[region];
           map.setView([coords.lat, coords.lng], coords.zoom);
       }
   } catch (error) {
       console.error('지도 업데이트 중 오류:', error);
   }
}

// 일정표 저장 (CSV 포맷)
function saveItinerary() {
   try {
       if (selectedPlaces.length === 0) {
           alert('저장할 일정이 없습니다.');
           return;
       }
       
       const daysSelect = document.getElementById('days');
       if (!daysSelect) {
           console.error('여행 일수 선택 요소를 찾을 수 없습니다.');
           return;
       }
       
       const days = parseInt(daysSelect.value);
       const placesPerDay = Math.ceil(selectedPlaces.length / days);
       
       let csvContent = 'data:text/csv;charset=utf-8,';
       csvContent += '일자,시간,장소,세부정보\n';
       
       for (let day = 1; day <= days; day++) {
           const startIndex = (day - 1) * placesPerDay;
           const endIndex = Math.min(startIndex + placesPerDay, selectedPlaces.length);
           const dayPlaces = selectedPlaces.slice(startIndex, endIndex);
           
           if (dayPlaces.length === 0) continue;
           
           for (let i = 0; i < dayPlaces.length; i++) {
               const place = dayPlaces[i];
               const time = formatTimeForItinerary(i, dayPlaces.length);
               const name = place.VISIT_AREA_NM || '이름 없음';
               
               // 카테고리 정보
               const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
               
               csvContent += `${day}일차,${time},${name},${categoryInfo.name}\n`;
           }
       }
       
       // CSV 파일 다운로드
       const encodedUri = encodeURI(csvContent);
       const link = document.createElement('a');
       link.setAttribute('href', encodedUri);
       link.setAttribute('download', '나라투어_여행일정.csv');
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       
       // 다운로드 완료 알림
       alert('여행 일정이 CSV 파일로 저장되었습니다.');
   } catch (error) {
       console.error('일정표 저장 중 오류:', error);
       alert('일정표 저장 중 오류가 발생했습니다.');
   }
}

// 일정표 공유 기능
function shareItinerary() {
   try {
       if (selectedPlaces.length === 0) {
           alert('공유할 일정이 없습니다.');
           return;
       }
       
       // 장소 이름만 추출
       const placeNames = selectedPlaces.map(p => p.VISIT_AREA_NM).join(', ');
       
       // 공유 기능
       if (navigator.share) {
           navigator.share({
               title: '나라투어 여행 일정',
               text: `나의 여행 일정: ${placeNames}`,
               url: window.location.href
           })
           .then(() => console.log('공유 성공'))
           .catch((error) => console.log('공유 실패:', error));
       } else {
           // 공유 API가 지원되지 않는 브라우저의 경우
           const shareText = `나의 여행 일정: ${placeNames}\n${window.location.href}`;
           alert('다음 내용을 복사하여 공유하세요:\n\n' + shareText);
       }
   } catch (error) {
       console.error('일정표 공유 중 오류:', error);
       alert('공유 기능을 사용할 수 없습니다.');
   }
}

// 인기 여행 경로 불러오기
async function loadPopularRoute(placeNames) {
   try {
       if (!placeNames || placeNames.length === 0) return;
       
       // 기존 선택 초기화
       selectedPlaces = [];
       refreshMarkers();
       
       // 이름이 유사한 장소 검색 (샘플 장소 생성)
       placeNames.forEach((name, index) => {
           // 샘플 장소 데이터 생성
           const samplePlace = {
               VISIT_AREA_ID: `SAMPLE_${Date.now()}_${index}`,
               VISIT_AREA_NM: name,
               ROAD_NM_ADDR: `${name} 주변`,
               VISIT_AREA_TYPE_CD: index % 3 === 0 ? 1 : (index % 3 === 1 ? 2 : 11), // 카테고리 랜덤 할당
               DGSTFN: 4.5 - (Math.random() * 0.5), // 만족도
               // 장소별 가상 좌표
               X_COORD: 126.9 + (Math.random() * 0.2 - 0.1),
               Y_COORD: 37.5 + (Math.random() * 0.2 - 0.1)
           };
           
           selectedPlaces.push(samplePlace);
       });
       
       // 선택된 장소 목록 업데이트
       updateSelectedPlacesList();
       
       // 마커 추가
       selectedPlaces.forEach(place => {
           addMarkerToMap(place);
       });
       
       // 경로 최적화 및 일정표 생성
       optimizeRoute();
       generateItinerary();
       
       alert(`'${placeNames[0]} 외 ${placeNames.length - 1}곳' 코스가 로드되었습니다.`);
   } catch (error) {
       console.error('인기 경로 불러오기 중 오류:', error);
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

// 데이터 분할 스크립트 기능 - 서버에서 실행 (프로덕션에서 구현)
// 여기서는 참고용 코드만 제공
function splitDataByRegion() {
   /* 
   // Node.js 환경에서 실행:
   const fs = require('fs');
   const path = require('path');
   
   // 원본 데이터 파일 읽기
   const rawData = fs.readFileSync('data/ml_filtered_master_tourist_only.jsonl', 'utf8');
   const lines = rawData.trim().split('\n');
   
   // 지역별 데이터 객체
   const regionData = {};
   
   // 각 라인 파싱 및 지역별 분류
   lines.forEach(line => {
       try {
           const item = JSON.parse(line);
           const region = item.SIDO_NM;
           
           if (!regionData[region]) {
               regionData[region] = [];
           }
           
           regionData[region].push(item);
       } catch (e) {
           console.error('파싱 오류:', e);
       }
   });
   
   // 지역별 디렉토리 생성
   const regionDir = path.join('data', 'regions');
   if (!fs.existsSync(regionDir)) {
       fs.mkdirSync(regionDir, { recursive: true });
   }
   
   // 지역별 파일 저장
   Object.keys(regionData).forEach(region => {
       const fileName = region.replace(/[^가-힣a-zA-Z0-9]/g, '') + '.json';
       const filePath = path.join(regionDir, fileName);
       
       fs.writeFileSync(filePath, JSON.stringify(regionData[region]), 'utf8');
       console.log(`${region} 데이터 저장 완료: ${regionData[region].length}개 항목`);
   });
   
   // 지역 인덱스 파일 생성
   const regionIndex = {};
   Object.keys(regionData).forEach(region => {
       const fileName = region.replace(/[^가-힣a-zA-Z0-9]/g, '') + '.json';
       regionIndex[region] = {
           file: fileName,
           count: regionData[region].length
       };
   });
   
   fs.writeFileSync(path.join('data', 'region-index.json'), JSON.stringify(regionIndex), 'utf8');
   console.log('지역 인덱스 파일 생성 완료');
   */
}   