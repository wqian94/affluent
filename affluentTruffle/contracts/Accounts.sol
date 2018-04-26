pragma solidity ^0.4.21;

contract Accounts {
  uint index = 1;

  struct instructorInfo {
    uint instructorID;
    string name;
    string course;
    string email;
  }

  mapping (address => bool) public studentRegistered;
  mapping (address => instructorInfo) public instructorsInfo;
  address[] instructorList;
  

  mapping (address => address) instructorContracts;
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

  function registerStudent(address addr) public {
    studentRegistered[addr] = true;
  }

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
