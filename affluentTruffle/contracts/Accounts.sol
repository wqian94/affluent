pragma solidity ^0.4.21;

contract Accounts {
  uint index = 1;

  event Account(uint nonce, uint index);

  function newAccount(uint nonce) public {
    uint i = index++;
    emit Account(nonce, i);
  }
}
