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
  mapping (address => uint) private student_progress;

  event Question(address target, string text, uint qnum);
  event SummaryUpdated();

  function newEnrollment(address student_addr) public {
    for (uint i = 0; i < enrolled_students.length; i++) {
      if (enrolled_students[i] == student_addr) {
        return;
      }
    }
    enrolled_students.push(student_addr);
    student_progress[student_addr] = 0;
  }
 
  function newQuestion(uint courseID, string text) public {
    uint rownumber = daily_questions.length;
    daily_questions.length++;
    FeedbackQ storage question = daily_questions[rownumber];
    question.questionID = rownumber;
    question.courseID = courseID;
    question.question = text;
    question.voteCount[false] = 0;
    question.voteCount[true] = 0;
    emit SummaryUpdated();
  }

  function popQuestion() public {
    uint qnum = student_progress[msg.sender];
    if (qnum < questionsCount()) {
      emit Question(msg.sender, daily_questions[qnum].question, qnum);
    }
  }

  function getQuestion(uint questionID) public constant returns(string) {
    return daily_questions[questionID].question;
  }

  function questionsCount() public constant returns(uint questionCount) {
    return daily_questions.length;
  }

  function hasNextQuestion() public constant returns (bool) {
    return student_progress[msg.sender] < questionsCount();
  }

  function studentsCount() public constant returns(uint studentCount) {
    return enrolled_students.length;
  }

  function isEnrolled(address addr) public view returns(bool) {
    uint count = studentsCount();
    for (uint i = 0; i < count; i++) {
      if (enrolled_students[i] == addr) {
        return true;
      }
    }
    return false;
  }

  function giveFeedback(bool feedback, uint questionID) public {
    require(isEnrolled(msg.sender));

    daily_questions[questionID].voteCount[feedback]++;
    student_progress[msg.sender]++;
    emit SummaryUpdated();
  }

  function viewFeedback(uint questionID, bool responsetype) public
                            view returns (uint result) {
    return daily_questions[questionID].voteCount[responsetype];
  }
}
