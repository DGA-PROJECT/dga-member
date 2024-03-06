const dotenv = require("dotenv");
const { Pool } = require("pg");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const tokenFunction = require("./parsingToken.js");

const app = express();
dotenv.config();
const port = 3000;

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// db secret
const mongDbSecret = {
  user: process.env.MONGO_USER,
  host: process.env.MONGO_HOST,
  database: process.env.MONGO_DATABASE,
  password: process.env.MONGO_PASSWORD,
  port: process.env.MONGO_PORT,
};

const uri = `mongodb://${mongDbSecret.user}:${mongDbSecret.password}@${mongDbSecret.host}:${mongDbSecret.port}`;
const dbName = mongDbSecret.database;

const pool = new Pool({
  user: process.env.POSTGRE_USER,
  host: process.env.POSTGRE_HOST,
  database: process.env.POSTGRE_DATABASE,
  password: process.env.POSTGRE_PASSWORD,
  port: process.env.POSTGRE_PORT, // PostgreSQL 포트 번호
  max: 20, // Connection Pool의 최대 연결 수
  idleTimeoutMillis: 30000, // 연결이 유휴 상태로 유지되는 시간 (밀리초)
});

// 환경변수 url 파싱

const checkEnvURL = () => {
  if (process.env.NODE_ENV == "development") {
    return "";
  } else {
    return "/users";
  }
};

// 이메일 체크 함수

const checkEmailExists = async (email) => {
  try {
    const client = await pool.connect();

    // PostgreSQL 쿼리문: 주어진 이메일로 유저가 존재하는지 확인

    const result = await client.query(
      `SELECT * FROM users WHERE email = '${email}'`
    );

    // const emailExists = result.rows[0].email_exists;

    // 연결 해제
    client.release();

    if (result.rows.length === 0) {
      return false;
    } else {
      return result.rows[0];
    }
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw error;
  }
};

const checkNicknameExists = async (nickname) => {
  try {
    const client = await pool.connect();

    // PostgreSQL 쿼리문: 주어진 닉네임으로 유저가 존재하는지 확인
    const result = await client.query(
      "SELECT EXISTS (SELECT 1 FROM users WHERE nickname = $1) AS nickname_exists",
      [nickname]
    );

    const nicknameExists = result.rows[0].nickname_exists;
    // 연결 해제
    client.release();

    return nicknameExists;
  } catch (error) {
    console.error("Error checking nickname existence:", error);
    throw error;
  }
};

const checkUserExists = async (userId, nickname, email) => {
  try {
    const client = await pool.connect();

    // PostgreSQL 쿼리문: 주어진 닉네임으로 유저가 존재하는지 확인
    const result = await client.query(
      "SELECT EXISTS (SELECT 1 FROM users WHERE user_id = $1 OR nickname = $2 OR email = $3) AS user_exists",
      [userId, nickname, email]
    );

    const nicknameExists = result.rows[0].user_exists;
    // 연결 해제
    client.release();

    return nicknameExists;
  } catch (error) {
    console.error("Error checking user existence:", error);
    throw error;
  }
};

app.post(checkEnvURL() + "/", async (req, res) => {
  const idToken = req.body.idToken;
  const accessToken = req.body.accessToken;
  const reqNickname = req.body.nickname;
  const reqEmail = req.body.email;
  const reqUserId = req.body.userId;

  if (idToken && accessToken && reqNickname && reqEmail && reqUserId) {
    const idTokenObj = tokenFunction.getPureTokenValues(idToken);
    const accessTokenObj = tokenFunction.getPureTokenValues(accessToken);
    const idTokenPayload = JSON.parse(idTokenObj.payload);

    const tokenEmail = idTokenPayload.email;
    if (tokenEmail !== reqEmail) {
      res.json(
        JSON.stringify({ confirm: false, message: "토큰이랑 이메일 안맞아" })
      );
    } else {
      const isUserExists = await checkUserExists(
        reqUserId,
        reqNickname,
        reqEmail
      );
      if (isUserExists) {
        res.json(
          JSON.stringify({
            confirm: true,
            userInfo: {
              nickname: reqNickname,
              userId: reqUserId,
              email: reqEmail,
            },
          })
        );
      } else {
        res.json(JSON.stringify({ confirm: false }));
      }
    }
  } else {
    res.json(JSON.stringify({ confirm: false, message: "필수값 안왔어" }));
  }

  //tokenEmail과 reqEmail이 다르면 confirm false
  //디비 접근해서, tokenEmail기준으로 유저 검색,
  //해당 유저정보랑 req정보랑 다르면, confirm false
  //같으면 confirm true
});

//axios테스트
app.get(checkEnvURL() + "/testget", (req, res, next) => {
  try {
    res.json(JSON.stringify("users get 성공이야"));
  } catch (error) {
    console.error("에러 발생:", error);

    // 클라이언트에게 에러 응답 보내기
    res.status(500).json({ error: "서버 내부 오류 발생" });
  }
});

app.post(checkEnvURL() + "/postest", (req, res) => {
  try {
    // 예외 발생 시점 예시
    // throw new Error("에러 발생!");

    req.body.message = "성공했어!";
    res.json(JSON.stringify("멤버 연결됐엉"));
  } catch (error) {
    console.error("에러 발생:", error);

    // 클라이언트에게 에러 응답 보내기
    res.status(500).json({ error: "서버 내부 오류 발생" });
  }
});

app.post(checkEnvURL() + "/login", async (req, res) => {
  try {
    const idToken = req.body.idToken;
    const accessToken = req.body.accessToken;

    const idTokenObj = tokenFunction.getPureTokenValues(idToken);
    const accessTokenObj = tokenFunction.getPureTokenValues(accessToken);
    const idTokenPayload = JSON.parse(idTokenObj.payload);

    const userEmail = idTokenPayload.email;
    //얘를 이제 db랑 상호작용
    // 1. 유저가 이미 있으면 이미 가입된 유저라는 응답
    // 2. 없으면 없는 유저라는 응답과함꼐 이메일 주소 줌.

    const result = await checkEmailExists(userEmail);

    if (result) {
      // 이미 유저가 존재하는 경우
      res.json(
        JSON.stringify({
          newbie: false,
          result: result,
        })
      );
    } else {
      //뉴비인경우
      let answer = {
        newbie: true,
        email: userEmail,
      };
      res.json(JSON.stringify(answer));
    }

    //여기까진 test db array로 테스트한거임
  } catch (err) {
    res.status(500).json(JSON.stringify({ error: err.message }));
  }
});

app.post(checkEnvURL() + "/nickname", async (req, res) => {
  try {
    const idToken = req.body.idToken;
    const accessToken = req.body.accessToken;
    const nickname = req.body.nickname;

    const idTokenObj = tokenFunction.getPureTokenValues(idToken);
    const accessTokenObj = tokenFunction.getPureTokenValues(accessToken);
    const idTokenPayload = JSON.parse(idTokenObj.payload);

    const userEmail = idTokenPayload.email;

    if (await checkNicknameExists(nickname)) {
      // 이미 사용중인 닉네임인 경우
      let answer = {
        isExist: true,
        nickname: nickname,
      };
      res.json(JSON.stringify(answer));
    } else {
      // 가능한경우
      let answer = {
        isExist: false,
        nickname: nickname,
      };
      res.json(JSON.stringify(answer));
    }

    //여기까진 test db array로 테스트한거임
  } catch (err) {
    res.status(500).json(JSON.stringify({ error: err.message }));
  }
});

app.post(checkEnvURL() + "/newbie", async (req, res) => {
  try {
    const idToken = req.body.idToken;
    const accessToken = req.body.accessToken;

    const idTokenObj = tokenFunction.getPureTokenValues(idToken);
    const accessTokenObj = tokenFunction.getPureTokenValues(accessToken);

    const idTokenPayload = JSON.parse(idTokenObj.payload);

    const userEmail = idTokenPayload.email;

    const nickname = req.body.signupUserInfo.nickname;
    const birthdate = req.body.signupUserInfo.birthdate;
    //얘를 이제 db랑 상호작용
    // 1. 유저가 이미 있으면 이미 가입된 유저라는 응답
    // 2. 없으면 없는 유저라는 응답과함꼐 이메일 주소 줌.

    if (await checkEmailExists(userEmail)) {
      // 이미 유저가 존재하는 경우
      res.status(400).json(JSON.stringify({ error: "user is already exist" }));
    } else if (await checkNicknameExists(nickname)) {
      res
        .status(400)
        .json(JSON.stringify({ error: "nickname is already exist" }));
    } else {
      //------------------ 인서트
      const client = await pool.connect();
      const userValues = {
        nickname: nickname,
        email: userEmail,
        birth_date: birthdate,
        grade: "economy",
        profile_image_link: null,
      };

      const queryString = `
        INSERT INTO users (nickname, email, birth_date, grade, profile_image_link)
        VALUES ($1, $2, $3, $4, $5)
      `;

      const values = Object.values(userValues);

      const result = await pool.query(queryString, values);
      if (result.rowCount > 0) {
        console.log("Sample user inserted successfully!");
        res
          .status(200)
          .json(JSON.stringify({ message: `welcome ${nickname}` }));
      }
      client.release();
    }
  } catch (err) {
    res.status(500).json(JSON.stringify({ error: err.message }));
  }
});

app.get(checkEnvURL() + "/dbtest", async (req, res, next) => {
  try {
    if (await checkNicknameExists("바보온달")) {
      // 이미 사용중인 닉네임인 경우
      let answer = "db 연결됐어1.";
      res.json(JSON.stringify(answer));
    } else {
      // 가능한경우
      let answer = "db 연결됐어2";
      res.json(JSON.stringify(answer));
    }

    //여기까진 test db array로 테스트한거임
  } catch (err) {
    res.status(500).json(JSON.stringify({ error: err.message }));
  }
});

app.get(checkEnvURL() + "/envtest", async (req, res, next) => {
  try {
    if (process.env.POSTGRE_DATABASE == "mydatabase") {
      res.json(JSON.stringify("env읽을 수 있어 앙"));
    } else {
      res.json(JSON.stringify("env못읽어"));
    }
    process.env.POSTGRE_DATABASE;
  } catch (err) {
    res.status(500).json(JSON.stringify({ error: err.message }));
  }
});

app.listen(port, () => console.log("Server is running on : " + port));
