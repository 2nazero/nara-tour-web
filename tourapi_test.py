import urllib.request
import urllib.parse
import json
from datetime import datetime
import ssl

def get_festival_info(
    service_key,
    start_date=None,
    end_date=None,
    area_code=None,
    sigungu_code=None,
    page_no=1,
    num_of_rows=10
):
    """
    한국관광공사 Tour API를 사용하여 축제 정보를 가져옵니다.
    
    Parameters:
    - service_key: API 인증키 (인코딩된 버전)
    - start_date: 축제 시작일 (YYYYMMDD 형식, 기본값: 오늘)
    - end_date: 축제 종료일 (YYYYMMDD 형식, 기본값: None)
    - area_code: 지역 코드
    - sigungu_code: 시군구 코드
    - page_no: 페이지 번호
    - num_of_rows: 한 페이지당 결과 수
    
    Returns:
    - 축제 정보 딕셔너리
    """
    # 기본 시작일을 오늘로 설정
    if start_date is None:
        start_date = datetime.now().strftime("%Y%m%d")
    
    # 성공한 API 엔드포인트 사용
    url = "http://apis.data.go.kr/B551011/KorService2/searchFestival2"
    
    # 파라미터 설정
    params = {
        "serviceKey": service_key,
        "MobileOS": "ETC",
        "MobileApp": "FestivalChecker",
        "eventStartDate": start_date,
        "pageNo": str(page_no),
        "numOfRows": str(num_of_rows),
        "arrange": "A",  # 정렬 방식: 제목순
        "_type": "json"   # JSON 응답 요청
    }
    
    # 선택적 파라미터 추가
    if end_date:
        params["eventEndDate"] = end_date
    if area_code:
        params["areaCode"] = str(area_code)
    if sigungu_code and area_code:
        params["sigunguCode"] = str(sigungu_code)
    
    try:
        # 쿼리 문자열 생성 및 URL 인코딩
        query_string = urllib.parse.urlencode(params, safe='%')
        request_url = f"{url}?{query_string}"
        
        print(f"요청 URL: {request_url}")
        
        # SSL 인증 비활성화 (필요한 경우)
        context = ssl._create_unverified_context()
        
        # HTTP 요청 보내기
        response = urllib.request.urlopen(request_url, context=context)
        
        # 응답 데이터 읽기
        response_data = response.read().decode('utf-8')
        
        # JSON 파싱
        result = json.loads(response_data)
        return result
        
    except urllib.error.URLError as e:
        print(f"URL 오류: {e.reason}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}")
        return None
    except Exception as e:
        print(f"예상치 못한 오류: {e}")
        return None

def display_festivals(result):
    """
    API 응답에서 축제 정보를 표시합니다.
    
    Parameters:
    - result: API 응답 데이터
    """
    if not result:
        print("표시할 축제 정보가 없습니다.")
        return
    
    try:
        # 응답 구조 확인
        response = result.get("response", {})
        header = response.get("header", {})
        body = response.get("body", {})
        
        # 응답 헤더 정보
        result_code = header.get("resultCode")
        result_msg = header.get("resultMsg")
        print(f"API 응답 코드: {result_code}, 메시지: {result_msg}")
        
        # 응답 본문 정보
        total_count = body.get("totalCount", 0)
        num_of_rows = body.get("numOfRows", 10)
        page_no = body.get("pageNo", 1)
        print(f"총 {total_count}개의 축제 중 {page_no}페이지 ({num_of_rows}개씩)")
        
        # 항목 목록
        items = body.get("items", {})
        item_list = items.get("item", [])
        
        if not item_list:
            print("검색된 축제가 없습니다.")
            return
        
        # 단일 항목을 리스트로 변환
        if not isinstance(item_list, list):
            item_list = [item_list]
        
        # 축제 목록 표시
        for i, festival in enumerate(item_list, 1):
            print(f"\n[축제 {i}]")
            print(f"제목: {festival.get('title', '정보 없음')}")
            
            # 날짜 정보 포맷팅
            start_date = festival.get('eventstartdate', '')
            end_date = festival.get('eventenddate', '')
            if start_date:
                start_date = f"{start_date[:4]}년 {start_date[4:6]}월 {start_date[6:8]}일"
            if end_date:
                end_date = f"{end_date[:4]}년 {end_date[4:6]}월 {end_date[6:8]}일"
            
            print(f"기간: {start_date} ~ {end_date}")
            print(f"주소: {festival.get('addr1', '정보 없음')} {festival.get('addr2', '')}")
            print(f"전화번호: {festival.get('tel', '정보 없음')}")
            if festival.get('firstimage'):
                print(f"이미지: {festival.get('firstimage')}")
        
        # 페이지 정보
        if total_count > num_of_rows:
            total_pages = (total_count + num_of_rows - 1) // num_of_rows
            print(f"\n현재 {page_no}/{total_pages} 페이지를 보고 있습니다.")
            
    except Exception as e:
        print(f"결과 처리 중 오류 발생: {e}")

def save_to_json(data, filename="festival_data.json"):
    """
    데이터를 JSON 파일로 저장합니다.
    
    Parameters:
    - data: 저장할 데이터
    - filename: 파일명
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"데이터가 {filename}에 저장되었습니다.")
    except Exception as e:
        print(f"파일 저장 중 오류 발생: {e}")

def get_area_code_info():
    """
    지역 코드 정보를 출력합니다.
    """
    area_codes = {
        "1": "서울",
        "2": "인천",
        "3": "대전",
        "4": "대구",
        "5": "광주",
        "6": "부산",
        "7": "울산",
        "8": "세종특별자치시",
        "31": "경기도",
        "32": "강원특별자치도",
        "33": "충청북도",
        "34": "충청남도",
        "35": "경상북도",
        "36": "경상남도",
        "37": "전라북도",
        "38": "전라남도",
        "39": "제주도"
    }
    
    print("\n[지역 코드 정보]")
    for code, name in area_codes.items():
        print(f"{code}: {name}")

# 메인 실행 코드
if __name__ == "__main__":
    # 인코딩된 API 키 사용
    api_key = "Tu0trZCGNDsho41DoZ5s3owOJnzOMKG8YkTf0tI6O5gEgXhWZModqYaIZ2ZsnYOFBkjMT%2FYN%2F3AO8xVidwReOA%3D%3D"
    
    # 명령줄에서 실행 옵션
    import argparse
    
    parser = argparse.ArgumentParser(description='한국관광공사 API를 사용하여 축제 정보를 검색합니다.')
    parser.add_argument('--start_date', help='축제 시작일 (YYYYMMDD 형식)', default=None)
    parser.add_argument('--end_date', help='축제 종료일 (YYYYMMDD 형식)', default=None)
    parser.add_argument('--area_code', help='지역 코드', default=None)
    parser.add_argument('--sigungu_code', help='시군구 코드', default=None)
    parser.add_argument('--page', type=int, help='페이지 번호', default=1)
    parser.add_argument('--rows', type=int, help='한 페이지당 결과 수', default=10)
    parser.add_argument('--save', help='결과를 JSON 파일로 저장', action='store_true')
    parser.add_argument('--codes', help='지역 코드 정보 출력', action='store_true')
    
    args = parser.parse_args()
    
    # 지역 코드 정보 요청 시
    if args.codes:
        get_area_code_info()
        exit()
    
    print("한국관광공사 Tour API를 사용한 축제 정보 검색")
    print("=" * 50)
    
    # 축제 정보 가져오기
    print("축제 정보를 불러오는 중...")
    result = get_festival_info(
        service_key=api_key,
        start_date=args.start_date,
        end_date=args.end_date,
        area_code=args.area_code,
        sigungu_code=args.sigungu_code,
        page_no=args.page,
        num_of_rows=args.rows
    )
    
    # 결과 표시
    if result:
        display_festivals(result)
        
        # JSON으로 저장 (--save 옵션 사용 시)
        if args.save:
            save_to_json(result)
    else:
        print("축제 정보를 가져오는데 실패했습니다.")
        print("API 키와 파라미터를 확인하고 다시 시도하세요.")