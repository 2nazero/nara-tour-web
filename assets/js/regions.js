// // assets/js/regions.js

// // 문서가 로드되면 실행
// document.addEventListener('DOMContentLoaded', function() {
//     // 전역 변수
//     let map;
//     let markers = [];
//     let touristData = [];
//     let currentRegion = 'all';
//     let currentCategories = ['1', '2', '3', '4', '5', '6', '11', '24']; // 기본 카테고리
//     let minSatisfaction = 3; // 기본 만족도 필터 (3점 이상)
//     let visibleItems = 12; // 처음에 보여줄 아이템 수
//     let categoryChart = null;
//     let satisfactionChart = null;
    
//     // 지도 API 로딩 확인
//     function checkMapApi() {
//         if (typeof google !== 'undefined' && google.maps) {
//             // 구글 맵 API가 로드된 경우 초기화 진행
//             initializeMap();
//         } else {
//             // API가 로드되지 않은 경우 대체 메시지 표시
//             const mapContainer = document.getElementById('map');
//             if (mapContainer) {
//                 mapContainer.innerHTML = `
//                     <div class="text-center py-5">
//                         <i class="fas fa-map-marked-alt fa-5x text-muted mb-3"></i>
//                         <h4>지도를 불러올 수 없습니다</h4>
//                         <p>구글 지도 API 키가 필요합니다.</p>
//                     </div>
//                 `;
//             }
//         }
//     }
    
//     // 데이터 로드 및 초기화
//     checkMapApi();
//     loadTouristData();
    
//     // 지역 목록 클릭 이벤트 처리
//     const regionLinks = document.querySelectorAll('#region-list a');
//     if (regionLinks.length > 0) {
//         regionLinks.forEach(link => {
//             link.addEventListener('click', function(e) {
//                 e.preventDefault();
                
//                 // 이전 선택 항목에서 active 클래스 제거
//                 const activeLink = document.querySelector('#region-list a.active');
//                 if (activeLink) {
//                     activeLink.classList.remove('active');
//                 }
                
//                 // 현재 선택 항목 활성화
//                 this.classList.add('active');
                
//                 // 지역 변경
//                 currentRegion = this.getAttribute('data-region');
//                 updateRegionInfo();
//                 filterMarkers();
//                 displayPlaces();
//                 updateCharts();
//                 updateTopPlacesTable();
//             });
//         });
//     }
    
//     // 필터 적용 버튼 클릭 이벤트
//     const applyFilterBtn = document.getElementById('apply-filter');
//     if (applyFilterBtn) {
//         applyFilterBtn.addEventListener('click', function() {
//             // 선택된 카테고리 가져오기
//             const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
//             if (checkboxes.length > 0) {
//                 currentCategories = Array.from(checkboxes).map(checkbox => checkbox.value);
//             } else {
//                 // 체크박스가 없는 경우 기본 카테고리 사용
//                 currentCategories = ['1', '2', '3', '4', '5', '6', '11', '24'];
//             }
            
//             filterMarkers();
//             displayPlaces();
//             updateCharts();
//         });
//     }
    
//     // 만족도 필터 슬라이더 이벤트
//     const satisfactionRange = document.getElementById('satisfaction-range');
//     if (satisfactionRange) {
//         satisfactionRange.addEventListener('input', function() {
//             minSatisfaction = parseInt(this.value);
//             const satisfactionValue = document.getElementById('satisfaction-value');
//             if (satisfactionValue) {
//                 satisfactionValue.textContent = minSatisfaction;
//             }
            
//             filterMarkers();
//             displayPlaces();
//             updateCharts();
//         });
//     }
    
//     // 더보기 버튼 클릭 이벤트
//     const loadMoreBtn = document.getElementById('load-more');
//     if (loadMoreBtn) {
//         loadMoreBtn.addEventListener('click', function() {
//             visibleItems += 12; // 12개씩 추가로 표시
//             displayPlaces();
//         });
//     }
    
//     // 구글 지도 초기화
//     function initializeMap() {
//         try {
//             const container = document.getElementById('map');
//             if (!container) {
//                 console.error('지도 컨테이너를 찾을 수 없습니다');
//                 return;
//             }
            
//             // 구글 맵 객체 생성
//             map = new google.maps.Map(container, {
//                 center: { lat: 36.2, lng: 127.9 }, // 한국 중심 좌표
//                 zoom: 7, // 확대 레벨
//                 mapTypeControl: true,
//                 streetViewControl: false,
//                 fullscreenControl: true
//             });
            
//             console.log('구글 지도 초기화 완료');
            
//         } catch (error) {
//             console.error('지도 초기화 중 오류:', error);
            
//             // 오류 발생 시 대체 메시지 표시
//             const container = document.getElementById('map');
//             if (container) {
//                 container.innerHTML = `
//                     <div class="text-center py-5">
//                         <i class="fas fa-map-marked-alt fa-5x text-muted mb-3"></i>
//                         <h4>지도를 불러올 수 없습니다</h4>
//                         <p>구글 지도 API 키가 필요합니다.</p>
//                     </div>
//                 `;
//             }
//         }
//     }
    
//     // 여행지 데이터 로드
//     async function loadTouristData() {
//         try {
//             // 먼저 캐시된 데이터가 있는지 확인
//             if (window.cachedTouristData) {
//                 touristData = window.cachedTouristData;
//                 console.log('캐시된 데이터 사용');
//                 processLoadedData();
//                 return;
//             }
            
//             // 상대 경로로 변경
//             const fullPath = '../data/ml_filtered_master_tourist_only.jsonl';
//             console.log('데이터 로드 시도:', fullPath);
            
//             const response = await fetch(fullPath);
            
//             if (!response.ok) {
//                 throw new Error(`HTTP 오류! 상태: ${response.status}`);
//             }
            
//             const text = await response.text();
//             console.log('로드된 데이터 미리보기:', text.substring(0, 100));
            
//             // JSONL 파싱
//             touristData = text.trim().split('\n')
//                 .map(line => {
//                     try {
//                         return JSON.parse(line);
//                     } catch (e) {
//                         console.error('파싱 오류:', e, line.substring(0, 50) + '...');
//                         return null;
//                     }
//                 })
//                 .filter(item => item !== null);
            
//             // 전역 캐시에 저장
//             window.cachedTouristData = touristData;
//             console.log('새 데이터 로드 완료:', touristData.length, '개 항목');
            
//             processLoadedData();
            
//         } catch (error) {
//             console.error('데이터 로드 중 오류 발생:', error);
            
//             // 오류 발생 시 대체 데이터 생성 (샘플 데이터)
//             createSampleData();
//             processLoadedData();
//         }
//     }
    
//     // 샘플 데이터 생성 (데이터 로드 실패 시 사용)
//     function createSampleData() {
//         touristData = [
//             {
//                 VISIT_AREA_ID: "2208290001",
//                 TRAVEL_ID: "a_a000605",
//                 VISIT_ORDER: 14,
//                 VISIT_AREA_NM: "경복궁",
//                 SIDO_NM: "서울특별시",
//                 ROAD_NM_ADDR: "서울특별시 종로구 사직로 161",
//                 LOTNO_ADDR: "서울특별시 종로구 세종로 1-1",
//                 VISIT_AREA_TYPE_CD: 2,
//                 DGSTFN: 4.8,
//                 X_COORD: 126.9770,
//                 Y_COORD: 37.5796
//             },
//             {
//                 VISIT_AREA_ID: "2208290002",
//                 TRAVEL_ID: "a_a000606",
//                 VISIT_ORDER: 2,
//                 VISIT_AREA_NM: "남산서울타워",
//                 SIDO_NM: "서울특별시",
//                 ROAD_NM_ADDR: "서울특별시 용산구 남산공원길 105",
//                 LOTNO_ADDR: "서울특별시 용산구 용산동2가 산1-3",
//                 VISIT_AREA_TYPE_CD: 6,
//                 DGSTFN: 4.6,
//                 X_COORD: 126.9882,
//                 Y_COORD: 37.5511
//             },
//             {
//                 VISIT_AREA_ID: "2208290003",
//                 TRAVEL_ID: "a_a000607",
//                 VISIT_ORDER: 3,
//                 VISIT_AREA_NM: "한라산국립공원",
//                 SIDO_NM: "제주특별자치도",
//                 ROAD_NM_ADDR: "제주특별자치도 제주시 1100로 2070-61",
//                 LOTNO_ADDR: "제주특별자치도 제주시 오등동 산 182",
//                 VISIT_AREA_TYPE_CD: 1,
//                 DGSTFN: 4.9,
//                 X_COORD: 126.5450,
//                 Y_COORD: 33.3616
//             }
//         ];
//         console.log('샘플 데이터 생성:', touristData.length, '개 항목');
//     }
    
//     // 데이터 로드 후 처리
//     function processLoadedData() {
//         if (!touristData || touristData.length === 0) {
//             console.error('데이터를 불러올 수 없습니다.');
//             return;
//         }
        
//         // 마커 생성 및 지도에 표시
//         if (typeof google !== 'undefined' && google.maps && map) {
//             createMarkers();
//         }
        
//         // 장소 목록 표시
//         displayPlaces();
        
//         // 차트 초기화
//         initializeCharts();
        
//         // 인기 여행지 테이블 업데이트
//         updateTopPlacesTable();
//     }
    
//     // 마커 생성 및 지도에 표시 (구글 맵 버전)
//     function createMarkers() {
//         try {
//             // 기존 마커 제거
//             markers.forEach(marker => {
//                 if (marker.marker && marker.marker.setMap) {
//                     marker.marker.setMap(null);
//                 }
//             });
//             markers = [];
            
//             if (!map) {
//                 console.error('지도가 초기화되지 않았습니다.');
//                 return;
//             }
            
//             // 새 마커 생성 (구글 맵 마커)
//             touristData.forEach((place, index) => {
//                 // 좌표 정보가 있는 경우에만 마커 생성
//                 if (place.X_COORD && place.Y_COORD) {
//                     try {
//                         // 구글 맵용 좌표 객체
//                         const position = { lat: place.Y_COORD, lng: place.X_COORD };
                        
//                         // 구글 맵 마커 생성
//                         const marker = new google.maps.Marker({
//                             position: position,
//                             map: null, // 처음에는 지도에 표시하지 않음
//                             title: place.VISIT_AREA_NM || '이름 없음'
//                         });
                        
//                         // 마커에 클릭 이벤트 추가
//                         marker.addListener('click', function() {
//                             showPlaceInfo(place);
//                         });
                        
//                         // 마커 정보 저장
//                         markers.push({
//                             marker: marker,
//                             place: place
//                         });
//                     } catch (err) {
//                         console.error('마커 생성 중 오류:', err);
//                     }
//                 }
//             });
            
//             // 초기 필터 적용
//             filterMarkers();
//         } catch (error) {
//             console.error('마커 생성 중 오류:', error);
//         }
//     }
    
//     // 마커 필터링
//     function filterMarkers() {
//         try {
//             if (!map || !markers || markers.length === 0) return;
            
//             markers.forEach(item => {
//                 if (!item || !item.marker || !item.place) return;
                
//                 const marker = item.marker;
//                 const place = item.place;
                
//                 // 지역 필터
//                 const regionMatch = currentRegion === 'all' || place.SIDO_NM === currentRegion;
                
//                 // 카테고리 필터
//                 const category = place.VISIT_AREA_TYPE_CD ? place.VISIT_AREA_TYPE_CD.toString() : '';
//                 const categoryMatch = currentCategories.includes(category);
                
//                 // 만족도 필터
//                 const satisfaction = place.DGSTFN || 0;
//                 const satisfactionMatch = satisfaction >= minSatisfaction;
                
//                 // 조건에 맞으면 지도에 표시, 아니면 숨김
//                 if (regionMatch && categoryMatch && satisfactionMatch) {
//                     marker.setMap(map);
//                 } else {
//                     marker.setMap(null);
//                 }
//             });
//         } catch (error) {
//             console.error('마커 필터링 중 오류:', error);
//         }
//     }
    
//     // 장소 정보 표시
//     function showPlaceInfo(place) {
//         try {
//             if (!place) return;
            
//             const name = place.VISIT_AREA_NM || '이름 없음';
//             const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '주소 정보 없음';
//             const satisfaction = place.DGSTFN || '-';
//             const visitDate = formatDate(place.VISIT_START_YMD);
//             const stayTime = place.RESIDENCE_TIME_MIN ? `${place.RESIDENCE_TIME_MIN}분` : '정보 없음';
            
//             let categoryName = '기타';
//             switch(place.VISIT_AREA_TYPE_CD) {
//                 case 1: categoryName = '자연 관광지'; break;
//                 case 2: categoryName = '문화/역사/종교시설'; break;
//                 case 3: categoryName = '문화시설'; break;
//                 case 4: categoryName = '상업지구'; break;
//                 case 5: categoryName = '레저/스포츠'; break;
//                 case 6: categoryName = '테마시설'; break;
//                 case 7: categoryName = '산책로/둘레길'; break;
//                 case 8: categoryName = '축제/행사'; break;
//                 case 9: categoryName = '교통시설'; break;
//                 case 10: categoryName = '상점'; break;
//                 case 11: categoryName = '식당/카페'; break;
//                 case 24: categoryName = '숙소'; break;
//             }
            
//             // 구글 맵 인포윈도우 생성
//             if (typeof google !== 'undefined' && google.maps && map) {
//                 const infowindow = new google.maps.InfoWindow({
//                     content: `
//                     <div style="padding:10px;width:300px;">
//                         <h5 style="margin-top:0;margin-bottom:10px;">${name}</h5>
//                         <p style="margin:0;font-size:0.9em;color:#666;">${address}</p>
//                         <p style="margin:8px 0;">유형: ${categoryName}</p>
//                         <p style="margin:8px 0;">방문 날짜: ${visitDate}</p>
//                         <p style="margin:8px 0;">체류 시간: ${stayTime}</p>
//                         <p style="margin:8px 0;">만족도: ${satisfaction}/5</p>
//                     </div>`
//                 });
                
//                 // 마커 찾기
//                 const markerObj = markers.find(m => m.place.VISIT_AREA_ID === place.VISIT_AREA_ID);
//                 if (markerObj && markerObj.marker) {
//                     infowindow.open(map, markerObj.marker);
//                 }
//             } else {
//                 // 구글 맵이 없는 경우 alert로 표시
//                 const content = `
//                 ${name}
//                 주소: ${address}
//                 유형: ${categoryName}
//                 방문 날짜: ${visitDate}
//                 체류 시간: ${stayTime}
//                 만족도: ${satisfaction}/5`;
                
//                 alert(content);
//             }
//         } catch (error) {
//             console.error('장소 정보 표시 중 오류:', error);
//         }
//     }
    
//     // 장소 목록 표시
//     function displayPlaces() {
//         try {
//             const container = document.getElementById('region-places-container');
//             if (!container) {
//                 console.error('region-places-container 요소를 찾을 수 없습니다');
//                 return;
//             }
            
//             // 필터링된 장소 목록
//             const filteredPlaces = touristData.filter(place => {
//                 // 지역 필터
//                 const regionMatch = currentRegion === 'all' || place.SIDO_NM === currentRegion;
                
//                 // 카테고리 필터
//                 const category = place.VISIT_AREA_TYPE_CD ? place.VISIT_AREA_TYPE_CD.toString() : '';
//                 const categoryMatch = currentCategories.includes(category);
                
//                 // 만족도 필터
//                 const satisfaction = place.DGSTFN || 0;
//                 const satisfactionMatch = satisfaction >= minSatisfaction;
                
//                 return regionMatch && categoryMatch && satisfactionMatch;
//             });
            
//             // 데이터가 없는 경우 메시지 표시
//             if (filteredPlaces.length === 0) {
//                 container.innerHTML = '<div class="col-12 text-center py-5"><p>검색 조건에 맞는 장소가 없습니다.</p></div>';
                
//                 const loadMoreBtn = document.getElementById('load-more');
//                 if (loadMoreBtn) {
//                     loadMoreBtn.style.display = 'none';
//                 }
//                 return;
//             }
            
//             // 만족도 기준으로 정렬 (높은 순)
//             filteredPlaces.sort((a, b) => (b.DGSTFN || 0) - (a.DGSTFN || 0));
            
//             // 표시할 아이템 선택 (페이지네이션)
//             const placesToShow = filteredPlaces.slice(0, visibleItems);
            
//             // HTML 생성
//             let html = '';
//             placesToShow.forEach(place => {
//                 const name = place.VISIT_AREA_NM || '이름 없음';
//                 const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '';
//                 const satisfaction = place.DGSTFN || '-';
//                 const visitDate = formatDate(place.VISIT_START_YMD);
                
//                 // 관광지 유형에 따른 아이콘 및 카테고리 설정
//                 let categoryIcon = 'fas fa-map-marker-alt';
//                 let category = '기타';
                
//                 switch(place.VISIT_AREA_TYPE_CD) {
//                     case 1:
//                         categoryIcon = 'fas fa-mountain';
//                         category = '자연 관광지';
//                         break;
//                     case 2:
//                         categoryIcon = 'fas fa-landmark';
//                         category = '문화/역사/종교시설';
//                         break;
//                     case 3:
//                         categoryIcon = 'fas fa-theater-masks';
//                         category = '문화시설';
//                         break;
//                     case 4:
//                         categoryIcon = 'fas fa-store';
//                         category = '상업지구';
//                         break;
//                     case 5:
//                         categoryIcon = 'fas fa-running';
//                         category = '레저/스포츠';
//                         break;
//                     case 6:
//                         categoryIcon = 'fas fa-ticket-alt';
//                         category = '테마시설';
//                         break;
//                     case 7:
//                         categoryIcon = 'fas fa-hiking';
//                         category = '산책로/둘레길';
//                         break;
//                     case 8:
//                         categoryIcon = 'fas fa-calendar-alt';
//                         category = '축제/행사';
//                         break;
//                     case 9:
//                         categoryIcon = 'fas fa-bus';
//                         category = '교통시설';
//                         break;
//                     case 10:
//                         categoryIcon = 'fas fa-shopping-bag';
//                         category = '상점';
//                         break;
//                     case 11:
//                         categoryIcon = 'fas fa-utensils';
//                         category = '식당/카페';
//                         break;
//                     case 24:
//                         categoryIcon = 'fas fa-bed';
//                         category = '숙소';
//                         break;
//                 }
                
//                 html += `
//                 <div class="col-md-4 mb-4">
//                     <div class="card h-100">
//                         <div class="card-header bg-primary text-white">
//                             <i class="${categoryIcon} me-2"></i>${category}
//                         </div>
//                         <div class="card-body">
//                             <h5 class="card-title">${name}</h5>
//                             <p class="card-text text-muted small">${address}</p>
//                             <p class="card-text">
//                                 <small class="text-muted">
//                                     <i class="fas fa-calendar me-1"></i>${visitDate}
//                                 </small>
//                             </p>
//                             <div class="d-flex justify-content-between align-items-center">
//                                 <span class="badge bg-info">
//                                     ${place.RESIDENCE_TIME_MIN ? place.RESIDENCE_TIME_MIN + '분 체류' : '체류 시간 정보 없음'}
//                                 </span>
//                                 <span class="badge bg-success">
//                                     <i class="fas fa-star me-1"></i>${satisfaction}/5
//                                 </span>
//                             </div>
//                         </div>
//                         <div class="card-footer">
//                             <button class="btn btn-sm btn-outline-primary view-details" 
//                                     data-place-id="${place.VISIT_AREA_ID || ''}">
//                                 상세 정보
//                             </button>
//                         </div>
//                     </div>
//                 </div>`;
//             });
            
//             container.innerHTML = html;
            
//             // 더보기 버튼 표시/숨김
//             const loadMoreBtn = document.getElementById('load-more');
//             if (loadMoreBtn) {
//                 if (filteredPlaces.length <= visibleItems) {
//                     loadMoreBtn.style.display = 'none';
//                 } else {
//                     loadMoreBtn.style.display = 'inline-block';
//                 }
//             }

//             // 상세 정보 버튼 이벤트 리스너 추가
//             document.querySelectorAll('.view-details').forEach(button => {
//                 button.addEventListener('click', function() {
//                     const placeId = this.getAttribute('data-place-id');
//                     const place = touristData.find(p => p.VISIT_AREA_ID === placeId);
//                     if (place) {
//                         showPlaceInfo(place);
//                     }
//                 });
//             });
//         } catch (error) {
//             console.error('장소 목록 표시 중 오류:', error);
//         }
//     }
    
//     // 지역 정보 업데이트
//     function updateRegionInfo() {
//         try {
//             const regionTitle = document.getElementById('region-title');
//             const regionDescription = document.getElementById('region-description');
            
//             if (!regionTitle || !regionDescription) {
//                 console.error('지역 정보 요소를 찾을 수 없습니다');
//                 return;
//             }
            
//             // 지역별 타이틀 및 설명 업데이트
//             if (currentRegion === 'all') {
//                 regionTitle.textContent = '전체 지역 정보';
//                 regionDescription.textContent = '대한민국의 주요 여행지 정보를 확인하세요.';
//             } else {
//                 regionTitle.textContent = `${currentRegion} 여행 정보`;
//                 regionDescription.textContent = `${currentRegion}의 다양한 여행지를 확인하세요.`;
//             }
            
//             // 지도 중심 및 확대 레벨 조정
//             if (!map) return;
            
//             if (currentRegion !== 'all') {
//                 // 지역별 중심 좌표 (실제 구현 시 정확한 좌표 사용)
//                 const regionCoords = {
//                     '서울특별시': { lat: 37.5665, lng: 126.9780, zoom: 11 },
//                     '경기도': { lat: 37.4138, lng: 127.5183, zoom: 9 },
//                     '강원도': { lat: 37.8228, lng: 128.1555, zoom: 9 },
//                     '충청북도': { lat: 36.6357, lng: 127.4914, zoom: 9 },
//                     '충청남도': { lat: 36.5184, lng: 126.8000, zoom: 9 },
//                     '전라북도': { lat: 35.7175, lng: 127.1530, zoom: 9 },
//                     '전라남도': { lat: 34.8679, lng: 126.9910, zoom: 9 },
//                     '경상북도': { lat: 36.4919, lng: 128.8889, zoom: 9 },
//                     '경상남도': { lat: 35.4606, lng: 128.2132, zoom: 9 },
//                     '제주특별자치도': { lat: 33.4996, lng: 126.5312, zoom: 10 }
//                 };
                
//                 if (regionCoords[currentRegion]) {
//                     const coords = regionCoords[currentRegion];
//                     map.setCenter({ lat: coords.lat, lng: coords.lng });
//                     map.setZoom(coords.zoom);
//                 }
//             } else {
//                 // 전체 지역 선택 시 한국 전체가 보이도록 설정
//                 map.setCenter({ lat: 36.2, lng: 127.9 });
//                 map.setZoom(7);
//             }
//         } catch (error) {
//             console.error('지역 정보 업데이트 중 오류:', error);
//         }
//     }
    
//     // 차트 초기화
//     function initializeCharts() {
//         try {
//             // Chart.js가 로드되었는지 확인
//             if (typeof Chart === 'undefined') {
//                 console.error('Chart.js가 로드되지 않았습니다');
//                 return;
//             }
            
//             // 카테고리별 분포 차트
//             const categoryCtx = document.getElementById('category-chart');
//             if (!categoryCtx) {
//                 console.error('category-chart 요소를 찾을 수 없습니다');
//                 return;
//             }
            
//             // 카테고리별 분포 차트
//             categoryChart = new Chart(categoryCtx, {
//                 type: 'doughnut',
//                 data: {
//                     labels: [
//                         '자연 관광지', 
//                         '문화/역사/종교시설', 
//                         '문화시설', 
//                         '상업지구', 
//                         '레저/스포츠', 
//                         '테마시설',
//                         '산책로/둘레길',
//                         '축제/행사',
//                         '교통시설',
//                         '상점',
//                         '식당/카페',
//                         '기타'
//                     ],
//                     datasets: [{
//                         data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
//                         backgroundColor: [
//                             '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
//                             '#FF9F40', '#C9CBCF', '#FF8A80', '#8BC34A', '#9C27B0',
//                             '#FFEB3B', '#607D8B'
//                         ]
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     plugins: {
//                         legend: {
//                             position: 'right',
//                             labels: {
//                                 boxWidth: 12,
//                                 font: {
//                                     size: 10
//                                 }
//                             }
//                         },
//                         title: {
//                             display: true,
//                             text: '카테고리별 장소 분포'
//                         }
//                     }
//                 }
//             });
            
//             // 만족도 분포 차트
//             const satisfactionCtx = document.getElementById('satisfaction-chart');
//             if (!satisfactionCtx) {
//                 console.error('satisfaction-chart 요소를 찾을 수 없습니다');
//                 return;
//             }
            
//             satisfactionChart = new Chart(satisfactionCtx, {
//                 type: 'bar',
//                 data: {
//                     labels: ['1점', '2점', '3점', '4점', '5점'],
//                     datasets: [{
//                         label: '만족도 분포',
//                         data: [0, 0, 0, 0, 0],
//                         backgroundColor: [
//                             '#FF6384', '#FF9F40', '#FFCE56', '#4BC0C0', '#36A2EB'
//                         ]
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     scales: {
//                         y: {
//                             beginAtZero: true
//                         }
//                     },
//                     plugins: {
//                         title: {
//                             display: true,
//                             text: '만족도별 분포'
//                         }
//                     }
//                 }
//             });
            
//             // 초기 차트 데이터 업데이트
//             updateCharts();
//         } catch (error) {
//             console.error('차트 초기화 중 오류:', error);
//         }
//     }
    
//     // 차트 데이터 업데이트
//     function updateCharts() {
//         try {
//             if (!categoryChart || !satisfactionChart) {
//                 console.error('차트가 초기화되지 않았습니다');
//                 return;
//             }
            
//             // 필터링된 장소 목록
//             const filteredPlaces = touristData.filter(place => {
//                 // 지역 필터
//                 const regionMatch = currentRegion === 'all' || place.SIDO_NM === currentRegion;
                
//                 // 카테고리 필터
//                 const category = place.VISIT_AREA_TYPE_CD ? place.VISIT_AREA_TYPE_CD.toString() : '';
//                 const categoryMatch = currentCategories.includes(category);
                
//                 // 만족도 필터
//                 const satisfaction = place.DGSTFN || 0;
//                 const satisfactionMatch = satisfaction >= minSatisfaction;
                
//                 return regionMatch && categoryMatch && satisfactionMatch;
//             });
            
//             // 카테고리별 분포 데이터
//             const categoryData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 카테고리별 개수
            
//             filteredPlaces.forEach(place => {
//                 const type = place.VISIT_AREA_TYPE_CD;
//                 if (type >= 1 && type <= 8) {
//                     categoryData[type - 1]++; // 1-8 카테고리
//                 } else if (type === 9) {
//                     categoryData[8]++; // 교통시설
//                 } else if (type === 10) {
//                     categoryData[9]++; // 상점
//                 } else if (type === 11) {
//                     categoryData[10]++; // 식당/카페
//                 } else {
//                     categoryData[11]++; // 기타
//                 }
//             });
            
//             categoryChart.data.datasets[0].data = categoryData;
//             categoryChart.update();
            
//             // 만족도 분포 데이터
//             const satisfactionData = [0, 0, 0, 0, 0]; // [1점, 2점, 3점, 4점, 5점]
            
//             filteredPlaces.forEach(place => {
//                 const satisfaction = Math.floor(place.DGSTFN);
//                 if (satisfaction >= 1 && satisfaction <= 5) {
//                     satisfactionData[satisfaction - 1]++;
//                 }
//             });
            
//             satisfactionChart.data.datasets[0].data = satisfactionData;
//             satisfactionChart.update();
//         } catch (error) {
//             console.error('차트 업데이트 중 오류:', error);
//         }
//     }
    
//     // 인기 여행지 테이블 업데이트
//     function updateTopPlacesTable() {
//         try {
//             const tableBody = document.querySelector('#top-places-table tbody');
//             if (!tableBody) {
//                 console.error('top-places-table 또는 tbody 요소를 찾을 수 없습니다');
//                 return;
//             }
            
//             // 필터링된 장소 목록
//             const filteredPlaces = touristData.filter(place => {
//                 // 지역 필터만 적용 (카테고리 및 만족도 필터는 적용하지 않음)
//                 return currentRegion === 'all' || place.SIDO_NM === currentRegion;
//             });
            
//             // 만족도 기준으로 정렬 (높은 순)
//             const topPlaces = filteredPlaces
//                 .filter(place => place.DGSTFN && place.DGSTFN > 0) // 만족도가 있는 항목만
//                 .sort((a, b) => b.DGSTFN - a.DGSTFN)
//                 .slice(0, 5); // 상위 5개
            
//             // HTML 생성
//             let html = '';
//             if (topPlaces.length > 0) {
//                 topPlaces.forEach((place, index) => {
//                     const name = place.VISIT_AREA_NM || '이름 없음';
//                     const region = place.SIDO_NM || '';
//                     const satisfaction = place.DGSTFN || '-';
                    
//                     // 관광지 유형에 따른 카테고리 설정
//                     let category = '기타';
//                     switch(place.VISIT_AREA_TYPE_CD) {
//                         case 1: category = '자연 관광지'; break;
//                         case 2: category = '문화/역사/종교시설'; break;
//                         case 3: category = '문화시설'; break;
//                         case 4: category = '상업지구'; break;
//                         case 5: category = '레저/스포츠'; break;
//                         case 6: category = '테마시설'; break;
//                         case 11: category = '식당/카페'; break;
//                         case 24: category = '숙소'; break;
//                     }
                    
//                     html += `
//                     <tr>
//                         <td>${index + 1}</td>
//                         <td>${name}</td>
//                         <td>${region}</td>
//                         <td>${category}</td>
//                         <td>
//                             <span class="badge bg-success">
//                                 <i class="fas fa-star me-1"></i>${satisfaction}/5
//                             </span>
//                         </td>
//                     </tr>`;
//                 });
//             } else {
//                 html = '<tr><td colspan="5" class="text-center">데이터가 없습니다.</td></tr>';
//             }
            
//             tableBody.innerHTML = html;
//         } catch (error) {
//             console.error('인기 여행지 테이블 업데이트 중 오류:', error);
//         }
//     }
    
//     // 날짜 포맷팅 함수 (YYYYMMDD -> YYYY년 MM월 DD일)
//     function formatDate(dateStr) {
//         if (!dateStr) return '날짜 정보 없음';
        
//         try {
//             const year = dateStr.substring(0, 4);
//             const month = dateStr.substring(4, 6);
//             const day = dateStr.substring(6, 8);
            
//             return `${year}년 ${month}월 ${day}일`;
//         } catch (error) {
//             console.error('날짜 포맷팅 중 오류:', error, dateStr);
//             return '날짜 정보 없음';
//         }
//     }
    
//     // 구글 맵 API 초기화 콜백 함수 (전역 함수로 정의)
//     window.initMap = function() {
//         initializeMap();
//     };
// });





// assets/js/regions.js

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
    let isDataLoading = false; // 데이터 로딩 상태 추적
    
    // Leaflet 지도 초기화 및 데이터 로드
    initializeLeafletMap();
    loadTouristData();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // Leaflet 맵 초기화 (API 키 필요 없음)
    function initializeLeafletMap() {
        try {
            // 지도 컨테이너 검색
            const mapContainer = document.getElementById('map');
            
            if (!mapContainer) {
                console.error('지도 컨테이너를 찾을 수 없습니다');
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
        } catch (error) {
            console.error('지도 초기화 중 오류:', error);
            
            // 오류 발생 시 대체 메시지 표시
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-map-marked-alt fa-5x text-muted mb-3"></i>
                        <h4>지도를 불러올 수 없습니다</h4>
                        <p>네트워크 연결을 확인해주세요.</p>
                    </div>
                `;
            }
        }
    }
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 지역 목록 클릭 이벤트 처리
        const regionLinks = document.querySelectorAll('#region-list a');
        if (regionLinks.length > 0) {
            regionLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // 이전 선택 항목에서 active 클래스 제거
                    const activeLink = document.querySelector('#region-list a.active');
                    if (activeLink) {
                        activeLink.classList.remove('active');
                    }
                    
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
        }
        
        // 필터 적용 버튼 클릭 이벤트
        const applyFilterBtn = document.getElementById('apply-filter');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', function() {
                // 선택된 카테고리 가져오기
                const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                if (checkboxes.length > 0) {
                    currentCategories = Array.from(checkboxes).map(checkbox => checkbox.value);
                } else {
                    // 체크박스가 없는 경우 기본 카테고리 사용
                    currentCategories = ['1', '2', '3', '4', '5', '6', '11', '24'];
                }
                
                filterMarkers();
                displayPlaces();
                updateCharts();
            });
        }
        
        // 만족도 필터 슬라이더 이벤트
        const satisfactionRange = document.getElementById('satisfaction-range');
        if (satisfactionRange) {
            satisfactionRange.addEventListener('input', function() {
                minSatisfaction = parseInt(this.value);
                const satisfactionValue = document.getElementById('satisfaction-value');
                if (satisfactionValue) {
                    satisfactionValue.textContent = minSatisfaction;
                }
                
                filterMarkers();
                displayPlaces();
                updateCharts();
            });
        }
        
        // 더보기 버튼 클릭 이벤트
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function() {
                visibleItems += 12; // 12개씩 추가로 표시
                displayPlaces();
            });
        }
    }
    
    // 여행지 데이터 로드
    async function loadTouristData() {
        try {
            if (isDataLoading) return; // 이미 로딩 중이면 중단
            isDataLoading = true;
            
            // 먼저 캐시된 데이터가 있는지 확인
            if (window.cachedTouristData) {
                touristData = window.cachedTouristData;
                console.log('캐시된 데이터 사용');
                processLoadedData();
                isDataLoading = false;
                return;
            }
            
            // 상대 경로로 변경
            const fullPath = '../data/ml_filtered_master_tourist_only.jsonl';
            console.log('데이터 로드 시도:', fullPath);
            
            const response = await fetch(fullPath);
            
            if (!response.ok) {
                throw new Error(`HTTP 오류! 상태: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('로드된 데이터 미리보기:', text.substring(0, 100));
            
            // 파일을 라인별로 분할하여 처리 (큰 파일 처리 최적화)
            const lines = text.trim().split('\n');
            console.log(`총 ${lines.length}개 라인 처리 시작`);
            
            // 청크 단위로 처리하여 UI 차단 방지
            const chunkSize = 200;
            let processedItems = [];
            
            for (let i = 0; i < lines.length; i += chunkSize) {
                const chunk = lines.slice(i, Math.min(i + chunkSize, lines.length));
                const parsedItems = chunk.map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        console.error('파싱 오류:', e, line.substring(0, 50) + '...');
                        return null;
                    }
                }).filter(item => item !== null);
                
                processedItems = processedItems.concat(parsedItems);
                
                // UI 차단 방지를 위해 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // 전역 캐시에 저장
            touristData = processedItems;
            window.cachedTouristData = touristData;
            console.log('새 데이터 로드 완료:', touristData.length, '개 항목');
            
            processLoadedData();
            
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
            
            // 오류 발생 시 대체 데이터 생성 (샘플 데이터)
            createSampleData();
            processLoadedData();
        } finally {
            isDataLoading = false;
        }
    }
    
    // 샘플 데이터 생성 (데이터 로드 실패 시 사용)
    function createSampleData() {
        touristData = [
            {
                VISIT_AREA_ID: "2208290001",
                TRAVEL_ID: "a_a000605",
                VISIT_ORDER: 14,
                VISIT_AREA_NM: "경복궁",
                SIDO_NM: "서울특별시",
                ROAD_NM_ADDR: "서울특별시 종로구 사직로 161",
                LOTNO_ADDR: "서울특별시 종로구 세종로 1-1",
                VISIT_AREA_TYPE_CD: 2,
                DGSTFN: 4.8,
                X_COORD: 126.9770,
                Y_COORD: 37.5796
            },
            {
                VISIT_AREA_ID: "2208290002",
                TRAVEL_ID: "a_a000606",
                VISIT_ORDER: 2,
                VISIT_AREA_NM: "남산서울타워",
                SIDO_NM: "서울특별시",
                ROAD_NM_ADDR: "서울특별시 용산구 남산공원길 105",
                LOTNO_ADDR: "서울특별시 용산구 용산동2가 산1-3",
                VISIT_AREA_TYPE_CD: 6,
                DGSTFN: 4.6,
                X_COORD: 126.9882,
                Y_COORD: 37.5511
            },
            {
                VISIT_AREA_ID: "2208290003",
                TRAVEL_ID: "a_a000607",
                VISIT_ORDER: 3,
                VISIT_AREA_NM: "한라산국립공원",
                SIDO_NM: "제주특별자치도",
                ROAD_NM_ADDR: "제주특별자치도 제주시 1100로 2070-61",
                LOTNO_ADDR: "제주특별자치도 제주시 오등동 산 182",
                VISIT_AREA_TYPE_CD: 1,
                DGSTFN: 4.9,
                X_COORD: 126.5450,
                Y_COORD: 33.3616
            },
            {
                VISIT_AREA_ID: "2208290004",
                TRAVEL_ID: "a_a000608",
                VISIT_ORDER: 5,
                VISIT_AREA_NM: "해운대해수욕장",
                SIDO_NM: "부산광역시",
                ROAD_NM_ADDR: "부산광역시 해운대구 해운대해변로 264",
                LOTNO_ADDR: "부산광역시 해운대구 우동 1393-3",
                VISIT_AREA_TYPE_CD: 1,
                DGSTFN: 4.7,
                X_COORD: 129.1601,
                Y_COORD: 35.1583
            },
            {
                VISIT_AREA_ID: "2208290005",
                TRAVEL_ID: "a_a000609",
                VISIT_ORDER: 8,
                VISIT_AREA_NM: "광안리해수욕장",
                SIDO_NM: "부산광역시",
                ROAD_NM_ADDR: "부산광역시 수영구 광안해변로 219",
                LOTNO_ADDR: "부산광역시 수영구 광안동 197-1",
                VISIT_AREA_TYPE_CD: 1,
                DGSTFN: 4.5,
                X_COORD: 129.1178,
                Y_COORD: 35.1531
            }
        ];
        console.log('샘플 데이터 생성:', touristData.length, '개 항목');
    }
    
    // 데이터 로드 후 처리
    function processLoadedData() {
        if (!touristData || touristData.length === 0) {
            console.error('데이터를 불러올 수 없습니다.');
            return;
        }
        
        // 마커 생성 및 지도에 표시
        if (map) {
            createMarkers();
        }
        
        // 장소 목록 표시
        displayPlaces();
        
        // 차트 초기화
        initializeCharts();
        
        // 인기 여행지 테이블 업데이트
        updateTopPlacesTable();
    }
    
    // 카테고리 정보 가져오기 (공통 함수)
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
    
    // 마커 생성 및 지도에 표시 (Leaflet 버전)
    function createMarkers() {
        try {
            // 기존 마커 제거
            markers.forEach(marker => {
                if (marker.marker) {
                    map.removeLayer(marker.marker);
                }
            });
            markers = [];
            
            if (!map) {
                console.error('지도가 초기화되지 않았습니다.');
                return;
            }
            
            // 새 마커 생성 (Leaflet 마커)
            touristData.forEach((place, index) => {
                // 좌표 정보가 있는 경우에만 마커 생성
                if (place.X_COORD && place.Y_COORD) {
                    try {
                        // Leaflet 좌표 순서: [lat, lng]
                        const position = [place.Y_COORD, place.X_COORD];
                        
                        // 기본 Leaflet 마커 생성
                        const marker = L.marker(position);
                        
                        // 팝업 설정
                        marker.bindPopup(`
                            <div style="min-width: 200px;">
                                <b>${place.VISIT_AREA_NM || '이름 없음'}</b><br>
                                ${place.ROAD_NM_ADDR || place.LOTNO_ADDR || ''}
                            </div>
                        `);
                        
                        // 클릭 이벤트 추가
                        marker.on('click', function() {
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
    
    // 마커 필터링 (Leaflet 버전)
    function filterMarkers() {
        try {
            if (!map || !markers || markers.length === 0) return;
            
            markers.forEach(item => {
                if (!item || !item.marker || !item.place) return;
                
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
                    if (!map.hasLayer(marker)) {
                        marker.addTo(map);
                    }
                } else {
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
                    }
                }
            });
        } catch (error) {
            console.error('마커 필터링 중 오류:', error);
        }
    }
    
    // 장소 정보 표시
    function showPlaceInfo(place) {
        try {
            if (!place) return;
            
            const name = place.VISIT_AREA_NM || '이름 없음';
            const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '주소 정보 없음';
            const satisfaction = place.DGSTFN || '-';
            const visitDate = formatDate(place.VISIT_START_YMD);
            const stayTime = place.RESIDENCE_TIME_MIN ? `${place.RESIDENCE_TIME_MIN}분` : '정보 없음';
            
            // 카테고리 정보 가져오기
            const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
            
            // Leaflet 팝업 내용 업데이트
            const markerObj = markers.find(m => m.place.VISIT_AREA_ID === place.VISIT_AREA_ID);
            if (markerObj && markerObj.marker) {
                markerObj.marker.setPopupContent(`
                    <div style="min-width: 250px; padding: 5px;">
                        <h5 style="margin-top:0;margin-bottom:8px;">${name}</h5>
                        <p style="margin:0;font-size:0.9em;color:#666;">${address}</p>
                        <p style="margin:8px 0;"><i class="${categoryInfo.icon}"></i> ${categoryInfo.name}</p>
                        <p style="margin:8px 0;">방문 날짜: ${visitDate}</p>
                        <p style="margin:8px 0;">체류 시간: ${stayTime}</p>
                        <p style="margin:8px 0;">만족도: ${satisfaction}/5</p>
                    </div>
                `);
                markerObj.marker.openPopup();
            }
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
                
                // 카테고리 정보 가져오기
                const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
                
                html += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <div class="card-header bg-primary text-white">
                            <i class="${categoryInfo.icon} me-2"></i>${categoryInfo.name}
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
                        
                        // 해당 마커 찾기
                        const markerObj = markers.find(m => m.place.VISIT_AREA_ID === placeId);
                        if (markerObj && markerObj.marker) {
                            // 지도 중심을 마커 위치로 이동
                            map.setView([markerObj.place.Y_COORD, markerObj.place.X_COORD], 14);
                            // 마커 팝업 열기
                            markerObj.marker.openPopup();
                        }
                    }
                });
            });
        } catch (error) {
            console.error('장소 목록 표시 중 오류:', error);
        }
    }
    
    // 지역 정보 업데이트 (Leaflet 버전)
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
                    '서울특별시': { lat: 37.5665, lng: 126.9780, zoom: 11 },
                    '경기도': { lat: 37.4138, lng: 127.5183, zoom: 9 },
                    '강원도': { lat: 37.8228, lng: 128.1555, zoom: 9 },
                    '충청북도': { lat: 36.6357, lng: 127.4914, zoom: 9 },
                    '충청남도': { lat: 36.5184, lng: 126.8000, zoom: 9 },
                    '전라북도': { lat: 35.7175, lng: 127.1530, zoom: 9 },
                    '전라남도': { lat: 34.8679, lng: 126.9910, zoom: 9 },
                    '경상북도': { lat: 36.4919, lng: 128.8889, zoom: 9 },
                    '경상남도': { lat: 35.4606, lng: 128.2132, zoom: 9 },
                    '제주특별자치도': { lat: 33.4996, lng: 126.5312, zoom: 10 }
                };
                
                if (regionCoords[currentRegion]) {
                    const coords = regionCoords[currentRegion];
                    map.setView([coords.lat, coords.lng], coords.zoom);
                }
            } else {
                // 전체 지역 선택 시 한국 전체가 보이도록 설정
                map.setView([36.2, 127.9], 7);
            }
        } catch (error) {
            console.error('지역 정보 업데이트 중 오류:', error);
        }
    }
    
    // 차트 초기화
    function initializeCharts() {
        try {
            // Chart.js가 로드되었는지 확인
            if (typeof Chart === 'undefined') {
                console.error('Chart.js가 로드되지 않았습니다');
                return;
            }
            
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
                const satisfaction = Math.floor(place.DGSTFN);
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
            const tableBody = document.querySelector('#top-places-table tbody');
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
                    
                    // 카테고리 정보 가져오기
                    const categoryInfo = getCategoryInfo(place.VISIT_AREA_TYPE_CD);
                    
                    html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${name}</td>
                        <td>${region}</td>
                        <td>${categoryInfo.name}</td>
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
            
            // 테이블 행에 클릭 이벤트 추가
            const tableRows = tableBody.querySelectorAll('tr');
            tableRows.forEach((row, index) => {
                // 데이터가 없음 메시지 행은 제외
                if (index < topPlaces.length) {
                    row.style.cursor = 'pointer';
                    row.addEventListener('click', function() {
                        const place = topPlaces[index];
                        
                        // 해당 마커 찾기
                        const markerObj = markers.find(m => m.place.VISIT_AREA_ID === place.VISIT_AREA_ID);
                        if (markerObj && markerObj.marker && map) {
                            // 지도 이동 및 줌
                            map.setView([place.Y_COORD, place.X_COORD], 14);
                            // 팝업 열기
                            markerObj.marker.openPopup();
                        }
                        
                        // 상세 정보 표시
                        showPlaceInfo(place);
                    });
                }
            });
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