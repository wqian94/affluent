// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

const os = require('os');

{
// Import our contract artifacts and turn them into usable abstractions.
const feedback_artifacts = require('../../build/contracts/Feedback.json');
const accounts_artifacts = require('../../build/contracts/Accounts.json');

// Feedback is our usable abstraction, which we'll use through the code below.
const Feedback = contract(feedback_artifacts);
const Accounts = contract(accounts_artifacts);

const gas = 4712388;  // Gas limit on transactions

var feedbackContracts = {};

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

var isAddress = function (address) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        // check if it has the basic requirements of an address
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        // If it's all small caps or all all caps, return true
        return true;
    } else {
        // Otherwise check each case
        return isChecksumAddress(address);
    }
};

// Syntactic sugar for document.getElementById
const get = function(id) {
  return document.getElementById(id);
};

const plotData = [];
const plotLayout = {
  title: 'CS 144r/244r',
  showlegend: true,
  xaxis: {
    title: 'Day',
  },
  yaxis: {
    title: '% Yes Responses',
  },
};

// Data in {day: ratio} form
const makePlotQuestion = function(text, data) {
  const q = {
    x: [],
    y: [],
    mode: 'lines+markers',
    connectgaps: true,
    name: text,
    line: {shape: 'spline'},
  };
  for (const day in data) {
    q.x.push(day);
    q.y.push(data[day]);
  }
  return q;
};

const today = 6;

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the Feedback abstraction for Use.
    Feedback.setProvider(web3.currentProvider);
    Accounts.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(async (err, accs) => {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      console.log("Account 0 address:");
      console.log(accounts[0]);

      self.setup(self);
    });
  },
  setup: async (self) => {
    await self.setupLogin(self);

    get("loginButton").click();
  },
  setupLogin: async (self) => {
    const instance = await Accounts.deployed();
    console.log("Account contract instance address:");
    console.log(instance.address);
    const nonce = parseInt(Math.random() * 2 ** 31);

    // listener for the student event
    instance.Student().watch(async (error, result) => {
      if (!error) {
        const tx_nonce = result.args.nonce.toNumber();
        const i = result.args.index.toNumber();
        if (tx_nonce == nonce) {
          if (i < accounts.length) {
            get("newUser").type = "text";
            get("newUser").value = accounts[i];
            get("newUser").removeAttribute("disabled");
            get("newUser").setAttribute("readonly", "");
            get("newUser").style.backgroundColor = "transparent";
            get("newUser").style.border = "0px";
            get("newUser").style.color = "rgba(0, 0, 0, 0.6)";
            get("newUser").style.textAlign = "center";
            get("newUser").style.width = "100px";
            get("newUser").setSelectionRange(0, accounts[i].length);
            get("newUser").parentNode.childNodes[0].textContent =
              "Your address is:";
            console.log("Enrolled new student, " + i);
            instance.registerStudent(accounts[i], {from: accounts[0], gas: gas});
/*
            (await Feedback.deployed()).newEnrollment(
              accounts[i], {from: accounts[0], gas: gas});
*/
          }
        } else {
          get("newUser").value = "Unavailable";
          alert("This class has reached its maximum capacity. " +
                "Please contact the instructor for help.");
        }
      }
    });

    // listener for the instructor event
    instance.Instructor().watch(async (error, result) => {
      if (!error) {
        const tx_nonce = result.args.nonce.toNumber();
        const i = result.args.index.toNumber();
        const name = result.args.name;
        const course = result.args.course;
        const email = result.args.email;
        if (tx_nonce == nonce) {
          if (i < accounts.length) {
            console.log(accounts[i]);
            // display the new address then register the info into the main smart contract
            $("#regWarning").text("Save this account address for log in: " + accounts[i]);
            $("#submitInstructorInfo").hide()
            console.log("registered new instructor, " + i);
            instance.registerInstructor(name, course, email, accounts[i], {from: accounts[0], gas: gas});
          }
        } else {
          get("newUser").value = "Unavailable";
          alert("This class has reached its maximum capacity. " +
                "Please contact the instructor for help.");
        }
      }
    });

    $("#loginModal").on("shown.bs.modal", async (event) => {
      get("existingUserAddress").focus();
    });

    const newUser_click = async (event) => {
      get("newUser").removeEventListener("click", newUser_click);
      get("newUser").setAttribute("disabled", "");
      instance.newStudent(nonce, {from: accounts[0], gas: gas});
    };

    // function for registering new instructors with the main contract
    const newInstructor_click = async(event) => {
      $("#loginModal").modal("hide");
      $("#instructorModal").modal("show");
    };

    // handler for the instructor registration form
    const submitInstructorInfo = async(event) => {
      var name = $("#instructorName").val();
      var course = $("#instructorCourse").val();
      var email = $("#instructorEmail").val();

      if (name.split(" ").filter(x => x != "").length < 2) {
        $("#regWarning").text("Please enter your full name.");
      } else if (!course) {
        $("#regWarning").text("Please enter your course.");
      } else if (!email) {
        $("#regWarning").text("Please enter your official email for verification.");
      } else {
        $("#regWarning").text("Submitting registration, please wait...");
        instance.newInstructor(nonce, name, course, email, {from: accounts[0], gas: gas});
      }
    };

    get("newUser").addEventListener("click", newUser_click);
    get("newInstructor").addEventListener("click", newInstructor_click);
    get("submitInstructorInfo").addEventListener("click", submitInstructorInfo);
    // set enter key to submit instructor registration
    get("instructorRegistration").addEventListener("keydown", async (event) => {
      if ("Enter" == event.key) {
        get("submitInstructorInfo").click();
      }
    });

    get("returnToLogin").addEventListener("click", async (event) => { 
      $("#instructorModal").modal("hide"); $("#loginModal").modal("show"); });

    // binding login function to log in button
    get("existingUser").addEventListener("click", async (event) => {
      const address = get("existingUserAddress").value;
      if (isAddress(address)) {
        var isStudent = await instance.isStudent.call(address);
        var isInstructor = await instance.isInstructor.call(address);
        console.log(isStudent, isInstructor);
        if (isStudent || isInstructor) {
          get("existingUserAddress").value = "";
          $("#loginModal").modal("hide");
          account = address;
        }
        if (isStudent) {
          self.launch(self, "student");
        } else if (isInstructor) {
          self.launch(self, "instructor");
        } else {
          alert(`"${address}" is not a registered address. Please try again.`);
        }
      } else {
        alert(`You must enter a valid Ethereum public address.`);
      }
    });
    get("existingUserAddress").addEventListener("keydown", async (event) => {
      if ("Enter" == event.key) {
        get("existingUser").click();
      }
    });
  },
  replot: async (self) => {
    Plotly.newPlot('summaryView', plotData, plotLayout);
  },
  addQuestion: async (text) => {
    const instance = await Feedback.deployed();
    const self = window.App;
    instance.newQuestion(144, text, {from: account, gas: gas});
  },
  getResponses: async () => {
    const instance = await Feedback.deployed();
    const question_count = await instance.questionsCount();
    const responses = [];
    for (var i = 0; i < question_count; i++) {
      responses.push([
        await instance.getQuestion(i),
        (await instance.viewFeedback(i, false)).toNumber(),
        (await instance.viewFeedback(i, true)).toNumber(),
      ]);
    }
    return responses;
  },
  ratioToPercent: function(ratio) {  // Converts a ratio to a percent
    return parseInt(10000 * ratio) / 100;
  },
  populateSummary: async (self) => {
    const responses = await self.getResponses();
    var qnum = 0;
    plotData.splice(0, plotData.length);
    for (const r of responses) {
      const data = {};
      for (var i = 1; i < today; i++) {
        data[i] = self.ratioToPercent(Math.abs(Math.sin(
          1 + i * qnum * .1 + Math.sqrt(i + qnum))));
      }
      if (r[1] + r[2] > 0) {
        //console.log(r);
        data[today] = self.ratioToPercent(r[2] / (r[1] + r[2]));
      } else {
        data[today] = 0.0;
      }
      plotData.push(makePlotQuestion(r[0], data));
      qnum++;
    }
  },
  launch: async (self, type) => {
    self.launchSummary(self);
    if (type == "instructor") {
      self.launchInstructor(self);
    } else if (type == "student") {
      self.launchStudent(self);
    }
  },
  launchInstructor: async (self) => {
    const instance = await Feedback.deployed();
    console.log("Feedback contract instance address, launching instructor:");
    console.log(instance.address);

    get("action").textContent = "Add Questions";
    get("action").style.display = "inline-block";
    get("action").setAttribute("data-toggle", "modal");
    get("action").setAttribute("data-target", "#addQuestionModal");

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "addQuestionModal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML =
      '<div class="modal-dialog" role="document">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h5 class="modal-title">Adding questions</h5>' +
            '<button type="button" class="close" data-dismiss="modal"' +
              '<span>&times;</span>' +
            '</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div>Add any number of questions, separated by a newline</div>' +
            '<div>' +
              '<textarea id="addQuestionModalText" autofocus></textarea>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button class="btn btn-primary" data-dismiss="modal" ' +
                'id="addQuestionModalSubmit" type="button">' +
              'Submit' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    $("#addQuestionModal").on("shown.bs.modal", async (event) => {
      get("addQuestionModalText").focus();
    });

    get("addQuestionModalSubmit").addEventListener("click", async (event) => {
      const questions = get("addQuestionModalText").value.split("\n");
      get("addQuestionModalText").value = "";
      for (const q of questions) {
        if (q.length) {
          self.addQuestion(q);
        }
      }
    });

    get("summaryView").style.display = "block";
  },
  launchStudent: async (self) => {
    const instance = await Feedback.deployed();
    console.log("Feedback contract instance address, launching student:");
    console.log(instance.address);

    const actionResponseString = "See Questions";
    const actionSummaryString = "View Summary";
    get("action").textContent = actionSummaryString;
    get("action").style.display = "inline-block";

    const ele = document.createElement("div");
    ele.className = "centered";
    ele.id = "responseCanvas";
    ele.setAttribute("draggable", "true");
    document.body.appendChild(ele);

    const actionToResponse = async (event) => {  // Toggles the response view on
      get("action").removeEventListener("click", actionToResponse);
      get("summaryView").style.display = "none";
      get("responseCanvas").style.display = "block";
      get("action").textContent = actionSummaryString;
      get("action").addEventListener("click", actionToSummary);
    };
    const actionToSummary = async (event) => {  // Toggles the summary view on
      get("action").removeEventListener("click", actionToSummary);
      get("responseCanvas").style.display = "none";
      get("summaryView").style.display = "block";
      self.replot();
      get("action").textContent = actionResponseString;
      get("action").addEventListener("click", actionToResponse);
    };
    get("action").addEventListener("click", actionToSummary);

    const buffer = Math.max(50, 0.05 * window.innerWidth);
    var originX = null;
    var qnum = null;

    const getDefined = function() {
      for (const f of arguments) {
        const ele = f();
        if ('undefined' != typeof ele) {
          return ele;
        }
      }
      return null;
    };

    const getDir = function(x) {
      const diff = x - originX;
      const direction = Math.sign(diff);
      return direction * Math.max(0, Math.abs(diff) - buffer);
    };

    const drag = function(event) {
      //console.log(event.screenX, window.innerWidth, originX);
      const x = getDefined(
        function() { return event.screenX; },
        function() { return event.changedTouches[0].pageX; });
      const direction = getDir(x);
      if (0 == direction) {
        ele.style.background = 'white';
        return;
      }
      const offset = Math.max(0, Math.abs(x - originX) - buffer);
      const ratio = Math.min(
        1, offset / Math.max(200, 0.1 *  window.innerWidth));
      const clr_neutral = `rgba(255, 255, 255, ${ratio})`;
      const clr_true = `rgba(66, 218, 111, ${ratio})`;
      const clr_false = `rgba(255, 105, 97, ${ratio})`;
      if (direction < 0) {  // false
        ele.style.background =
          `linear-gradient(to right, ${clr_false}, ${clr_neutral})`;
      } else {  // true
        ele.style.background =
          `linear-gradient(to left, ${clr_true}, ${clr_neutral})`;
      }
    };

    const dragend = function(event) {
      ele.style.background = 'white';
      if (null == qnum) {
        return;
      }

      const x = getDefined(
        function() { return event.screenX; },
        function() { return event.changedTouches[0].pageX; });
      const direction = getDir(x);
      if (0 == direction) {
        return;
      }

      // Successfully registered response
      const response = (0 < direction ? true : false);
      instance.giveFeedback(response, qnum, {from: account, gas: gas});
      show_question();
      qnum = null;
      originX = null;
    };

    const dragstart = function(event) {
      const x = getDefined(
        function() { return event.screenX; },
        function() { return event.changedTouches[0].pageX; });
      originX = x;
      if (event.dataTransfer) {
        event.dataTransfer.setDragImage(new Image(), 0, 0);
      }
    };

    ele.addEventListener("drag", drag);
    ele.addEventListener("dragend", dragend);
    ele.addEventListener("dragstart", dragstart);
    ele.addEventListener("touchcancel", function() {
      originX = null;
    });
    ele.addEventListener("touchend", dragend);
    ele.addEventListener("touchmove", drag);
    ele.addEventListener("touchstart", dragstart);

    function show_question() {
      ele.textContent = "Waiting for more questions...";
      async function pop() {
        if ((await instance.hasNextQuestion({from: account}))) {
          instance.popQuestion({from: account, gas: gas});
        } else {
          setTimeout(pop, 1000);
        }
      }
      pop();

      instance.Question().watch(async (error, result) => {
        if (!error && account == result.args.target) {
          ele.textContent = result.args.text;
          qnum = result.args.qnum.toNumber();
        }
      });
    }
    show_question();
  },
  launchSummary: async (self) => {
    const instance = await Feedback.deployed();
    const ele = document.createElement("div");
    ele.className = "centered";
    ele.id = "summaryView";
    document.body.appendChild(ele);
    const draw = async () => {
      self.populateSummary(self).then(() => {
        self.replot(self);
      });
    };
    instance.SummaryUpdated().watch(async (error, result) => {
      if (!error) {
        draw();
      }
    });
    draw();
  },
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  /*
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 Feedback, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }
  */

  window.web3 = new Web3(new Web3.providers.HttpProvider(
    "http://" + location.hostname + ":8545"));

  App.start();
});
}
