var Feedback = artifacts.require("./Feedback.sol");

contract('Feedback', function(accounts) {
  it("should set this user's feedback to true", function() {
    return Feedback.deployed().then(function(instance) {
      instance.addFeedback(true);
      return instance.viewFeedback.call();
    }).then(function(ret) {
      assert.equal(ret, true, "Feedback was not recorded as true");
    });
  });
});
