#!/bin/bash

echo "🔄 AWS API를 Netlify 함수로 변경 중..."

# 백업 파일 생성
echo "📁 백업 파일 생성 중..."
cp assets/js/performances.js assets/js/performances.js.backup
cp assets/js/regions.js assets/js/regions.js.backup  
cp assets/js/routes.js assets/js/routes.js.backup

# performances.js 수정
echo "🔧 performances.js 수정 중..."
sed -i.tmp 's|https://ra0hq7f1a9.execute-api.us-east-1.amazonaws.com/dev/items/performances|/.netlify/functions/getPerformances|g' assets/js/performances.js
sed -i.tmp 's|https://ra0hq7f1a9.execute-api.us-east-1.amazonaws.com/dev/items/recommendations|/.netlify/functions/recommendPerformances|g' assets/js/performances.js

# regions.js 수정  
echo "🔧 regions.js 수정 중..."
sed -i.tmp 's|https://ra0hq7f1a9.execute-api.us-east-1.amazonaws.com/dev/items/mapdata|/.netlify/functions/getMapData|g' assets/js/regions.js

# routes.js 수정
echo "🔧 routes.js 수정 중..."
sed -i.tmp 's|https://ra0hq7f1a9.execute-api.us-east-1.amazonaws.com/dev/items/mapdata|/.netlify/functions/getMapData|g' assets/js/routes.js

# 임시 파일 정리
rm -f assets/js/*.tmp

echo "✅ 변경 완료!"
