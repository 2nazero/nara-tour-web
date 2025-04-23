// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let map;
    let markers = [];
    let touristData = [];
    let currentRegion = 'all';
    let currentCategories = ['관광', '맛집', '숙박', '쇼핑', '문화시설'];
    let visibleItems = 12; // 처음에 보여줄 아이템 수
    
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
        });
    });
    
    // 필터 적용 버튼 클릭 이벤트
    document.getElementById('apply-filter').addEventListener('click', function() {
        // 선택된 카테고리 가져오기
        currentCategories = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        filterMarkers();
        displayPlaces();
    });
    
    // 더보기 버튼 클릭 이벤트
    document.getElementById('load-more').addEventListener('click', function() {
        visibleItems += 12; // 12개씩 추가로 표시
        displayPlaces();
    });
    
    // 카카오 지도 초기화
    function initializeMap() {
        const container = document.getElementById('map');
        const options = {
            center: new kakao.maps.LatLng(36.2, 127.9), // 대한민국 중심 좌표
            level: 13 // 확대 레벨
        };
        
        map = new kakao.maps.Map(container, options);
    }
    
    // 여행지 데이터 로드
    async function loadTouristData() {
        try {
            // JSONL 파일 로드
            touristData = await loadJSONLFile('../data/ml_filtered_master_tourist_only.jsonl');
            
            if (!touristData || touristData.length === 0) {
                console.error('데이터를 불러올 수 없습니다.');
                return;
            }
            
            // 마커 생성 및 지도에 표시
            createMarkers();
            
            // 장소 목록 표시
            displayPlaces();
            
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
    }
    
    // 마커 생성 및 지도에 표시
    function createMarkers() {
        // 기존 마커 제거
        markers.forEach(marker => marker.setMap(null));
        markers = [];
        
        // 새 마커 생성
        touristData.forEach((place, index) => {
            // 좌표 정보가 있는 경우에만 마커 생성
            if (place.mapx && place.mapy) {
                const latlng = new kakao.maps.LatLng(place.mapy, place.mapx);
                
                // 마커 생성
                const marker = new kakao.maps.Marker({
                    position: latlng,
                    map: map
                });
                
                // 마커에 클릭 이벤트 추가
                kakao.maps.event.addListener(marker, 'click', function() {
                    showPlaceInfo(place);
                });
                
                // 마커 정보 저장
                markers.push({
                    marker: marker,
                    region: getRegionFromAddress(place.address || place.addr || ''),
                    category: getCategoryFromPlace(place)
                });
            } else {
                // 좌표가 없는 경우 주소로 좌표 검색 기능 구현 가능
                // (실제 구현 시 지오코딩 API 사용)
            }
        });
        
        // 초기 필터 적용
        filterMarkers();
    }
    
    // 마커 필터링
    function filterMarkers() {
        markers.forEach(item => {
            const marker = item.marker;
            const region = item.region;
            const category = item.category;
            
            // 지역과 카테고리 필터 적용
            const regionMatch = currentRegion === 'all' || region === currentRegion;
            const categoryMatch = currentCategories.some(cat => category.includes(cat));
            
            // 조건에 맞으면 지도에 표시, 아니면 숨김
            if (regionMatch && categoryMatch) {
                marker.setMap(map);
            } else {
                marker.setMap(null);
            }
        });
    }
    
    // 장소 정보 표시
    function showPlaceInfo(place) {
        // 인포윈도우 또는 모달로 장소 정보 표시 (실제 구현 필요)
        console.log('장소 정보:', place);
        alert(`${place.name || place.place_name || '이름 없음'}\n${place.address || place.addr || ''}`);
    }
    
    // 장소 목록 표시
    function displayPlaces() {
        const container = document.getElementById('region-places-container');
        
        // 필터링된 장소 목록
        const filteredPlaces = touristData.filter(place => {
            const region = getRegionFromAddress(place.address || place.addr || '');
            const category = getCategoryFromPlace(place);
            
            // 지역과 카테고리 필터 적용
            const regionMatch = currentRegion === 'all' || region === currentRegion;
            const categoryMatch = currentCategories.some(cat => category.includes(cat));
            
            return regionMatch && categoryMatch;
        });
        
        // 데이터가 없는 경우 메시지 표시
        if (filteredPlaces.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5"><p>검색 조건에 맞는 장소가 없습니다.</p></div>';
            document.getElementById('load-more').style.display = 'none';
            return;
        }
        
        // 표시할 아이템 선택 (페이지네이션)
        const placesToShow = filteredPlaces.slice(0, visibleItems);
        
        // HTML 생성
        let html = '';
        placesToShow.forEach(place => {
            const name = place.name || place.place_name || '이름 없음';
            const address = place.address || place.addr || '';
            const category = place.category || place.cat3_name || '기타';
            const imageUrl = place.image_url || '../assets/images/icon_blank.jpg';
            
            html += `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <img src="${imageUrl}" class="card-img-top" alt="${name}" 
                         onerror="this.src='../assets/images/icon_blank.jpg'" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h5 class="card-title">${name}</h5>
                        <p class="card-text text-muted small">${address}</p>
                        <span class="badge bg-primary">${category}</span>
                    </div>
                    <div class="card-footer">
                        <a href="#" class="btn btn-sm btn-outline-primary view-details" data-place-id="${place.id || ''}">상세 정보</a>
                    </div>
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
        
        // 더보기 버튼 표시/숨김
        if (filteredPlaces.length <= visibleItems) {
            document.getElementById('load-more').style.display = 'none';
        } else {
            document.getElementById('load-more').style.display = 'inline-block';
        }
        
        // 상세 정보 버튼 이벤트 추가
        const detailButtons = document.querySelectorAll('.view-details');
        detailButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const placeId = this.getAttribute('data-place-id');
                const place = touristData.find(p => p.id === placeId);
                if (place) {
                    showPlaceInfo(place);
                }
            });
        });
    }
    
    // 지역 정보 업데이트
    function updateRegionInfo() {
        const regionTitle = document.getElementById('region-title');
        const regionDescription = document.getElementById('region-description');
        
        // 지역별 타이틀 및 설명 업데이트
        if (currentRegion === 'all') {
            regionTitle.textContent = '전체 지역 정보';
            regionDescription.textContent = '대한민국의 주요 여행지 정보를 확인하세요.';
        } else {
            regionTitle.textContent = `${currentRegion} 여행 정보`;
            regionDescription.textContent = `${currentRegion}의 다양한 여행지를 확인하세요.`;
        }
        
        // 지도 중심 및 확대 레벨 조정
        if (currentRegion !== 'all') {
            // 지역별 중심 좌표 (실제 구현 시 정확한 좌표 사용)
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
            
            if (regionCoords[currentRegion]) {
                const coords = regionCoords[currentRegion];
                map.setCenter(new kakao.maps.LatLng(coords.lat, coords.lng));
                map.setLevel(coords.level);
            }
        } else {
            // 전체 지역 선택 시 한국 전체가 보이도록 설정
            map.setCenter(new kakao.maps.LatLng(36.2, 127.9));
            map.setLevel(13);
        }
    }
    
    // 주소에서 지역 추출
    function getRegionFromAddress(address) {
        // 실제 구현 시 정규식이나 보다 정교한 로직으로 지역 추출
        const regions = ['서울', '경기도', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주도'];
        
        for (const region of regions) {
            if (address.includes(region)) {
                return region;
            }
        }
        
        return '기타';
    }
    
    // 장소 정보에서 카테고리 추출
    function getCategoryFromPlace(place) {
        const category = place.category || place.cat3_name || '';
        
        // 카테고리 매핑 (실제 데이터에 맞게 조정 필요)
        if (category.includes('관광') || category.includes('명소') || category.includes('여행') || category.includes('공원')) {
            return '관광';
        } else if (category.includes('맛집') || category.includes('음식점') || category.includes('레스토랑') || category.includes('카페')) {
            return '맛집';
        } else if (category.includes('숙박') || category.includes('호텔') || category.includes('리조트') || category.includes('펜션')) {
            return '숙박';
        } else if (category.includes('쇼핑') || category.includes('마트') || category.includes('시장') || category.includes('상점')) {
            return '쇼핑';
        } else if (category.includes('문화') || category.includes('박물관') || category.includes('미술관') || category.includes('공연')) {
            return '문화시설';
        }
        
        return '기타';
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