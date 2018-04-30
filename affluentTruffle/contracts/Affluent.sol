/**
 * Contract: Affluent
 *
 * The main chain, which contains associations from instructor addresses to
 * classes.
 */

pragma solidity ^0.4.21;

import './Class.sol';

contract Affluent {
  // Mapping of active instructor's addresses to active classes
  mapping (address => Class) private actives;

  // Classes to number of subscribers. If the mapped value is n, then n=0 means
  // that the address has never been added. Otherwise, it means that there are
  // (n - 1) instructor=>address mappings for that address.
  mapping (address => uint8) private states;

  // A list of all classes.
  Class[] classes;

  // Activates a mapping from the instructor (message sender) to the given
  // contract address; overwrites any previous mappings for the sender.
  function activate(Class class) public {
    deactivate();
    actives[msg.sender] = class;
    if (0 == states[class]) {
      classes.push(class);
      states[class] = 1;
    }
    states[class]++;
  }

  // Deactivates the current instructor association.
  function deactivate() public {
    if (states[actives[msg.sender]] > 0) {
      states[actives[msg.sender]]--;
    }
    delete actives[msg.sender];
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
