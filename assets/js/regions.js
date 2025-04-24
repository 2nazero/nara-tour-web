// 문서가 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    // 전역 변수
    let map;
    let markers = [];
    let touristData = [];
    let currentRegion = 'all';
    let currentCategories = ['1', '2', '3', '4', '6']; // 기본 카테고리(전체)
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
            // 먼저 캐시된 데이터가 있는지 확인
            if (window.cachedTouristData) {
                touristData = window.cachedTouristData;
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
    
    // 마커 생성 및 지도에 표시
    function createMarkers() {
        // 기존 마커 제거
        markers.forEach(marker => marker.setMap(null));
        markers = [];
        
        // 새 마커 생성
        touristData.forEach((place, index) => {
            // 좌표 정보가 있는 경우에만 마커 생성
            if (place.X_COORD && place.Y_COORD) {
                const latlng = new kakao.maps.LatLng(place.Y_COORD, place.X_COORD);
                
                // 마커 생성
                const marker = new kakao.maps.Marker({
                    position: latlng,
                    map: null // 처음에는 지도에 표시하지 않음
                });
                
                // 마커에 클릭 이벤트 추가
                kakao.maps.event.addListener(marker, 'click', function() {
                    showPlaceInfo(place);
                });
                
                // 마커 정보 저장
                markers.push({
                    marker: marker,
                    place: place
                });
            }
        });
        
        // 초기 필터 적용
        filterMarkers();
    }
    
    // 마커 필터링
    function filterMarkers() {
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
    }
    
    // 장소 정보 표시
    function showPlaceInfo(place) {
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
        
        // 인포윈도우 내용 생성
        const content = `
        <div style="padding:15px;width:300px;">
            <h5 style="margin-top:0;margin-bottom:10px;font-weight:bold;">${name}</h5>
            <p style="margin:0;font-size:0.9em;color:#666;">${address}</p>
            <p style="margin:8px 0;">유형: ${categoryName}</p>
            <p style="margin:8px 0;">방문 날짜: ${visitDate}</p>
            <p style="margin:8px 0;">체류 시간: ${stayTime}</p>
            <p style="margin:8px 0;">만족도: ${satisfaction}/5</p>
        </div>`;
        
        alert(content.replace(/<[^>]*>/g, ''));
        // 실제 구현 시 인포윈도우 사용 고려
    }
    
    // 장소 목록 표시
    function displayPlaces() {
        const container = document.getElementById('region-places-container');
        
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
            document.getElementById('load-more').style.display = 'none';
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
                    category = '관광명소';
                    break;
                case 2:
                    categoryIcon = 'fas fa-hotel';
                    category = '숙박';
                    break;
                case 3:
                    categoryIcon = 'fas fa-shopping-bag';
                    category = '쇼핑';
                    break;
                case 4:
                    categoryIcon = 'fas fa-utensils';
                    category = '맛집';
                    break;
                case 5:
                    categoryIcon = 'fas fa-bus';
                    category = '교통';
                    break;
                case 6:
                    categoryIcon = 'fas fa-theater-masks';
                    category = '문화시설';
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
        if (filteredPlaces.length <= visibleItems) {
            document.getElementById('load-more').style.display = 'none';
        } else {
            document.getElementById('load-more').style.display = 'inline-block';
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
    
    // 차트 초기화
    function initializeCharts() {
        // 카테고리별 분포 차트
        const categoryCtx = document.getElementById('category-chart').getContext('2d');
        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['관광명소', '숙박', '쇼핑', '맛집', '교통', '문화시설', '기타'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: '카테고리별 장소 분포'
                    }
                }
            }
        });
        
        // 만족도 분포 차트
        const satisfactionCtx = document.getElementById('satisfaction-chart').getContext('2d');
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
    }
    
    // 차트 데이터 업데이트
    function updateCharts() {
        if (!categoryChart || !satisfactionChart) return;
        
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
        const categoryData = [0, 0, 0, 0, 0, 0, 0]; // [관광명소, 숙박, 쇼핑, 맛집, 교통, 문화시설, 기타]
        
        filteredPlaces.forEach(place => {
            const type = place.VISIT_AREA_TYPE_CD;
            if (type >= 1 && type <= 6) {
                categoryData[type - 1]++;
            } else {
                categoryData[6]++; // 기타
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
    }
    
    // 인기 여행지 테이블 업데이트
    function updateTopPlacesTable() {
        const tableBody = document.getElementById('top-places-table').querySelector('tbody');
        
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
    }
    
    // 날짜 포맷팅 함수 (YYYYMMDD -> YYYY년 MM월 DD일)
    function formatDate(dateStr) {
        if (!dateStr) return '날짜 정보 없음';
        
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        
        return `${year}년 ${month}월 ${day}일`;
    }
});