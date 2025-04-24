// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let map;
    let markers = [];
    let touristData = [];
    let selectedPlaces = [];
    let routeLine;
    
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
    
    // 인기 코스 불러오기 버튼 이벤트
    document.querySelectorAll('.load-route-btn').forEach(button => {
        button.addEventListener('click', function() {
            const listItems = this.closest('.card-body').querySelectorAll('.list-group-item');
            const places = Array.from(listItems).map(item => item.textContent);
            loadPopularRoute(places);
        });
    });
    
    // 구글 지도 초기화
    function initializeMap() {
        try {
            const container = document.getElementById('route-map');
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
            const container = document.getElementById('route-map');
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
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
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
                await loadTouristData();
            }
            
            // 선택된 지역의 데이터 필터링
            const regionPlaces = touristData.filter(place => {
                return place.SIDO_NM === region;
            });
            
            // 선호 장소 유형 필터링
            const preferredTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => parseInt(checkbox.value));
            
            // 선호 유형과 관련된 여행지 필터링
            let filteredPlaces = regionPlaces.filter(place => {
                return preferredTypes.includes(place.VISIT_AREA_TYPE_CD);
            });
            
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
                    case 24:
                        categoryIcon = 'fas fa-bed';
                        category = '숙소';
                        break;
                    default:
                        categoryIcon = 'fas fa-map-marker-alt';
                        category = '기타';
                        break;
                }
                
                html += `
                <div class="col-md-4 mb-3">
                    <div class="card h-100">
                        <div class="card-header">
                            <i class="${categoryIcon} me-2"></i>${category}
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
        try {
            // 좌표 정보가 있는 경우에만 마커 생성
            if (place.X_COORD && place.Y_COORD) {
                // 구글 맵용 좌표 객체
                const position = { lat: place.Y_COORD, lng: place.X_COORD };
                
                // 구글 맵 마커 생성
                const marker = new google.maps.Marker({
                    position: position,
                    map: map,
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
            }
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
                    item.marker.setMap(null);
                }
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
        
        // 관광지 유형에 따른 카테고리 설정
        let category = '기타';
        switch(place.VISIT_AREA_TYPE_CD) {
            case 1: category = '자연 관광지'; break;
            case 2: category = '문화/역사/종교시설'; break;
            case 3: category = '문화시설'; break;
            case 4: category = '상업지구'; break;
            case 5: category = '레저/스포츠'; break;
            case 6: category = '테마시설'; break;
            case 7: category = '산책로/둘레길'; break;
            case 8: category = '축제/행사'; break;
            case 9: category = '교통시설'; break;
            case 10: category = '상점'; break;
            case 11: category = '식당/카페'; break;
            case 12: category = '공공시설'; break;
            case 13: category = '엔터테인먼트'; break;
            case 21: category = '집(본인)'; break;
            case 22: category = '집(가족/친척)'; break;
            case 23: category = '회사'; break;
            case 24: category = '숙소'; break;
            default: category = '기타'; break;
        }
        
        // 간단한 알림창으로 정보 표시
        const content = `
        ${name}
        주소: ${address}
        유형: ${category}
        방문 날짜: ${visitDate}
        체류 시간: ${stayTime}
        만족도: ${satisfaction}/5`;
        
        alert(content);
        
        // 구글 맵 인포윈도우 사용하려면 아래 코드 활성화
        /*
        const infowindow = new google.maps.InfoWindow({
            content: `
            <div style="padding:10px;width:300px;">
                <h5 style="margin-top:0;margin-bottom:10px;">${name}</h5>
                <p style="margin:0;font-size:0.9em;color:#666;">${address}</p>
                <p style="margin:8px 0;">유형: ${category}</p>
                <p style="margin:8px 0;">방문 날짜: ${visitDate}</p>
                <p style="margin:8px 0;">체류 시간: ${stayTime}</p>
                <p style="margin:8px 0;">만족도: ${satisfaction}/5</p>
            </div>
            `
        });
        
        // 해당 마커 찾기
        const markerObj = markers.find(m => m.place.VISIT_AREA_ID === place.VISIT_AREA_ID);
        if (markerObj && markerObj.marker) {
            infowindow.open(map, markerObj.marker);
        }
        */
    } catch (error) {
        console.error('장소 정보 표시 중 오류:', error);
    }
}

// 경로 최적화
function optimizeRoute() {
    try {
        if (!map || selectedPlaces.length < 2) return;
        
        // 기존 경로선 제거
        if (routeLine) {
            routeLine.setMap(null);
        }
        
        // 경로선 생성을 위한 좌표 배열
        const path = selectedPlaces.map(place => {
            return { lat: place.Y_COORD, lng: place.X_COORD };
        });
        
        // 구글 맵 경로선 생성
        routeLine = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        
        // 지도에 경로선 표시
        routeLine.setMap(map);
        
        // 경로가 모두 보이도록 지도 범위 조정
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => {
            bounds.extend(point);
        });
        map.fitBounds(bounds);
        
        // 순서 최적화는 단순화를 위해 현재 순서 그대로 사용
        // 실제로는 TSP(Traveling Salesman Problem) 알고리즘 구현 필요
    } catch (error) {
        console.error('경로 최적화 중 오류:', error);
    }
}

// 일정표 생성
function generateItinerary() {
    try {
        const days = parseInt(document.getElementById('days').value);
        const table = document.getElementById('itinerary-table');
        const tbody = table.querySelector('tbody');
        
        if (!tbody || selectedPlaces.length === 0) return;
        
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
                    case 1: category = '자연 관광지'; break;
                    case 2: category = '문화/역사/종교시설'; break;
                    case 3: category = '문화시설'; break;
                    case 4: category = '상업지구'; break;
                    case 5: category = '레저/스포츠'; break;
                    case 6: category = '테마시설'; break;
                    case 7: category = '산책로/둘레길'; break;
                    case 8: category = '축제/행사'; break;
                    case 9: category = '교통시설'; break;
                    case 10: category = '상점'; break;
                    case 11: category = '식당/카페'; break;
                    case 12: category = '공공시설'; break;
                    case 13: category = '엔터테인먼트'; break;
                    case 21: category = '집(본인)'; break;
                    case 22: category = '집(가족/친척)'; break;
                    case 23: category = '회사'; break;
                    case 24: category = '숙소'; break;
                    default: category = '기타'; break;
                }
                
                // 체류 시간 정보
                const stayTime = place.RESIDENCE_TIME_MIN 
                    ? `${place.RESIDENCE_TIME_MIN}분 소요` 
                    : '체류 시간 정보 없음';
                
                html += `
                <tr>
                    ${i === 0 ? `<td rowspan="${dayPlaces.length}">${day}일차</td>` : ''}
                    <td>${time}</td>
                    <td>${place.VISIT_AREA_NM || '이름 없음'}</td>
                    <td>${category} / ${stayTime}</td>
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
            map.setCenter({ lat: coords.lat, lng: coords.lng });
            map.setZoom(coords.zoom);
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
                    case 1: category = '자연 관광지'; break;
                    case 2: category = '문화/역사/종교시설'; break;
                    case 3: category = '문화시설'; break;
                    case 4: category = '상업지구'; break;
                    case 5: category = '레저/스포츠'; break;
                    case 6: category = '테마시설'; break;
                    case 7: category = '산책로/둘레길'; break;
                    case 8: category = '축제/행사'; break;
                    case 9: category = '교통시설'; break;
                    case 10: category = '상점'; break;
                    case 11: category = '식당/카페'; break;
                    case 24: category = '숙소'; break;
                    default: category = '기타'; break;
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
        
        // 공유 기능 구현 (클립보드에 URL 복사 또는 소셜 미디어 공유)
        // 실제 구현 시 일정을 인코딩하여 URL 파라미터로 전달하거나
        // 서버에 저장 후 고유 ID를 생성하여 공유하는 방식 필요
        
        alert('공유 기능은 현재 개발 중입니다. 곧 제공될 예정입니다.');
    } catch (error) {
        console.error('일정표 공유 중 오류:', error);
    }
}

// 인기 여행 경로 불러오기
async function loadPopularRoute(placeNames) {
    try {
        if (!placeNames || placeNames.length === 0) return;
        
        // 기존 선택 초기화
        selectedPlaces = [];
        refreshMarkers();
        
        // 데이터가 로드되지 않았으면 로드
        if (touristData.length === 0) {
            await loadTouristData();
        }
        
        // 이름이 유사한 장소 검색
        placeNames.forEach(name => {
            // 이름 기반 간단한 유사도 검색
            // 실제 구현 시 더 정교한 검색 알고리즘 필요
            const matchingPlace = touristData.find(place => 
                place.VISIT_AREA_NM && place.VISIT_AREA_NM.includes(name)
            );
            
            if (matchingPlace) {
                selectedPlaces.push(matchingPlace);
            } else {
                // 일치하는 장소가 없으면 더미 데이터 생성
                selectedPlaces.push({
                    VISIT_AREA_NM: name,
                    ROAD_NM_ADDR: `${name} 주변`,
                    VISIT_AREA_TYPE_CD: 1, // 기본값: 관광명소
                    DGSTFN: 4, // 기본 만족도
                    // 장소별 가상 좌표 (실제 구현 시 지오코딩 API 사용 필요)
                    X_COORD: 126.9 + Math.random() * 0.1,
                    Y_COORD: 37.5 + Math.random() * 0.1
                });
            }
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
        
        alert(`'${placeNames[0]} 외 ${placeNames.length - 1}곳' 코스를 불러왔습니다.`);
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
});