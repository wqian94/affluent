var Feedback = artifacts.require("./Feedback.sol");

contract('Feedback basic test', (accounts) => {
  const enrollment = 5;

  let instance;  // The instance to use for each test
  beforeEach(async () => {
    instance = await Feedback.new();
  });

  it("should see 1 enrolled student", async () => {
    await instance.newEnrollment(accounts[1]);
    assert((await instance.studentsCount()), 1,
           "Singular student account enrollment failed");
  });

  it("should see " + enrollment.toString() + " enrolled students", async () => {
    for (var i = 1; i <= enrollment; i++) {
      instance.newEnrollment(accounts[i]);
    }
    assert.equal((await instance.studentsCount()).toNumber(), enrollment,
                 "Multiple student account enrollments failed");
  });

/*
  it("Testing instructor validation...", async () => {
    instance.validateInstructor({from: instructor});
    assert.equal((await instance.getInstructor()), instructor,
                 "Instructor is confirmed to be the account.");
  });
*/

  it("should see 1 question added with correct text", async () => {
    const qtext = "Do you like this class?";
    instance.newQuestion(144, qtext);
    assert.equal((await instance.questionsCount.call()).toNumber(), 1,
                 "Singular question addition failed");
    assert.equal((await instance.getQuestion(0)), qtext,
                 "Question text not preserved");
  });

  it("should see 3 questions added with correct texts", async () => {
    const qtexts = ["Do you like this class?", "How's the weather?", "Dinner?"];
    instance.newQuestion(144, qtexts[0]);
    instance.newQuestion(244, qtexts[1]);
    instance.newQuestion(50, qtexts[2]);
    assert.equal((await instance.questionsCount.call()).toNumber(), 3,
                 "Multiple question addition failed");
    for (var i = 0; i < qtexts.length; i++) {
      assert.equal((await instance.getQuestion(i)), qtexts[i],
                   "Question text not preserved");
    }
  });
});

contract('Feedback unit tests', (accounts) => {
  const instructor = accounts[0];
  const enrollment = 5;

  let instance;  // The instance to use for each test
  beforeEach(async () => {
    instance = await Feedback.new();
    for (var i = 1; i <= enrollment; i++) {
      instance.newEnrollment(accounts[i]);
    }
    const qtexts = ["Do you like this class?", "How's the weather?", "Dinner?"];
    instance.newQuestion(144, qtexts[0]);
    instance.newQuestion(244, qtexts[1]);
    instance.newQuestion(50, qtexts[2]);
  });

  // expect should be an array of form [[expect, qnum, responsetype], [...], ..]
  const expectFeedback = async (instance, expect) => {
    for (var test of expect) {
      assert.equal(
        (await instance.viewFeedback(test[1], test[2])).toNumber(), test[0],
        `Feedback for question ${test[1]}, responsetype ${test[2]} incorrect`);
    }
  }


  it("should see empty statistics for all three questions", async () => {
    const expect = [
      [0, 0, false],
      [0, 0, true],
      [0, 1, false],
      [0, 1, true],
      [0, 2, false],
      [0, 2, true],
    ];
    await expectFeedback(instance, expect);
  });

  it("should see 1 count for each (question, answer) pair", async () => {
    const expect = [
      [1, 0, false],
      [1, 0, true],
      [1, 1, false],
      [1, 1, true],
      [1, 2, false],
      [1, 2, true],
    ];
    for (var test of expect) {
      instance.giveFeedback(test[2], test[1], {from: accounts[1]});
    }
    await expectFeedback(instance, expect);
  });

  it("should see correct counts for each (question, answer) pair", async () => {
    const expect = [
      [2, 0, false],
      [3, 0, true],
      [5, 1, false],
      [4, 1, true],
      [1, 2, false],
      [0, 2, true],
    ];
    for (var test of expect) {
      for (var i = 0; i < test[0]; i++) {  // To account for the previous test
        instance.giveFeedback(test[2], test[1], {from: accounts[i + 1]});
      }
    }
    await expectFeedback(instance, expect);
  });
});
