pragma solidity ^0.4.21;

contract Feedback {
  address public instructor;

  struct FeedbackQ {
    uint questionID;
    uint courseID;
    bytes question;
    mapping (bool => uint) voteCount;
  }

  FeedbackQ[] private daily_questions;
  address[] private enrolled_students;

  //event Propagate(address indexed _from, bool _value);

  function newEnrollment(address student_addr) public returns (uint student_num) {
    return enrolled_students.push(student_addr)-1;
  }
 
  function newQuestion(uint questionID, uint courseID, bytes text) public {
    uint rownumber = daily_questions.length;
    daily_questions.length++;
    FeedbackQ storage question = daily_questions[rownumber];
    question.questionID = questionID;
    question.courseID = courseID;
    question.question = text;
    question.voteCount[false] = 0;
    question.voteCount[true] = 0;
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

    uint count = questionsCount();
    uint i = 0;

    for (i; i < count; i++) {
      if (daily_questions[i].questionID == questionID) {
        daily_questions[i].voteCount[feedback]++;
      }
    }
  }

  function viewFeedback(uint questionID, bool responsetype) public
                            view returns (uint result) {
    uint count = questionsCount();
    uint i = 0;
    for (i; i < count; i++) {
      if (daily_questions[i].questionID == questionID) {
        return daily_questions[i].voteCount[responsetype];
      }
    }
  }
}
