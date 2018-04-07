pragma solidity ^0.4.21;

contract Feedback {
  struct FeedbackQ {
    mapping (bool => uint) voteCount;
    uint questionID;
    uint courseID;
    bytes32[1024] question;
  }

  address public instructor;

  address[] private enrolled_students;
  FeedbackQ[] private daily_questions; 

  event Transfer(address indexed _from, address indexed _to, uint256 _value);
  event Propagate(address indexed _from, bool _value);

  function validateInstructor() public returns (bool validated) {
    instructor = msg.sender;
    emit Propagate(instructor, true);
    return true;
  }

  function newEnrollment() public returns (uint student_num) {
    emit Transfer(msg.sender, instructor, 1);
    return enrolled_students.push(msg.sender)-1;
  }

  function newQuestion(uint questionID, uint courseID, bytes32[1024] question) public
                          returns(uint rownumber) {
    FeedbackQ memory newDailyQuestion;
    newDailyQuestion.questionID = questionID;
    newDailyQuestion.courseID = courseID;
    newDailyQuestion.question = question;
    emit Transfer(msg.sender, instructor, 1);
    return daily_questions.push(newDailyQuestion)-1;
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
