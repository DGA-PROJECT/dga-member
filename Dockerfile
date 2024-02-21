# 도커로부터 node를 베이스 이미지로 가져오기
FROM node:latest
# 컨테이너에 워킹 디렉토리를 만들어 app 소스 코드를 구분하기
WORKDIR /usr/src/app
# npm install의 정상 수행을 위해, 그 전에 컨테이너 내부에 패키지 모듈 명세 파일 복사
COPY package.json ./
# 도커 서버가 수행할 커맨드 추가
RUN npm install
# package.json 외의 다른 파일들도 복사 (index.js가 없으면 CMD 명령어 수행 불가함)
# COPY를 두 부분으로 구분해둔 이유: 효율적인 재빌드 목적
COPY ./ ./

ARG POSTGRE_USER \
    POSTGRE_HOST \
    POSTGRE_DATABASE \
    POSTGRE_PASSWORD \
    POSTGRE_PORT \
    MONGO_USER \
    MONGO_HOST \
    MONGO_DATABASE \
    MONGO_PASSWORD\
    MONGO_PORT

ENV POSTGRE_USER=${POSTGRE_USER_1} \
    POSTGRE_HOST=${POSTGRE_HOST_1} \
    POSTGRE_DATABASE=${POSTGRE_DATABASE_1} \
    POSTGRE_PASSWORD=${POSTGRE_PASSWORD_1} \
    POSTGRE_PORT=${POSTGRE_PORT_1} \
    MONGO_USER=${MONGO_USER_1} \
    MONGO_HOST=${MONGO_HOST_1} \
    MONGO_DATABASE=${MONGO_DATABASE_1} \
    MONGO_PASSWORD=${MONGO_PASSWORD_1} \
    MONGO_PORT=${MONGO_PORT_1} 
#컨테이너가 실행될 때 1번만 수행되는 {시작 명령어} 자리에 들어갈 커맨드
CMD ["node","server.js"]
