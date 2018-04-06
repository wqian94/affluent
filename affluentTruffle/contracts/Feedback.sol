pragma solidity ^0.4.21;

contract Feedback {
  mapping (address => bool) private userFeedback;
  address public owner;

  event Propagate(address indexed _from, bool _value);

  function addFeedback(bool feedback) public returns (bool) {
    userFeedback[msg.sender] = feedback;
    owner = msg.sender;
    emit Propagate(msg.sender, feedback);
    return userFeedback[msg.sender];
  }

  function viewFeedback() public view returns (bool) {
    return userFeedback[msg.sender];
  }

}
