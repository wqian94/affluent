pragma solidity ^0.4.21;

contract Accounts {
  uint index = 1;

  struct instructorInfo {
    bytes name;
    bytes course;
    bytes email;
  }

  mapping (address => bool) public studentRegistered;
  mapping (address => instructorInfo) public instructorList;

  mapping (address => address) instructorContracts;
  mapping (address => address[]) courseEnrollments;

  event Student(uint nonce, uint index);
  event Instructor(uint nonce, uint index, bytes name, bytes course, bytes email);

  function newStudent(uint nonce) public {
    uint i = index++;
    emit Student(nonce, i);
  }

  function newInstructor(uint nonce, bytes name, bytes course, bytes email) public {
    uint i = index++;
    emit Instructor(nonce, i, name, course, email);
  }

  function registerStudent(address addr) public {
    studentRegistered[addr] = true;
  }

  function registerInstructor(bytes name, bytes course, bytes email, address addr) public {
    instructorInfo storage newInfo = instructorList[addr];

    newInfo.name = name;
    newInfo.course = course;
    newInfo.email = email;

    instructorContracts[addr] = address(0);
  }

  function isStudent(address addr) public view returns (bool) {
    return studentRegistered[addr];
  }

  function isInstructor(address addr) public view returns (bool) {
    instructorInfo storage thisInfo = instructorList[addr];
    if (thisInfo.name.length > 0 && thisInfo.course.length > 0 && thisInfo.email.length > 0) {
      return true;
    } else {
      return false;
    }
  }

}
