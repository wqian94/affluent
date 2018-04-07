pragma solidity ^0.4.21;

contract Feedback {
  address public instructor;

  struct FeedbackQ {
    //bytes32[] question = new byte;
    mapping (bool => uint) voteCount;
    uint questionID;
    uint courseID;
  }

  FeedbackQ[] private daily_questions; 
  address[] private enrolled_students;

  event Propagate(address indexed _from, bool _value);

  function newEnrollment(address student_addr) public returns (uint student_num) {
    return enrolled_students.push(student_addr)-1;
  }
  
  function newQuestion(uint questionID, uint courseID) public
                          returns(uint rownumber) {
    FeedbackQ newQuestion;
    newQuestion.questionID = questionID;
    newQuestion.courseID = courseID;
    return daily_questions.push(newQuestion)-1;
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

  function viewFeedback(bool responsetype, uint questionID) public 
                            view returns (uint result) {
    uint count = questionsCount();
    uint i = 0;
    for (i; i < count; i++) {
      if (daily_questions[i].questionID == questionID) {
        return daily_questions[i].voteCount[feedback];
      }
  }
}
