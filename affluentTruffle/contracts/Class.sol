/**
 * Contract: Class
 *
 * A single offering of a class, which contains information about the roster,
 * statistical trends, and the question set.
 */

pragma solidity ^0.4.23;

import './Affluent.sol';
import './Session.sol';

contract Class {
  struct question {
    uint index;
    string text;
  }

  event NewSession(Session session, uint index);
  event Question(address student, string text);

  bool private active;  // Whether the class is currently active
  Affluent private affluent;  // Parent Affluent contract
  address private instructor;  // Instructor's address
  question[] private questions;  // Questions list
  mapping (address => bool) private roster;  // Students enrolled in the class
  Session[] private sessions;  // Class sessions

  string private label;  // Short title label, e.g. CS144r/244r
  string private term;  // Term, e.g. Spring 2018
  string private title;  // Title, e.g. Computer Networks

  // Constructor; label denotes the label title, term denotes the offering's
  // term, and title is the longer title of the course. Classes are initialized
  // to being inactive, and must be activated by calling activate().
  constructor(Affluent aff, string _label, string _term, string _title) public {
    active = false;
    affluent = aff;
    instructor = msg.sender;
    label = _label;
    term = _term;
    title = _title;
  }

  // Activates the class
  function activate() public {
    adminOnly();
    active = true;
  }

  // Checks whether the current message's sender has administrative privileges,
  // and if not, throws an assertoin error.
  function adminOnly() private view {
    require(isAdmin());
  }

  // Deactivates the class
  function deactivate() public {
    adminOnly();
    active = false;
  }

  // Removes a student's enrollment.
  function drop(address student) public {
    adminOnly();
    require(roster[student]);
    delete roster[student];
  }

  // Adds a student's enrollment.
  function enroll(address student) public {
    adminOnly();
    require(!roster[student]);
    roster[student] = true;
  }

  // Returns the instructor's address.
  function getInstructor() public view returns (address) {
    return instructor;
  }

  // Returns the class label.
  function getLabel() public view returns (string) {
    return label;
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

  // Returns the class term.
  function getTerm() public view returns (string) {
    return term;
  }

  // Returns the class title.
  function getTitle() public view returns (string) {
    return title;
  }

  // Returns whether the class is active.
  function isActive() public view returns (bool) {
    return active;
  }

  // Returns whether the current message's sender has administrative privileges.
  function isAdmin() public view returns (bool) {
    return msg.sender == instructor || msg.sender == affluent.admin();
  }

  // Verifies a student's enrollment.
  function isEnrolled(address student) public view returns (bool) {
    return roster[student];
  }

  // Creates a new question entry.
  function newQuestion(string text) public {
    adminOnly();
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
    bool valid = (msg.sender == instructor);
    for (uint i = 0; !valid && (i < sessions.length); i++) {
      valid = (valid || (msg.sender == address(sessions[i])));
    }
    require(valid);
    emit Question(target, questions[index].text);
  }
}
