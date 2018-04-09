pragma solidity ^0.4.21;

contract Feedback {
  struct FeedbackQ {
    uint questionID;
    uint courseID;
    bytes question;
    mapping (bool => uint) voteCount;
  }

  address public instructor;

  address[] private enrolled_students;
  FeedbackQ[] private daily_questions; 

  //event Enroll(address indexed _from, address indexed _to);
  //event Propagate(address indexed _from, bool _value);
  //event Transfer(address indexed _from, address indexed _to, FeedbackQ _value);

  function validateInstructor() public returns (bool validated) {
    instructor = msg.sender;
    //emit Propagate(instructor, true);
    return true;
  }

  function newEnrollment() public returns (uint student_num) {
    //emit Enroll(msg.sender, instructor);
    return enrolled_students.push(msg.sender)-1;
  }

  function newQuestion(uint questionID, uint courseID, bytes question) public
                          returns(uint rownumber) {
    rownumber = daily_questions.length;
    daily_questions.length++;
    FeedbackQ storage newDailyQuestion = daily_questions[rownumber];
    newDailyQuestion.voteCount[true] = 0;
    newDailyQuestion.voteCount[true] = 0;
    newDailyQuestion.questionID = questionID;
    newDailyQuestion.courseID = courseID;
    newDailyQuestion.question = question;
    //emit Transfer(msg.sender, instructor, newDailyQuestion);
  }

  // view instructions

  function getInstructor() public view returns (address retinstructor) {
    return instructor;
  }
  
  function studentsCount() public view returns(uint studentCount) {
    return enrolled_students.length;
  }

  function questionsCount() public view returns(uint questionCount) {
    return daily_questions.length;
  }

}
