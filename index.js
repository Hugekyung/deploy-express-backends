const express = require("express");
const app = express();
const passport = require("passport");
const Strategy = require("passport-local");
const session = require("express-session");
const mongoose = require("mongoose");

const User = require("./models/user")
const Post = require("./models/posts")
const Comment = require("./models/comments")


mongoose
  .connect("mongodb+srv://<userId>:<password>@cluster0.nfefn.mongodb.net/<collections>")
  .then(async () => {
    console.log("connected DB!")
    
    //임시로 데이터 넣고 시작하기
    try {
      const test1 = new User({
        username: "elice3",
        password: "12345"
      })
      await test1.save()
  
      const test2 = new User({
        username: "elice4",
        password: "1234566"
      })
      await test2.save()
    } catch(e) {
      console.log("already made!")
    }
  }).catch((e) => {
    console.log(`error occurred! ${e}`)
  })


// POST 요청 시 Body 사용을 위한 기본코드
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// passport 사용을 위한 미들웨어 기본코드
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: true,
    })
)
app.use(passport.initialize());
app.use(passport.session());


passport.use(
    new Strategy(async (username, password, done) => {
      console.log("최초 로그인 상황");
      const findData = await User.findOne({ username })

      if (findData === null) {
          done(null, false)
      }
      else if (findData.password === password) {
          done(null, findData)
      } else {
          done(null, false)
      }
    })
  );

passport.serializeUser((user, done) => {
    console.log("(최소 인증시)인증된 유저: ", user);
    done(null, user); // 브라우저에게 쿠키 전달, 내부적으로 세션 저장
})

// 한번 로그인을 하고 serializeUser 이후에는 로그인이 된 상태
// 어떤 api에 접근하더라도 계속 deserializeUser가 실행
passport.deserializeUser((user, done) => {
    console.log("이미 인증된 유저: ", user);
    done(null, user); // req.user 갱신
})

app.post("/login", passport.authenticate("local", {
    successRedirect: "/", // 성공했을 때, 리다이렉트 경로 설정
    failureRedirect: "/login"
}))

app.get("/login", (req, res) => {
    res.send(`
        <form action="/login" method="POST">
            <input type="text" name="username">
            <input type="password" name="password">
            <input type="submit" value="login">
        </form>
    `)
})

app.get("/", async (req, res) => {
    if (req.user) {

        const allPost = await Post.find()
        res.send(`
          <h1>환영합니다. ${req.user.username}님</h1>
          <button><a href="/logout">LOGOUT</a></button>
          <button><a href="/post">create POST</a></button>
          <hr />

          ${allPost.map(post => `
              <a href="/post/${post.title}">
                <p>제목: ${post.title}</p>
              </a>
              <p>내용: ${post.body}</p>
          `).join("")}
        `)

    } else {
        res.send(`
          <h1>로그인이 필요합니다</h1>
          <button><a href="/login">LOGIN</a></button>
        `);
    }
});

app.get("/logout",  (req, res) => {
  req.logout();
  res.redirect("/")
})

app.post("/post", async (req, res) => {
  if (req.user === undefined) {
    res.send({status: "로그인이 필요한 서비스입니다."})
  }
  const { title, body } = req.body
  const { username } = req.user
  const postData = new Post({
    title: title,
    body: body,
    author: username,
    comment: [],
  })
  try {
    await postData.save()
    res.redirect("/")
  } catch (e) {
    res.send({
      status: "fail",
      error_msg: e,
    })
  }
})

app.post("/post/:title/comment", async (req, res) => {
  if (req.user) {
    const {body} = req.body
  
    const comments = new Comment({
      body: body,
      author: req.user.username,
    })
    await comments.save()

    // Post 스키마의 comment 배열에 값 업데이트
    Post.updateOne({ title: req.params.title }, {
      $push: { comment: comments}
    })
    res.redirect(`/post/${req.params.title}`)
  } else {
    res.redirect("/")
  }
})

app.get("/post/:title", async (req, res) => {
  if (req.user) {
    const post = await Post.findOne({ title: req.params.title }).populate("comment")
    
    console.log(post.comment)

    res.send(`
      <div>
        <a href="/"><p>뒤로가기</p></a>
        <h1>${post.title}</h1>
        <p>작성자: ${post.author}</p>
        <p>${post.body}</p>
      
        <form action="/post/${req.params.title}/comment" method="POST">
          <textarea name="body" placeholder="..."></textarea>
          <input type="submit" value="댓글작성">
        </form>
        <hr/>

        ${post.comment.map(comm => `
          <div>
            <p>댓글 작성자: ${comm.author}<p>
            <p>댓글 작성자: ${comm.body}<p>
          </div>
        `).join("")}
      </div>

    `)
  } else {
    res.redirect("/")
  }
})

app.get("/post", (req, res) => {
  res.send(`
    <form action="/post" method="POST">
      <input type="text" name="title">
      <textarea name="body"></textarea>
      <input type="submit" value="포스트 작성">
    </form>
  `)
})

app.listen(3000, () => console.log("3000번 포트 실행"));