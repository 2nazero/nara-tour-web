# nginx를 사용한 정적 웹사이트 배포
FROM nginx:alpine

# 기본 nginx 설정 제거
RUN rm -rf /usr/share/nginx/html/*

# 웹사이트 파일들을 nginx html 디렉토리로 복사
COPY index.html /usr/share/nginx/html/
COPY pages/ /usr/share/nginx/html/pages/
COPY assets/ /usr/share/nginx/html/assets/
COPY data/ /usr/share/nginx/html/data/

# nginx 설정 파일 생성 (SPA 지원)
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# 포트 80 노출
EXPOSE 80

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]
