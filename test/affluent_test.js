const contracts = {
  Affluent: artifacts.require('../contracts/Affluent.sol'),
  Class: artifacts.require('../contracts/Class.sol'),
  Session: artifacts.require('../contracts/Session.sol'),
};

// Test the application under 1 main Affluent contract, simulating deployment
contract('Testing affluent application functions', (accounts) => {
  let instance;
  beforeEach(async () => {
    instance = await contracts.Affluent.deployed();
  });

  let course_addrs = [];
  let course_ctr = 0;

  // Add 2 courses for further testing and validate the instructor addresses
  it("Create CS144 with accounts[1] as the instructor", async () => {
    let info = {"label": "CS144/244R", 
                "title": "Network Design Projects",
                "term": "Spring 2018",
                "instructor": accounts[1] };

    let new_cls = await contracts.Class.new(instance.address, info.label,
      info.term, info.title, {from: info.instructor}); 

    course_ctr++;
    course_addrs.push({"info": info, "addr": new_cls.address});
  });

  it("Create CS50 with accounts[2] as the instructor", async () => {
    let info = {"label": "CS50", 
                "title": "Introduction to Computer Science",
                "term": "Spring 2018",
                "instructor": accounts[2] };

    let new_cls = await contracts.Class.new(instance.address, info.label,
      info.term, info.title, {from: info.instructor}); 

    course_ctr++;
    course_addrs.push({"info": info, "addr": new_cls.address});
  });


  // Approve courses to the main list and check their information is correct
  it("Administrator approves the courses which then enter the main list", async () => {
    course_addrs.forEach(async (val) => {
      await instance.activate(val.addr, {from: accounts[0]});
    });

    let num_classes = await instance.numClasses.call();
    assert.equal(num_classes, course_ctr, 
      "Amount of admin-approved courses is not correct");
  });
  
  it("Validate that the approved courses have the correct information", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;

      let cls_addr = await instance.getClass.call(index);
      assert.equal(cls_addr, addr, 
        `${info.label}: class contract address does not match earlier stored record`);

      let cls_instance = await contracts.Class.at(cls_addr);
      let cls_instructor = await cls_instance.getInstructor.call();

      assert.equal(cls_instructor, info.instructor,
        `${info.label}: failed to set class instructor to the address of the sender`);
      assert.equal(await cls_instance.getLabel.call(), info.label,
        `${info.label}: failed to set the correct course label`);
      assert.equal(await cls_instance.getTerm.call(), info.term,
        `${info.label}: failed to set the correct course term`);
      assert.equal(await cls_instance.getTitle.call(), info.title,
        `${info.label}: failed to set the correct course title`);
    });
  });

  // Test instructor activation of course contracts
  it("Check that courses are inactive, then test activation function", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      assert.equal(await cls_instance.isActive.call(), false, 
        `${info.label}: class contract should be inactive on initialization`);

      await cls_instance.activate({from: info.instructor});       

      assert.equal(await cls_instance.isActive.call(), true, 
        `${info.label}: class contract failed to be activated by the instructor`);
    });
  });

  it("Test deactivation of the courses, then reactivate for later tests", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      // wait for activation
      let active;
      while (!active)
        active = await cls_instance.isActive.call();

      assert.equal(await cls_instance.isActive.call(), true, 
        `${info.label} is inactive`);
  
      await cls_instance.deactivate({from: info.instructor});
      assert.equal(await cls_instance.isActive.call(), false, 
        `Failed to deactivate ${info.label}`);

      await cls_instance.activate({from: info.instructor});       
      assert.equal(await cls_instance.isActive.call(), true, 
        `Failed to reactivate ${info.label}`);

    });
  });

  it("Enroll 5 students in each course, then individually verify their enrollment", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      let start = 3 + (5 * index);
      let end = start + 5
      for (let i = start; i < end; i++) {
        await cls_instance.enroll(accounts[i], {from: info.instructor});       
        assert.equal(await cls_instance.isEnrolled.call(accounts[i]), true,
          `Failed to enroll ${accounts[i]} in ${info.label}`);
      }
    });
  });

  it("Test that the instructor can drop a student from a course", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      let start = 3 + (5 * index);
      let drop = start + 4

      let enrolled;
      while (!enrolled)
        enrolled = await cls_instance.isEnrolled.call(accounts[drop]);
  
      assert.equal(await cls_instance.isEnrolled.call(accounts[drop]), true, 
        `${accounts[drop]} is not enrolled in ${info.label}`);

      await cls_instance.drop(accounts[drop], {from: info.instructor});
      
      assert.equal(await cls_instance.isEnrolled.call(accounts[drop]), false,
        `Failed to drop ${accounts[drop]} from ${info.label}`);
    });
  });

  var sessions_ctr = 0;
  it("Create a feedback session for each course", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      assert.equal(await cls_instance.numSessions.call(), 0, 
        `${info.label}: course has an existing question`);

      await cls_instance.newSession({from: info.instructor});
      sessions_ctr++;

      assert.equal(await cls_instance.numSessions.call(), 1, 
        `${info.label}: failed to add new session to the course`);
    });
  });

  it("Test the unlock and lock functionalities of the sessions", async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      let num_sessions = 0;
      while (num_sessions < 1) 
        num_sessions = await cls_instance.numSessions.call();

      let sess_index = sessions_ctr - 1;
      let sess_addr = await cls_instance.getSession.call(0);

      let sess_instance = await contracts.Session.at(sess_addr);

      assert.equal(await sess_instance.isLocked.call(), true,
        `${info.label}: course session was already unlocked`);

      await sess_instance.unlock({from: info.instructor});
      assert.equal(await sess_instance.isLocked.call(), false,
        `${info.label}: failed to unlock course session`);

      await sess_instance.lock({from: info.instructor});
      assert.equal(await sess_instance.isLocked.call(), true,
        `${info.label}: failed to lock course session`);

      await sess_instance.unlock({from: info.instructor});
      assert.equal(await sess_instance.isLocked.call(), false,
        `${info.label}: failed to unlock course session`);
    }); 
  });

  var questions = ["Did you enjoy this lecture?", "Was the pace too fast?",
    "Was it too slow?", "Did the readings help you understand the lecture?",
    "Did you do the readings?", "Will you attend next lecture?"]
  it(`Add ${questions.length} questions to each of the class contracts`, async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);
      questions.forEach(async (question) => {
        await cls_instance.newQuestion(question, {from: info.instructor});

      assert.equal(await cls_instance.numQuestions.call(), questions.length,
        `${info.label}: failed to add all questions to the class contract`);
      });
    });
  });

  it(`Enqueue these questions into the session contract of the class`, async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      let sess_index = sessions_ctr - 1;
      let sess_addr = await cls_instance.getSession.call(0);

      let sess_instance = await contracts.Session.at(sess_addr);

      let num_questions = await cls_instance.numQuestions.call();
      let num_ctr = num_questions.toNumber();

      for (let i = 0; i < num_ctr; i++) {
        await sess_instance.addQuestion(i, {from: info.instructor});        
      }

      let added_num = await sess_instance.numQuestions.call({from: info.instructor});
      assert.equal(added_num.toNumber(), num_questions.toNumber(),
        `${info.label}: failed to add every class question to the session`);
    });
  });

  it(`Enrolled students give feedback and test questions are correct`, async () => {
    course_addrs.forEach(async (val, index) => {
      let info = val.info;
      let addr = val.addr;
      let cls_instance = await contracts.Class.at(addr);

      let sess_num_big = await cls_instance.numSessions.call();
      let sess_index = sess_num_big.toNumber() - 1;

      let sess_addr = await cls_instance.getSession.call(sess_index);

      let sess_instance = await contracts.Session.at(sess_addr);

      let start = 3 + (5 * index);
      let end = start + 4

      let indices = {}
      cls_instance.Question().watch(async (err, result) => {
        if (!err) {
          assert(questions[indices[result.args.student]] == result.args.text);
          indices[result.args.student]++;
          sess_instance.submitResponse(indices[result.args.student] % 2, {from: result.args.student});
        }
      });

      // accounts[i] is an enrolled student in the course
      for (let i = start; i < end; i++) {
        let student = accounts[i];
        indices[student] = 0;
        sess_instance.attend({from: student});
/*
        let questions_check = [...questions]; 

        let num_questions_big = await sess_instance.numQuestions.call({from: info.instructor});
        let num_questions = num_questions_big.toNumber();
        for (let j = 0; j < num_questions; j++) {
          let qindex = await sess_instance.getQuestionIndex.call(j, {from: info.instructor});
          //let text = await cls_instance.getQuestionText.call(qindex.toNumber());
/*
          let test_index = questions_check.indexOf(text);
          assert.isAtLeast(test_index, 0, 
            `${info.label}: ${accounts[i]} got a question text that was not in the added list`); 

          questions_check = questions_check.splice(test_index, 1);
        }
*/

        //assert.equal(questions_check, [], 
        //  `${info.label}: ${accounts[i]} did not observe all added questions`); 
      }
    });
  });
});
