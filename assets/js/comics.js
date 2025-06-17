// 4컷툰 데이터 (나중에 실제 이미지 경로로 교체하세요)
const comicsData = [
    {
        id: 1,
        title: "시고르의 첫 여행 준비",
        image: "../assets/images/comics/comic1.png",
        date: "2025-01-15",
        description: "시고르가 처음으로 여행을 준비하는 이야기"
    },
    {
        id: 2,
        title: "공항에서 생긴 일",
        image: "../assets/images/comics/comic2.png",
        date: "2025-01-20",
        description: "공항에서 시고르에게 일어난 재미있는 에피소드"
    },
    {
        id: 3,
        title: "호텔 체크인 대작전",
        image: "../assets/images/comics/comic3.jpg",
        date: "2025-01-25",
        description: "호텔에서 시고르가 벌인 좌충우돌 체크인기"
    },
    {
        id: 4,
        title: "맛집 탐방 모험",
        image: "../assets/images/comics/comic4.jpg",
        date: "2025-01-30",
        description: "시고르와 함께하는 현지 맛집 탐방기"
    },
    {
        id: 5,
        title: "관광지에서의 하루",
        image: "../assets/images/comics/comic5.jpg",
        date: "2025-02-05",
        description: "관광지에서 시고르가 겪은 특별한 하루"
    },
    {
        id: 6,
        title: "쇼핑몰 대모험",
        image: "../assets/images/comics/comic6.jpg",
        date: "2025-02-10",
        description: "쇼핑몰에서 시고르의 신나는 쇼핑 체험"
    },
    {
        id: 7,
        title: "해변에서의 추억",
        image: "../assets/images/comics/comic7.jpg",
        date: "2025-02-15",
        description: "해변에서 시고르가 만든 소중한 추억들"
    },
    {
        id: 8,
        title: "귀가길의 감동",
        image: "../assets/images/comics/comic8.jpg",
        date: "2025-02-20",
        description: "집으로 돌아가는 길에서 느낀 시고르의 마음"
    }
];

// 페이지네이션 설정
const COMICS_PER_PAGE = 3; // 한 페이지에 보여줄 4컷툰 수
let currentPage = 1;
let totalPages = 1;

// DOM 요소들
let comicsContainer;
let loadingElement;
let paginationElement;
let prevBtn;
let nextBtn;
let currentPageSpan;
let totalPagesSpan;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    calculateTotalPages();
    setTimeout(() => {
        loadComics();
        setupEventListeners();
    }, 1000); // 1초 로딩 시뮬레이션
});

// DOM 요소 초기화
function initializeElements() {
    comicsContainer = document.getElementById('comics-container');
    loadingElement = document.getElementById('loading');
    paginationElement = document.getElementById('pagination');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    currentPageSpan = document.getElementById('currentPage');
    totalPagesSpan = document.getElementById('totalPages');
}

// 전체 페이지 수 계산
function calculateTotalPages() {
    totalPages = Math.ceil(comicsData.length / COMICS_PER_PAGE);
    if (totalPagesSpan) {
        totalPagesSpan.textContent = totalPages;
    }
}

// 4컷툰 로드 및 표시
function loadComics() {
    // 로딩 화면 숨기기
    loadingElement.style.display = 'none';
    
    // 현재 페이지의 4컷툰 계산
    const startIndex = (currentPage - 1) * COMICS_PER_PAGE;
    const endIndex = startIndex + COMICS_PER_PAGE;
    const currentComics = comicsData.slice(startIndex, endIndex);
    
    // 4컷툰 컨테이너 비우기
    comicsContainer.innerHTML = '';
    
    // 4컷툰 생성 및 추가
    currentComics.forEach(comic => {
        const comicElement = createComicElement(comic);
        comicsContainer.appendChild(comicElement);
    });
    
    // 컨테이너와 페이지네이션 보이기
    comicsContainer.style.display = 'block';
    paginationElement.style.display = 'flex';
    
    // 페이지 정보 업데이트
    updatePagination();
}

// 4컷툰 엘리먼트 생성
function createComicElement(comic) {
    const comicDiv = document.createElement('div');
    comicDiv.className = 'comic-panel';
    
    comicDiv.innerHTML = `
        <h3 class="comic-title">${comic.title}</h3>
        <p class="comic-date">
            <i class="fas fa-calendar-alt me-2"></i>${formatDate(comic.date)}
        </p>
        <img src="${comic.image}" 
             alt="${comic.title}" 
             class="comic-image" 
             data-comic-id="${comic.id}"
             onerror="this.src='../assets/images/default-performance.png'">
        <p class="text-center mt-3 text-muted">${comic.description}</p>
        <div class="text-center">
            <small class="text-muted">클릭하면 크게 볼 수 있어요!</small>
        </div>
    `;
    
    return comicDiv;
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// 페이지네이션 업데이트
function updatePagination() {
    // 현재 페이지 표시
    currentPageSpan.textContent = currentPage;
    
    // 이전 버튼 상태
    prevBtn.disabled = currentPage === 1;
    
    // 다음 버튼 상태
    nextBtn.disabled = currentPage === totalPages;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 이전 페이지 버튼
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadComics();
            scrollToTop();
        }
    });
    
    // 다음 페이지 버튼
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadComics();
            scrollToTop();
        }
    });
    
    // 4컷툰 이미지 클릭 (확대보기)
    comicsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('comic-image')) {
            const comicId = e.target.dataset.comicId;
            const comic = comicsData.find(c => c.id == comicId);
            if (comic) {
                showComicModal(comic);
            }
        }
    });
    
    // 키보드 네비게이션
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            currentPage--;
            loadComics();
            scrollToTop();
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
            currentPage++;
            loadComics();
            scrollToTop();
        }
    });
}

// 4컷툰 확대보기 모달 표시
function showComicModal(comic) {
    const modal = new bootstrap.Modal(document.getElementById('comicModal'));
    const enlargedComic = document.getElementById('enlargedComic');
    const modalTitle = document.getElementById('comicModalLabel');
    
    enlargedComic.src = comic.image;
    enlargedComic.alt = comic.title;
    modalTitle.textContent = comic.title;
    
    // 이미지 로드 에러 처리
    enlargedComic.onerror = function() {
        this.src = '../assets/images/default-performance.png';
    };
    
    modal.show();
}

// 페이지 상단으로 스크롤
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 이미지 미리로드 (성능 향상)
function preloadImages() {
    comicsData.forEach(comic => {
        const img = new Image();
        img.src = comic.image;
    });
}

// 페이지 로드 완료 후 이미지 미리로드
window.addEventListener('load', preloadImages);