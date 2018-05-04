/**
 * Contract: Session
 *
 * A single session of a class, which contains information about the order of
 * the questions, the progress of the students through the questions, and the
 * parent Class.
 */

pragma solidity ^0.4.23;

import './Class.sol';

contract Session {
  struct question {
    uint index;  // Index of the question in the parent Class
    mapping (bool => uint) responses;  // Tallies of the responses
  }

  address[] private attendance;  // Keeps track of this Session's attendance
  Class private class;  // Parent class
  address private instructor;  // Cached value of the class's instructor
  bool private locked;  // Whether responses are restricted
  mapping (address => uint) progress;  // Progress of each student in questions
  question[] private questions;  // Question list

  // Constructor: class is the parent class of this Session.
  constructor(Class _class) public {
    class = _class;
    instructor = class.getInstructor();
    locked = true;
  }

  // Append a question to the current list of questions, based on its given
  // index in the parent class.
  function addQuestion(uint index) public {
    adminOnly();
    uint qindex = questions.length++;
    questions[qindex].index = index;

    class.updateSummary();

    // Notify students who've been waiting
    if (!locked) {
      for (uint i = 0; i < attendance.length; i++) {
        if (qindex == progress[attendance[i]]) {
          class.popQuestion(attendance[i], questions[qindex].index);
        }
      }
    }
  }

  // Restricts administrative rights to this contract
  function adminOnly() private view {
    require(msg.sender == instructor);
  }

  // Signs the student (msg.sender) up for attendance in the current class.
  function attend() public {
    require(class.isEnrolled(msg.sender));
    for (uint i = 0; i < attendance.length; i++) {
      if (msg.sender == attendance[i]) {
        if (progress[msg.sender] < questions.length) {
          class.popQuestion(msg.sender, questions[progress[msg.sender]].index);
        }
        return;
      }
    }
    attendance.push(msg.sender);

    // Also emit the first question if it's ready
    if (!locked) {
      if (questions.length > 0) {
        class.popQuestion(msg.sender, questions[0].index);
      }
    }
  }

  // Returns the parent Class.
  function getClass() public view returns (Class) {
    return class;
  }

  // Returns the index in Class for the given Session question index
  function getQuestionIndex(uint sindex) public view returns (uint) {
    adminOnly();
    return questions[sindex].index;
  }

  // Returns the response count for the given question and response type.
  function getQuestionResponse(bool option, uint qindex) public view returns
      (uint count) {
    count = 0;
    for (uint i = 0; i < questions.length; i++) {
      if (questions[i].index == qindex) {
        count += questions[i].responses[option];
      }
    }
  }

  // Returns whether the Session is currently locked.
  function isLocked() public view returns (bool) {
    return locked;
  }

  // Locks the Session to halt any voting.
  function lock() public {
    adminOnly();
    locked = true;
  }

  // Returns the number of questions
  function numQuestions() public view returns (uint) {
    adminOnly();
    return questions.length;
  }

  // Submits a student's response.
  function submitResponse(bool response) public {
    require(!locked);
    require(class.isEnrolled(msg.sender));
    require(progress[msg.sender] < questions.length);
    uint index = progress[msg.sender]++;
    questions[index].responses[response]++;

    class.updateSummary();

    // Emit next question if it's ready
    if (!locked && (progress[msg.sender] < questions.length)) {
      class.popQuestion(msg.sender, questions[progress[msg.sender]].index);
    }
  }

  // Unlocks the Session to re-allow voting.
  function unlock() public {
    adminOnly();
    locked = false;
    for (uint i = 0; i < attendance.length; i++) {
      if (progress[attendance[i]] < questions.length) {
        class.popQuestion(
          attendance[i], questions[progress[attendance[i]]].index);
      }
    }
  }
}
