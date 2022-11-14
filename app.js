const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const request = require('request');
const alert = require('alert'); 

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/compilerDB");

const testCaseSchema = new mongoose.Schema({
  testCase: String
});

const TestCase = mongoose.model("TestCase", testCaseSchema);

const problemSchema = new mongoose.Schema({
  question: String,
  input: [testCaseSchema],
  output: String,
  soltuion: String,
  time: String,
  memory: String
});

const Problem = mongoose.model("Problem", problemSchema);

app.get("/", function(req, res) {
    res.render("body");
  });

app.get("/teacher", function(req, res) {
  res.render("teacher");
});

app.post("/teacher", function(req, res) {
    const question = req.body.question;
    const solution = req.body.solution;
    const testCase = req.body.testCase;
    const hiddenTestCase = req.body.hiddenTestCase;

    const newTestCase = new TestCase({
      testCase: testCase
    });
    const newHiddenTestCase = new TestCase({
        hiddenTestCase: hiddenTestCase
    });

    var program = {
        script : solution,
        stdin: testCase,
        language: "cpp14",
        versionIndex: "0",
        clientId: "",
        clientSecret:""
    };
    request({
        url: 'https://api.jdoodle.com/v1/execute',
        method: "POST",
        json: program
        },
        function (error, response, body) {
            if(error) { console.log('error:', error); }
            const output = body.output;
            const memory = body.memory;
            const time = body.cpuTime;
            
            const newProblem = new Problem({
              question: question,
              input: [newTestCase],
              output: output,
              soltuion: solution,
              time: time,
              memory: memory
            });

            alert("Question Uploaded!");

            newProblem.save();
    });

    res.redirect("/teacher");
});



app.listen(3000, function() {
    console.log("Server is running on port 3000.");
});