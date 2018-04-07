var Feedback = artifacts.require("./Feedback.sol");

contract('Feedback', function(accounts) {
  var instructor = accounts[0];
  var enrollment = 5;

  it("Testing instructor validation...", function() {
    return Feedback.deployed().then(function(instance) {
      instance.validateInstructor({from: instructor});
      return instance.getInstructor();
    }).then(function(ret) {
      assert.equal(ret, instructor, "Instructor is confirmed to be the account.");
    });
  });
  
  it("Testing student enrollment...", function() {
    return Feedback.deployed().then(function(instance) {
      for (var i = 1; i <= enrollment; i ++) {
        instance.newEnrollment({from: accounts[i]});
      }
      return instance.studentsCount();
    }).then(function(ret) {
      assert.equal(ret, enrollment, "All student accounts enrolled.");
    });
  });

  it("Testing question adding", function() {
    return Feedback.deployed().then(function(instance) {
      instance.newQuestion(0, 144, "Do you like this class?", {from: accounts[enrollment+1]});
      return instance.questionsCount();
    }).then(function(ret) {
      assert.equal(ret, 1, "First question added.");
    });
  });
});
