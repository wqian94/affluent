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

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

// Syntactic sugar for document.getElementById
const get = function(id) {
  return document.getElementById(id);
};

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

      self.setup(self);
    });
  },
  setup: async (self) => {
    // handler to change to the professor view
    /*get("profView").addEventListener("click", async (event) => {
      await window.App.profView();
    });

    // handler to change to the student view
    get("studentView").addEventListener("click", async (event) => {
      await window.App.studentView();
    });*/

    await self.setupLogin(self);

    get("loginButton").click();
  },
  setupLogin: async (self) => {
    const instance = await Accounts.deployed();
    const nonce = parseInt(Math.random() * 2 ** 31);

    instance.Account().watch(async (error, result) => {
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
          } else {
            get("newUser").value = "Unavailable";
            alert("This class has reached its maximum capacity. " +
                  "Please contact the instructor for help.");
          }
        }
      }
    });

    const newUser_click = async (event) => {
      get("newUser").removeEventListener("click", newUser_click);
      get("newUser").setAttribute("disabled", "");
      instance.newAccount(nonce, {from: accounts[0], gas: gas});
    };
    get("newUser").addEventListener("click", newUser_click);

    get("existingUser").addEventListener("click", async (event) => {
      const address = get("existingUserAddress").value;
      var found = false;
      for (const acc of accounts) {
        if (address == acc) {
          account = address;
          get("existingUserAddress").value = "";
          get("loginModal").click();
          found = true;
          self.launch(self);
          break;
        }
      }
      if (!found) {
        alert(`"${address}" is not a registered address. Please try again.`);
      }
    });
  },
  launch: async (self) => {
    const ele = document.createElement("div");
    ele.className = "centered";
    ele.id = "summaryView";
    document.body.appendChild(ele);
    if (account == accounts[0]) {
      self.launchInstructor(self);
    } else {
      self.launchStudent(self);
    }
  },
  addQuestion: async (text) => {
    const instance = await Feedback.deployed();
    instance.newQuestion(144, text, {from: account, gas: gas});
  },
  getResponses: async () => {
    const instance = await Feedback.deployed();
    const question_count = await instance.questionsCount();
    var responses = [];
    for (var i = 0; i < question_count; i++) {
      responses.push([
        await instance.getQuestion(i),
        await instance.viewFeedback(i, false),
        await instance.viewFeedback(i, true),
      ]);
    }
    return responses;
  },
  tabulateResponses: async () => {
    const responses = await window.App.getResponses();
    const options = [false, true];
    const table = document.createElement("table");

    let tr, td;
    for (var q = 0; q < responses.length; q++) {
      tr = document.createElement("tr");
      if (q) {
        tr.style.borderTop = "1px solid black";
      }
      td = document.createElement("td");
      td.setAttribute("rowspan", options.length);
      td.textContent = (q + 1).toString() + ". " + responses[q][0];
      tr.appendChild(td);
      for (var opt = 0; opt < options.length; opt++) {
        if (opt) {
          tr = document.createElement("tr");
        }
        td = document.createElement("td");
        td.textContent = options[opt] + ": " + responses[q][opt + 1].toString();
        tr.appendChild(td);
        table.appendChild(tr);
      }
    }

    return table;
  },
  profView: async () => {
    const ele = document.getElementById("myElement");
    const view = document.getElementById("statsViewPort");
    ele.style.display = "none";
    view.style.display = "block";
    
    const responses = await window.App.getResponses();

    for (let i = 0; i < responses.length; i++) {
      let this_question = responses[i][0]
      let false_num = parseInt(responses[i][1].toString());
      let true_num = parseInt(responses[i][2].toString());

      console.log(false_num, true_num);
      let this_total = false_num + true_num;
      let true_percent = true_num / this_total;
      let false_percent = false_num / this_total;
      console.log(this_question);
      console.log(true_percent);
      console.log(false_percent);

    }
  },
  studentView: async () => {
    const ele = document.getElementById("myElement");
    const view = document.getElementById("statsViewPort");
    ele.style.display = "";
    view.style.display = "none";
  },
  launchInstructor: async (self) => {
    const instance = await Feedback.deployed();

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

    get("addQuestionModalSubmit").addEventListener("click", async (event) => {
      const questions = get("addQuestionModalText").value.split("\n");
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
      get("action").textContent = actionResponseString;
      get("action").addEventListener("click", actionToResponse);
    };
    get("action").addEventListener("click", actionToSummary);

    const buffer = Math.max(50, 0.05 * window.screen.width);
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
      const x = getDefined(
        function() { return event.clientX; },
        function() { return event.changedTouches[0].pageX; });
      const direction = getDir(x);
      if (0 == direction) {
        ele.style.background = 'white';
        return;
      }
      const offset = Math.max(0, Math.abs(x - originX) - buffer);
      const ratio = Math.min(
        1, offset / Math.max(200, 0.1 *  window.screen.width));
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
        function() { return event.clientX; },
        function() { return event.changedTouches[0].pageX; });
      const direction = getDir(x);
      if (0 == direction) {
        return;
      }

      // Successfully registered response
      const response = (0 < direction ? true : false);
      instance.giveFeedback(response, qnum, {from: account, gas: gas});
      show_question(qnum + 1);
      qnum = null;
      originX = null;
    };

    const dragstart = function(event) {
      const x = getDefined(
        function() { return event.clientX; },
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

    function show_question(qn) {
      ele.textContent = "Waiting for more questions...";
      async function pop() {
        if (qn < (await instance.questionsCount())) {
          instance.popQuestion(qn, {from: account, gas: gas});
        } else {
          setTimeout(pop, 1000);
        }
      }
      pop();

      instance.Question().watch(async (error, result) => {
        if (!error) {
          ele.textContent = result.args.text;
          qnum = qn;
        }
      });
    }
    instance.newEnrollment(account, {from: account, gas: gas});
    show_question(0);
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
