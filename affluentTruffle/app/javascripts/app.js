// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

const os = require('os');

// Import our contract artifacts and turn them into usable abstractions.
const feedback_artifacts = require('../../build/contracts/Feedback.json');

// Feedback is our usable abstraction, which we'll use through the code below.
const Feedback = contract(feedback_artifacts);
const gas = 4712388;  // Gas limit on transactions

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the Feedback abstraction for Use.
    Feedback.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      self.runApp();
    });
  },
  addQuestion: async (text) => {
    const instance = await Feedback.deployed();
    console.log(text);
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
  runApp: async () => {
    const instance = await Feedback.deployed();

    const ele = document.getElementById("myElement");

    var originX = null;
    var qnum = null;

    // handler to change to the professor view
    document.getElementById("profView").addEventListener("click", async (event) => {
      await window.App.profView(); 
    });

    // hanler to change to the student view
    document.getElementById("studentView").addEventListener("click", async (event) => {
      await window.App.studentView(); 
    });

    ele.addEventListener("drag", function(event) {
      var direction = Math.sign(event.clientX - originX);
    });

    ele.addEventListener("dragend", function(event) {
      if (null == qnum) {
        return;
      }

      var direction = Math.sign(event.clientX - originX);
      if (0 == direction) {
        return;
      }

      // Successfully registered response
      var response = (0 < direction ? true : false);
      instance.giveFeedback(response, qnum, {from: account, gas: gas});
      show_question(qnum + 1);
      qnum = null;
    });

    ele.addEventListener("dragstart", function(event) {
      event.dataTransfer.setDragImage(new Image(), 0, 0);
      originX = event.clientX;
    });

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
