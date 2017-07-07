// server.js
// where your node app starts

// init project
console.log("init project");
var express = require("express");
var request = require("request");
var IFTTT = require("node-ifttt-maker");
var bodyParser = require("body-parser");
//var readingTime = require("reading-time");  //not used
const replaceString = require("replace-string");

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var keywordCount = 6; //how many of the top keywords to return
var withBreak = 1; // summary will contain string [BREAK] between each sentence

// Show the homepage
// http://expressjs.com/en/starter/static-files.html
app.use(express.static("views"));

var queue = []; // []
queue.push("first"); // queue === ["first"]
queue.push(10, 20); // queue === ["first", 10, 20]
var el = queue.shift(); // queue === [10, 20] && el === "first"
queue.push(2); // queue === [10, 20, 2]
el = queue.shift(); // queue === [20, 2] && el === 10
el = queue.shift(); // queue === [2] && el === 20
el = queue.shift(); // queue === [] && el === 2
el = queue.shift(); // queue === [] && typeof el === "undefined"

var URLqueue = [];

// Handle requests from IFTTT
app.post("/", function(request, response) {
  console.log("Request received from IFTTT");
  //console.log("Data: " + JSON.stringify(request.body));
  console.log("After request length: " + URLqueue.length);

  if (process.env.GLITCH_APP_KEY === request.body.key) {
    //console.log("Summarizing URL: " + request.body.thething); //thething = articleURL
    URLqueue.push(request);

    while (URLqueue.length > 0) {
      console.log("Summarizing URL: " + URLqueue[0]); //thething = articleURL
      makeRequestToSmmry(URLqueue.shift());
      console.log("After summarising length: " + URLqueue.length);
    }
    /* var getPage = require('summarizer').getPage;
    var uri = request.body.thething;
    getPage(uri).then(function (data) {
      console.log(JSON.stringify(data, null, 2));
    }, console.error);*/
  } else {
    console.log("IFTTT applet key does not match Glitch app key, exiting.");
  }
  response.end();
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

function getReadindTime(articleURL) {
  //todo?
}

//
function makeRequestToSmmry(initialRequest) {
  var articleURL = initialRequest.body.thething;
  
  
  
  request(
    "http://api.smmry.com/SM_API_KEY=" +
      process.env.SM_API_KEY +
      "&SM_WITH_BREAK=" +
      withBreak +
      "&SM_KEYWORD_COUNT=" +
      keywordCount +
      "&SM_URL=" +
      articleURL, //The variable &SM_URL= must always be at the end of the call.
    function(error, response, body) {
      //if (!error) {
      console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
      console.log("body:", body); // Print the HTML.

      var json = JSON.parse(response.body);
      if (json.sm_api_error == undefined) {
        var summary = json.sm_api_content;
        summary = summary.replace(/\[BREAK\]/g, "<br> -"); //replaceString(input, 'BREAK', 'SOMETHING');

        var keywords = json.sm_api_keyword_array;
        keywords = "#" + keywords.join(" #"); //SUMMRY top ranked keywords in descending order, each one preceded by hashtag
        
        var articleTags = initialRequest.body.tags;
        if (articleTags.length > 0) {
          articleTags = "(" + articleTags + ")"; //
        }
        articleTags = articleTags.replace(/' '/g, "_"); //replaceString(input, 'BREAK', 'SOMETHING');

        const method = "POST"; // Using POST
        const ifttt = new IFTTT(process.env.IFTTT_MAKER_KEY);
        //const event = process.env.IFTTT_EVENT_NAME;
        var event;
        //you can set general event name in .env or set custom event name in some of your IFTTT maker triggers (event=my_summary_action_1)
        if (initialRequest.body.event==undefined){
          event = process.env.IFTTT_EVENT_NAME;
        } else event = initialRequest.body.event; 
        

        const params = {
          // Adding values (only value1, value2 and value3 are accepted by IFTTT)
          value1: "📜" + json.sm_api_title + "<br>" + keywords,
          value2: articleURL + " " + articleTags,
          value3: summary
        };

        ifttt.request({ event, params }).then(response => {}).catch(err => {
          console.log(err);
        });

        console.log("OK");
      } else console.log("Smmry API Error: ", json.sm_api_message);
      //} else console.log("error:", error); // Print the error if one occurred
    }
  );
}
