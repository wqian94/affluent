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
});
