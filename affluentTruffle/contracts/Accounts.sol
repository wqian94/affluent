pragma solidity ^0.4.21;

contract Accounts {
  uint index = 1;

  struct instructorInfo {
    uint instructorID;
    string name;
    string course;
    string email;
  }

  // mapping for checking valid addresses in login
  mapping (address => bool) public studentRegistered;
  mapping (address => instructorInfo) public instructorsInfo;
  // list of all instructors
  address[] instructorList;
  
  // mapping of instructors to their deployed contracts
  mapping (address => address) instructorContracts;

  // mappings of all students in a course and a second mapping for
  // all courses of each student
  mapping (address => address[]) courseEnrollments;
  mapping (address => address[]) studentCourses;

  event Student(uint nonce, uint index);
  event Instructor(uint nonce, uint index, string name, string course, string email);

  function newStudent(uint nonce) public {
    uint i = index++;
    emit Student(nonce, i);
  }

  function newInstructor(uint nonce, string name, string course, string email) public {
    uint i = index++;
    emit Instructor(nonce, i, name, course, email);
  }

  // register student for student login
  function registerStudent(address addr) public {
    studentRegistered[addr] = true;
  }

  function enrollStudent(address student, address course) {
    // add student address to the course roster
    uint crownumber = courseEnrollments[course].length;
    courseEnrollments[course].length++;

    courseEnrollments[course][crownumber] = student;

    // add course address to the student's personal list
    uint srownumber = studentCourses[student].length;
    studentCourses[student].length++;

    studentCourses[student][srownumber] = course;
  }

  // register an instructor account for login validation and 
  // information retrieval 
  function registerInstructor(string name, string course, string email, address addr) public {
    uint rownumber = instructorList.length;
    instructorList.length++;
    instructorList[rownumber] = addr;

    instructorInfo storage newInfo = instructorsInfo[addr];

    newInfo.instructorID = rownumber;
    newInfo.name = name;
    newInfo.course = course;
    newInfo.email = email;

    instructorContracts[addr] = address(0);
  }

  // view functions and calls that do not change the contract state

  function getStudentCourses(address addr) returns(address[]) {
    return studentCourses[addr];
  }

  function getName(address addr) public view returns(string) {
    return instructorsInfo[addr].name;
  }
  function getCourse(address addr) public view returns(string) {
    return instructorsInfo[addr].course;
  }
  function getEmail(address addr) public view returns(string) {
    return instructorsInfo[addr].email;
  }

  function instructorsCount() public constant returns (uint count) {
    return instructorList.length;
  }

  function instructorAddrByID(uint id) public view returns(address) { 
    return instructorList[id];
  }

  function isStudent(address addr) public view returns (bool) {
    return studentRegistered[addr];
  }

  function isInstructor(address addr) public view returns (bool) {
    instructorInfo storage thisInfo = instructorsInfo[addr];
    bytes memory nameBytes = bytes(thisInfo.name);
    bytes memory courseBytes = bytes(thisInfo.course);
    bytes memory emailBytes = bytes(thisInfo.email);

    if (nameBytes.length > 0 && courseBytes.length > 0 && emailBytes.length > 0) {
      return true;
    } else {
      return false;
    }
  }

}
