/**
 * Contract: Affluent
 *
 * The main chain, which contains associations from instructor addresses to
 * classes.
 */

pragma solidity ^0.4.23;

import './Class.sol';

contract Affluent {
  address public admin;
  Class[] classes;  // A list of all classes
  mapping (address => bool) private exists;  // Existence for classes

  constructor() public {
    admin = msg.sender;
  }

  // Activates a mapping from an instructor to the given contract address;
  // overwrites any previous mappings for the sender.
  function activate(Class class) public {
    require(msg.sender == admin);
    if (!exists[class]) {
      classes.push(class);
      exists[class] = true;
    }
  }

  // Retrieves the class at the given index, if possible.
  function getClass(uint index) public view returns (Class) {
    require(index < classes.length);
    return classes[index];
  }

  // Retrieves the number of classes.
  function numClasses() public view returns (uint) {
    return classes.length;
  }
}
