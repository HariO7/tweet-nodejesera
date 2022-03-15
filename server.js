require("dotenv").config();

const express = require("express");
const app = express();
const server = require("http").Server(app);
const path = require("path");
const bodyParser = require("body-parser");
const io = require("socket.io")(server);

//twitter
const twitter = require("twitter");
const request = require("request");

//MYSQL
const mysql = require("mysql");
const Twitter = require("twitter");
const { listen } = require("socket.io");
const { LONG } = require("mysql/lib/protocol/constants/types");

//connection
const connect = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "tweet_node",
});

//twitter cerdentials
const client = new Twitter({
  consumer_key: process.env.consumer_key,
  consumer_secret:process.env.consumer_secret,
  access_token_key: process.env.access_token_key,
  access_token_secret: process.env.access_token_secret,
});

server.listen(3000);
console.log("server has started at 3000");

app.get("/", function (req, res) {
  res.set({
    "access-Control-Allow-Origin": "*",
  });
  return res.redirect("/public/index.html");
});

app.use("/public", express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

io.on("connection", function (socket) {
  //Default event just for testing
  socket.emit("welcome", { data: "welcome" });
  //Keyword event is handled here
  socket.on("keyword", function (data) {
    console.log(data);
    var keyword = data.keyword;
    var stream = client.stream("statuses/filter", { track: keyword });

    stream.on("data", function (event) {
      var tweet = event.text;
      var user = event.user.name;

      var insert_R = "INSERT INTO tweet_repo(keyword,user,tweet) VALUE(?,?,?)";
      //establishing connection
      connect.getConnection(function (err, connection) {
        //Inserting a record into details
        connection.query(insert_R, [keyword, user, tweet], function (err, res) {
          if (err) throw err;
          else {
            var content = {
              keyword: keyword,
              user: user,
              tweet: tweet,
            };
            console.log("Keyword is ::>> " + keyword);
            console.log("Tweeted by ::>>" + event.user.name);
            console.log("Tweet is ::>>" + event.text);
            console.log("Details added successfully");
            //Emitting the data using sockets
            socket.emit("livetweets", { data: content });
          }
        });
        //releasing connection
        socket.on("stop", function (data) {
          connection.release();
        });
      });
    });

    stream.on("error", function (error) {
      throw error;
    });
  });
});
