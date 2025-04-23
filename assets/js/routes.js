// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let map;
    let touristData = [];
    let selectedPlaces = [];
    let routeLine;
    
    // 지도 초기화
    initializeMap();
    
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
            // 데이터가 로드되지 않았으면 로드
            if (touristData.length === 0) {
                touristData = await loadJSONLFile('../data/ml_filtered_master_tourist_only.jsonl');
            }
            
            if (!touristData || touristData.length === 0) {
                container.innerHTML = '<div class="col-12 text-center"><p>데이터를 불러올 수 없습니다.</p></div>';
                return;
            }
            
            // 선택된 지역의 데이터 필터링
            const regionPlaces = touristData.filter(place => {
                const address = place.address || place.addr || '';
                return address.includes(region);
            });
            
            // 선호 장소 유형 필터링
            const preferredTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value);
            
            let filteredPlaces = regionPlaces;
            if (preferredTypes.length > 0) {
                filteredPlaces = regionPlaces.filter(place => {
                    const category = place.category || place.cat3_name || '';
                    return preferredTypes.some(type => category.includes(type));
                });
            }
            
            // 데이터가 없는 경우 메시지 표시
            if (filteredPlaces.length === 0) {
                container.innerHTML = '<div class="col-12 text-center py-3"><p>선택한 조건에 맞는 장소가 없습니다.</p></div>';
                return;
            }
            
            // 최대 12개 장소만 표시
            const placesToShow = filteredPlaces.slice(0, 12);
            
            // 지도 중심 및 확대 레벨 조정
            updateMapForRegion(region);
            
            // HTML 생성
            let html = '';
            placesToShow.forEach((place, index) => {
                const name = place.name || place.place_name || '이름 없음';
                const address = place.address || place.addr || '';
                const category = place.category || place.cat3_name || '기타';
                
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title">${name}</h6>
                            <p class="card-text small text-muted">${address}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-primary">${category}</span>
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
            selected.name === place.name && selected.address === place.address
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
            const name = place.name || place.place_name || '이름 없음';
            
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
        if (place.mapx && place.mapy) {
            const latlng = new kakao.maps.LatLng(place.mapy, place.mapx);
            
            // 마커 생성
            const marker = new kakao.maps.Marker({
                position: latlng,
                map: map
            });
            
            // 마커 정보 저장
            place.marker = marker;
            
            // 마커에 클릭 이벤트 추가
            kakao.maps.event.addListener(marker, 'click', function() {
                showPlaceInfo(place);
            });
        }
    }
    
    // 모든 마커 새로고침
    function refreshMarkers() {
        // 기존 마커 및 경로선 제거
        selectedPlaces.forEach(place => {
            if (place.marker) {
                place.marker.setMap(null);
            }
        });
        
        if (routeLine) {
            routeLine.setMap(null);
            routeLine = null;
        }
        
        // 새 마커 추가
        selectedPlaces.forEach(place => {
            addMarkerToMap(place);
        });
    }
    
    // 경로 최적화
    function optimizeRoute() {
        // 경로선 생성을 위한 좌표 배열
        const linePath = selectedPlaces.map(place => {
            return new kakao.maps.LatLng(place.mapy, place.mapx);
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
                
                html += `
                <tr>
                    ${i === 0 ? `<td rowspan="${dayPlaces.length}">${day}일차</td>` : ''}
                    <td>${time}</td>
                    <td>${place.name || place.place_name || '이름 없음'}</td>
                    <td>${place.category || place.cat3_name || '기타'}</td>
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
    
    // 장소 정보 표시
    function showPlaceInfo(place) {
        // 인포윈도우 또는 모달로 장소 정보 표시 (실제 구현 필요)
        console.log('장소 정보:', place);
        alert(`${place.name || place.place_name || '이름 없음'}\n${place.address || place.addr || ''}`);
    }
    
    // 지도 업데이트 (지역별)
    function updateMapForRegion(region) {
        // 지역별 중심 좌표 및 확대 레벨 설정
        const regionCoords = {
            '서울': { lat: 37.5665, lng: 126.9780, level: 8 },
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
                const name = place.name || place.place_name || '이름 없음';
                const category = place.category || place.cat3_name || '기타';
                
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
    
    // JSONL 파일 로드 및 파싱 함수 (main.js와 동일)
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
});