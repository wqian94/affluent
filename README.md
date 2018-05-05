# affluent.

Main application (NodeJS):
app/javascripts/app.js

Code for the 3 contracts:
contracts/Affluent.sol
contracts/Class.sol
contracts/Session.sol

Unit tests:
test/affluent_test.js

Welcome to Affluent (A Faster Feedback Loop Using Encrypted Network Technology)! This tool, built on the Ethereum blockchain, allows students to give instructional feedback in their classes while preserving their anonymity.

In contrast to the Harvard Q guide, in which students only have one opportunity to give feedback at the end of the semester, Affluent allows students to give continuous feedback. This therefore incentivizes students to give constructive feedback because it is in the students' interest to improve classes that they will still attend. 

The project is set up as a standard Truffle framework Ethereum dapp, with a NodeJS app (contained in app/javascripts/app.js). We used a ganache environment for development testing, which we configured with config.js and ran with ganache.js (both in the root directory). Migration occured through Truffle, and we tested with the webpack-dev-server.

Unit tests are included in test/affluent_test.js and can be run through Truffle.
