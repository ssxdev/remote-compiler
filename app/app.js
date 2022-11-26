const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const axios = require('axios');

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))
app.use(bodyParser.json({limit: "50mb"}))
app.use(express.static("public"));

// MongoDB Starts

mongoose.connect("mongodb://localhost:27017/compilerDB", function(err) {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  console.log("Succesfully connected to mongoDB Database!");
});

const questionSchema = new mongoose.Schema({
  questionIn: String,
  solutionIn: String,
  testCase : [{
    input: String,
    output: String
  }]
});

const Question = mongoose.model("Question", questionSchema);

// MongoDB Ends

app.get("/", function(req, res) {
  res.render("body");
});

app.get("/teacher", function(req, res) {
  res.render("teacher");
});

app.get("/student", function(req, res) {
  Question.find({}, function(err, foundQuestions) {
    if(err) {
      console.log(err);
    } else {
      res.render("student", {
        questions: foundQuestions
      });
    }
  });
});

app.get("/question/:id", function(req, res) {
  Question.findById(req.params.id, function(err, quesFound) {
    if(err) {
      console.log(err);
    } else {
      res.render("question", {question: quesFound});
    }
  });
});

app.post("/uploadQuestion", function(req, res) {
  const ques = req.body.questext;
  const soltuion = req.body.code;
  const input0 = req.body.input0;
  const output0 = req.body.output0;
  const input1 = req.body.input1;
  const output1 = req.body.output1;

  const newQuestion = new Question({
    questionIn : ques,
    solutionIn : soltuion,
    testCase : [
      {
        input : input0,
        output : output0
      },
      {
        input : input1,
        output : output1
      }
    ]
  });

  newQuestion.save(function(err) {
    if(!err){
      res.send("Question Uploaded!");
    } else {
      res.send("Error : Retry Again");
    }
  });
});


const port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log(`Server is running on port ${port}.`);
});