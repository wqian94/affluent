/**
 * Contract: Class
 *
 * A single offering of a class, which contains information about the roster,
 * statistical trends, and the question set.
 */

pragma solidity ^0.4.21;

import './Session.sol';

contract Class {
  struct question {
    uint index;
    string text;
  }

  event NewSession(Session session, uint index);
  event Question(address student, string text);

  address private instructor;  // Instructor's address
  question[] private questions;  // Questions list
  mapping (address => bool) private roster;  // Students enrolled in the class
  Session[] private sessions;  // Class sessions
  string private short;  // Short title, e.g. CS144r/244r
  string private term;  // Term, e.g. Spring 2018
  string private title;  // Title, e.g. Computer Networks

  // Constructor; short denotes the short title, term denotes the offering's
  // term, and title is the longer title of the course.
  function Class(string _short, string _term, string _title) public {
    instructor = msg.sender;
    short = _short;
    term = _term;
    title = _title;
  }

  // Checks whether the current message's sender has administrative privileges,
  // and if not, throws an assertoin error.
  function adminOnly() public view returns (bool) {
    require(isAdmin());
  }

  // Removes a student's enrollment.
  function drop(address student) public {
    adminOnly();
    delete roster[student];
  }

  // Adds a student's enrollment.
  function enroll(address student) public {
    adminOnly();
    roster[student] = true;
  }

  // Returns the instructor's address.
  function getInstructor() public view returns (address) {
    return instructor;
  }

  // Get the question at the given index.
  function getQuestionText(uint index) public view returns (string) {
    require(index < numQuestions());
    return questions[index].text;
  }

  // Returns the session at the given index.
  function getSession(uint index) public view returns (Session) {
    require(index < numSessions());
    return sessions[index];
  }

  // Returns the summary for the given response of the given question on the
  // given day. The option is the response requested, qindex is the index of the
  // question within the class, and sindex is the session index.
  function getSummary(bool option, uint qindex, uint sindex) public view returns
      (uint) {
    require(sindex < numSessions());
    require(qindex < numQuestions());
    return sessions[sindex].getQuestionResponse(option, qindex);
  }

  // Returns whether the current message's sender has administrative privileges.
  function isAdmin() public view returns (bool) {
    return msg.sender == instructor;
  }

  // Verifies a student's enrollment.
  function isEnrolled(address student) public view returns (bool) {
    return roster[student];
  }

  // Creates a new question entry.
  function newQuestion(string text) public {
    uint index = questions.length++;
    questions[index].index = index;
    questions[index].text = text;
  }

  // Creates and returns a new Session of this Class.
  function newSession() public {
    adminOnly();
    Session s = new Session(this);
    uint index = sessions.push(s) - 1;
    emit NewSession(s, index);
  }

  // Returns the number of questions available in the class.
  function numQuestions() public view returns (uint) {
    return questions.length;
  }

  // Returns the total number of sessions.
  function numSessions() public view returns (uint) {
    return sessions.length;
  }

  // Causes the given question to be emitted.
  function popQuestion(address target, uint index) public {
    require(index < numQuestions());
    // Prevent student-student sabotage
    require(msg.sender == instructor || msg.sender == target);
    emit Question(target, questions[index].text);
  }
}
