pragma solidity ^0.4.21;

contract Feedback {
  address public instructor;

  struct FeedbackQ {
    uint questionID;
    uint courseID;
    string question;
    mapping (bool => uint) voteCount;
  }

  FeedbackQ[] private daily_questions;
  address[] private enrolled_students;

  event Question(string text);

  function newEnrollment(address student_addr) public returns (uint student_num) {
    return enrolled_students.push(student_addr)-1;
  }
 
  function newQuestion(uint questionID, uint courseID, string text) public {
    uint rownumber = daily_questions.length;
    daily_questions.length++;
    FeedbackQ storage question = daily_questions[rownumber];
    question.questionID = questionID;
    question.courseID = courseID;
    question.question = text;
    question.voteCount[false] = 0;
    question.voteCount[true] = 0;
  }

  function popQuestion(uint questionID) public {
    if (questionID < questionsCount()) {
      emit Question(daily_questions[questionID].question);
    }
  }

  function getQuestion(uint questionID) public constant returns(string question) {
    return daily_questions[questionID].question;
  }

  function questionsCount() public constant returns(uint questionCount) {
    return daily_questions.length;
  }

  function studentsCount() public constant returns(uint studentCount) {
    return enrolled_students.length;
  }

  function giveFeedback(bool feedback, uint questionID) public {
    uint studcount = studentsCount();
    uint j = 0;
    bool inclass = false;
    for (j; j < studcount; j++ ) {
      if (enrolled_students[j] == msg.sender) {
        inclass = true;
        break;
      }
    }

    require(inclass);

    daily_questions[questionID].voteCount[feedback]++;
  }

  function viewFeedback(uint questionID, bool responsetype) public
                            view returns (uint result) {
    return daily_questions[questionID].voteCount[responsetype];
  }
}
