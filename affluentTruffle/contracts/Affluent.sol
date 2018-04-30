/**
 * Contract: Affluent
 *
 * The main chain, which contains associations from instructor addresses to
 * classes.
 */

pragma solidity ^0.4.23;

import './Class.sol';

contract Affluent {
  // Mapping of active instructor's addresses to active classes
  mapping (address => Class) private actives;

  // Classes to number of subscribers. If the mapped value is n, then n=0 means
  // that the address has never been added. Otherwise, it means that there are
  // (n - 1) instructor=>address mappings for that address.
  mapping (address => uint8) private states;

  address public admin;

  // A list of all classes.
  Class[] classes;

  constructor() public {
    admin = msg.sender;
  }

  // Activates a mapping from an instructor to the given contract address;
  // overwrites any previous mappings for the sender.
  function activate(Class class) public {
    require(msg.sender == admin);
    deactivate(class.getInstructor());
    actives[class.getInstructor()] = class;
    if (0 == states[class]) {
      classes.push(class);
      states[class] = 1;
    }
    states[class]++;
  }

  // Deactivates the current instructor association.
  function deactivate(address instructor) public {
    require(msg.sender == admin);
    if (states[actives[instructor]] > 0) {
      states[actives[instructor]]--;
    }
    delete actives[instructor];
  }

  // Retrieves the class at the given index, if possible.
  function getClass(uint index) public view returns (Class) {
    require(index < classes.length);
    return classes[index];
  }

  // Retrieves the class associated with the given instructor address.
  function getClassOf(address instructor) public view returns (Class) {
    return actives[instructor];
  }

  // Retrieves the number of classes.
  function numClasses() public view returns (uint) {
    return classes.length;
  }
}
