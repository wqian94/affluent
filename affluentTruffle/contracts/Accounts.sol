pragma solidity ^0.4.21;

contract Accounts {
  uint index = 1;

  struct instructorInfo {
    uint instructorID;
    string name;
    string course;
    string email;
    address addr;
  }

  instructorInfo[] public instructorList;
  mapping (address => address) instructorContracts;

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

  function registerInstructor(string name, string course, string email, address addr) public {
    uint rownumber = instructorList.length;
    instructorList.length++;
    instructorInfo storage newInfo = instructorList[rownumber];

    newInfo.instructorID = rownumber;
    newInfo.name = name;
    newInfo.course = course;
    newInfo.email = email;
    newInfo.addr = addr;

    instructorContracts[addr] = address(0);
  }
}
