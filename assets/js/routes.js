// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let map;
    let touristData = [];
    let selectedPlaces = [];
    let routeLine;
    let markers = [];
    
    // 지도 초기화
    initializeMap();
    
    // 데이터 로드
    loadTouristData();
    
    // 폼 제출 이벤트 처리
    document.getElementById('route-form').addEventListener('submit', function(e) {
        e.preventDefault();
        loadRecommendedPlaces();
    });
    
    // 경로 최적화 버튼 클릭 이벤트
    document.getElementById('optimize-route').addEventListener('click', function() {
        if (selectedPlaces.length < 2) {
            alert('경로를 계산하려면 최소 2개 이상의 장소를 선택해주세요.');
            return;
        }
        
        optimizeRoute();
        generateItinerary();
    });
    
    // 일정표 저장 버튼 클릭 이벤트
    document.getElementById('save-itinerary').addEventListener('click', function() {
        saveItinerary();
    });
    
    // 공유하기 버튼 클릭 이벤트
    document.getElementById('share-itinerary').addEventListener('click', function() {
        shareItinerary();
    });
    
    // 카카오 지도 초기화
    function initializeMap() {
        const container = document.getElementById('route-map');
        const options = {
            center: new kakao.maps.LatLng(36.2, 127.9), // 대한민국 중심 좌표
            level: 13 // 확대 레벨
        };
        
        map = new kakao.maps.Map(container, options);
    }
    
    // 여행지 데이터 로드
    async function loadTouristData() {
        try {
            // 먼저 캐시된 데이터가 있는지 확인
            if (window.cachedTouristData) {
                touristData = window.cachedTouristData;
                console.log('캐시된 데이터 사용');
            } else {
                const response = await fetch('../data/ml_filtered_master_tourist_only.jsonl');
                const text = await response.text();
                
                // JSONL 파싱
                touristData = text.trim().split('\n')
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (e) {
                            console.error('파싱 오류:', e);
                            return null;
                        }
                    })
                    .filter(item => item !== null);
                
                // 전역 캐시에 저장
                window.cachedTouristData = touristData;
                console.log('새 데이터 로드 완료');
            }
            
            // 여행 ID 목록 분석
            analyzeTravel();
            
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
    }
    
    // 여행 분석 (여행 ID 기준으로 그룹화)
    function analyzeTravel() {
        // 여행 ID 목록 추출
        const travelIds = touristData
            .filter(item => item.TRAVEL_ID) // 여행 ID가 있는 항목만
            .map(item => item.TRAVEL_ID);
        
        // 중복 제거
        const uniqueTravelIds = [...new Set(travelIds)];
        console.log(`고유 여행 ID 개수: ${uniqueTravelIds.length}`);
    }
    
    // 추천 장소 로드 및 표시
    async function loadRecommendedPlaces() {
        const container = document.getElementById('recommended-places');
        const region = document.getElementById('region-select').value;
        
        if (!region) {
            alert('지역을 선택해주세요.');
            return;
        }
        
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        try {
            if (touristData.length === 0) {
                await loadTouristData();
            }
            
            // 선택된 지역의 데이터 필터링
            const regionPlaces = touristData.filter(place => {
                return place.SIDO_NM === region;
            });
            
            // 선호 장소 유형 필터링
            const preferredTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value);
            
            // 선호 유형과 관련된 여행지 필터링
            let filteredPlaces = regionPlaces;
            if (preferredTypes.length > 0) {
                // 유형별 필터링 로직
                filteredPlaces = regionPlaces.filter(place => {
                    // 관광명소
                    if (preferredTypes.includes('관광명소') && place.VISIT_AREA_TYPE_CD === 1) return true;
                    
                    // 자연/풍경
                    if (preferredTypes.includes('자연') && 
                        (place.VISIT_AREA_NM && 
                         (place.VISIT_AREA_NM.includes('산') || 
                          place.VISIT_AREA_NM.includes('공원') || 
                          place.VISIT_AREA_NM.includes('바다') || 
                          place.VISIT_AREA_NM.includes('강')))) return true;
                    
                    // 문화/역사
                    if (preferredTypes.includes('문화') && 
                        (place.VISIT_AREA_TYPE_CD === 6 || 
                         (place.VISIT_AREA_NM && 
                          (place.VISIT_AREA_NM.includes('박물관') || 
                           place.VISIT_AREA_NM.includes('미술관') || 
                           place.VISIT_AREA_NM.includes('궁') || 
                           place.VISIT_AREA_NM.includes('역사'))))) return true;
                    
                    // 맛집
                    if (preferredTypes.includes('맛집') && place.VISIT_AREA_TYPE_CD === 4) return true;
                    
                    return false;
                });
            }
            
            // 데이터가 없는 경우 메시지 표시
            if (filteredPlaces.length === 0) {
                container.innerHTML = '<div class="col-12 text-center py-3"><p>선택한 조건에 맞는 장소가 없습니다.</p></div>';
                return;
            }
            
            // 만족도 순으로 정렬
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
                
                let category = '기타';
                let categoryIcon = 'fa-map-marker-alt';
                
                switch(place.VISIT_AREA_TYPE_CD) {
                    case 1:
                        category = '관광명소';
                        categoryIcon = 'fa-mountain';
                        break;
                    case 2:
                        category = '숙박';
                        categoryIcon = 'fa-hotel';
                        break;
                    case 3:
                        category = '쇼핑';
                        categoryIcon = 'fa-shopping-bag';
                        break;
                    case 4:
                        category = '맛집';
                        categoryIcon = 'fa-utensils';
                        break;
                    case 5:
                        category = '교통';
                        categoryIcon = 'fa-bus';
                        break;
                    case 6:
                        category = '문화시설';
                        categoryIcon = 'fa-theater-masks';
                        break;
                }
                
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-primary text-white">
                            <i class="fas ${categoryIcon} me-2"></i>${category}
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
                <button class="btn btn-sm btn-danger remove-place" data-place-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
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
    }
    
    // 장소를 선택 목록에서 제거
    function removePlaceFromSelection(index) {
        selectedPlaces.splice(index, 1);
        updateSelectedPlacesList();
        refreshMarkers();
    }
    
    // 지도에 마커 추가
    function addMarkerToMap(place) {
        // 좌표 정보가 있는 경우에만 마커 생성
        if (place.X_COORD && place.Y_COORD) {
            const latlng = new kakao.maps.LatLng(place.Y_COORD, place.X_COORD);
            
            // 마커 생성
            const marker = new kakao.maps.Marker({
                position: latlng,
                map: map
            });
            
            // 마커 정보 저장
            markers.push({
                marker: marker,
                place: place
            });
            
            // 마커에 클릭 이벤트 추가
            kakao.maps.event.addListener(marker, 'click', function() {
                showPlaceInfo(place);
            });
        }
    }
    
    // 모든 마커 새로고침
    function refreshMarkers() {
        // 기존 마커 및 경로선 제거
        markers.forEach(item => {
            item.marker.setMap(null);
        });
        markers = [];
        
        if (routeLine) {
            routeLine.setMap(null);
            routeLine = null;
        }
        
        // 새 마커 추가
        selectedPlaces.forEach(place => {
            addMarkerToMap(place);
        });
    }
    
    // 장소 정보 표시
    function showPlaceInfo(place) {
        const name = place.VISIT_AREA_NM || '이름 없음';
        const address = place.ROAD_NM_ADDR || place.LOTNO_ADDR || '주소 정보 없음';
        const satisfaction = place.DGSTFN || '-';
        const visitDate = formatDate(place.VISIT_START_YMD);
        const stayTime = place.RESIDENCE_TIME_MIN ? `${place.RESIDENCE_TIME_MIN}분` : '정보 없음';
        
        // 인포윈도우 내용 생성
        const content = `
        ${name}
        주소: ${address}
        방문 날짜: ${visitDate}
        체류 시간: ${stayTime}
        만족도: ${satisfaction}/5`;
        
        alert(content);
    }
    
    // 경로 최적화
    function optimizeRoute() {
        // 경로선 생성을 위한 좌표 배열
        const linePath = selectedPlaces.map(place => {
            return new kakao.maps.LatLng(place.Y_COORD, place.X_COORD);
        });
        
        // 기존 경로선 제거
        if (routeLine) {
            routeLine.setMap(null);
        }
        
        // 경로선 생성
        routeLine = new kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 5,
            strokeColor: '#FF0000',
            strokeOpacity: 0.7,
            strokeStyle: 'solid'
        });
        
        // 지도에 경로선 표시
        routeLine.setMap(map);
        
        // 경로가 모두 보이도록 지도 범위 조정
        const bounds = new kakao.maps.LatLngBounds();
        linePath.forEach(point => {
            bounds.extend(point);
        });
        map.setBounds(bounds);
    }
    
    // 일정표 생성
    function generateItinerary() {
        const days = parseInt(document.getElementById('days').value);
        const table = document.getElementById('itinerary-table');
        const tbody = table.querySelector('tbody');
        
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
                    ${i === 0 ? `<td rowspan="${dayPlaces.length}">${day}일차</td>` : ''}
                    <td>${time}</td>
                    <td>${place.VISIT_AREA_NM || '이름 없음'}</td>
                    <td>${category} / ${place.RESIDENCE_TIME_MIN ? place.RESIDENCE_TIME_MIN + '분 소요' : '소요 시간 미정'}</td>
                </tr>`;
            }
        }
        
        tbody.innerHTML = html;
    }
    
    // 일정표를 위한 시간 포맷
    function formatTimeForItinerary(index, total) {
        // 하루 8시간 일정 기준 (9:00 ~ 17:00)
        const startHour = 9;
        const hourInterval = 8 / total;
        
        const hour = startHour + (hourInterval * index);
        const hourInt = Math.floor(hour);
        const minute = Math.floor((hour - hourInt) * 60);
        
        return `${hourInt}:${minute < 10 ? '0' + minute : minute}`;
    }
    
    // 지도 업데이트 (지역별)
    function updateMapForRegion(region) {
        // 지역별 중심 좌표 및 확대 레벨 설정
        const regionCoords = {
            '서울특별시': { lat: 37.5665, lng: 126.9780, level: 8 },
            '경기도': { lat: 37.4138, lng: 127.5183, level: 9 },
            '강원도': { lat: 37.8228, lng: 128.1555, level: 9 },
            '충청북도': { lat: 36.6357, lng: 127.4914, level: 9 },
            '충청남도': { lat: 36.5184, lng: 126.8000, level: 9 },
            '전라북도': { lat: 35.7175, lng: 127.1530, level: 9 },
            '전라남도': { lat: 34.8679, lng: 126.9910, level: 9 },
            '경상북도': { lat: 36.4919, lng: 128.8889, level: 9 },
            '경상남도': { lat: 35.4606, lng: 128.2132, level: 9 },
            '제주도': { lat: 33.4996, lng: 126.5312, level: 10 }
        };
        
        if (regionCoords[region]) {
            const coords = regionCoords[region];
            map.setCenter(new kakao.maps.LatLng(coords.lat, coords.lng));
            map.setLevel(coords.level);
        }
    }
    
    // 일정표 저장 (CSV 포맷)
    function saveItinerary() {
        if (selectedPlaces.length === 0) {
            alert('저장할 일정이 없습니다.');
            return;
        }
        
        const days = parseInt(document.getElementById('days').value);
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
                
                csvContent += `${day}일차,${time},${name},${category}\n`;
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
    }
    
    // 일정표 공유 기능
    function shareItinerary() {
        if (selectedPlaces.length === 0) {
            alert('공유할 일정이 없습니다.');
            return;
        }
        
        // 공유 기능 구현 (클립보드에 URL 복사 또는 소셜 미디어 공유)
        alert('공유 기능은 현재 개발 중입니다. 나중에 다시 시도해주세요.');
    }
    
    // 날짜 포맷팅 함수 (YYYYMMDD -> YYYY년 MM월 DD일)
    function formatDate(dateStr) {
        if (!dateStr) return '날짜 정보 없음';
        
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        
        return `${year}년 ${month}월 ${day}일`;
    }
    
    // 과거 여행 경로 추천 기능
    function suggestPopularRoute() {
        // 여행 ID 기준으로 방문 장소 그룹화
        const travelGroups = {};
        
        touristData.forEach(place => {
            if (place.TRAVEL_ID) {
                if (!travelGroups[place.TRAVEL_ID]) {
                    travelGroups[place.TRAVEL_ID] = [];
                }
                travelGroups[place.TRAVEL_ID].push(place);
            }
        });
        
        // 방문 장소가 3개 이상인 여행만 필터링
        const validTravelIds = Object.keys(travelGroups).filter(id => 
            travelGroups[id].length >= 3
        );
        
        if (validTravelIds.length === 0) {
            alert('추천할 수 있는 여행 경로가 없습니다.');
            return;
        }
        
        // 만족도가 높은 여행 선택
        const popularTravelId = validTravelIds
            .map(id => {
                const avgSatisfaction = travelGroups[id]
                    .filter(place => place.DGSTFN)
                    .reduce((sum, place) => sum + place.DGSTFN, 0) / travelGroups[id].length;
                
                return { id, avgSatisfaction };
            })
            .sort((a, b) => b.avgSatisfaction - a.avgSatisfaction)[0].id;
        
        // 선택된 여행의 방문 장소들을 방문 순서대로 정렬
        const routePlaces = travelGroups[popularTravelId]
            .sort((a, b) => a.VISIT_ORDER - b.VISIT_ORDER);
        
        // 기존 선택 초기화
        selectedPlaces = [];
        refreshMarkers();
        
        // 추천 경로의 장소들 추가
        routePlaces.forEach(place => {
            addPlaceToSelection(place);
        });
        
        // 경로 최적화 및 일정표 생성
        optimizeRoute();
        generateItinerary();
    }
});