pragma solidity ^0.4.17;

contract Feedback {
  mapping (address => string) private userFeedback;
  address public owner;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  function addFeedback(string feedback) public returns (string) {
    userFeedback[msg.sender] = feedback;
    return userFeedback[msg.sender];
    owner = msg.sender;
  }

  function viewFeedback() constant returns (string) {
    return userFeedback[msg.sender];
  }
}
