import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import feedback_artifacts from './Feedback.json';

(function() {
  var Feedback = contract(feedback_artifacts);

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
  });

  var class_name = "CS 144r/244r";

  var questions = [
      `Was the lecture entertaining?`,
      `Was the lecture valuable?`,
      `Was the lecturer engaging?`,
      `Was the pace too slow?`,
      `Did you just use your computer?`,
  ];

  var ele = document.getElementById("myElement");
  var originX = null;

  ele.addEventListener("drag", function(event) {
    var direction = Math.sign(event.clientX - originX);
  });

  ele.addEventListener("dragstart", function(event) {
    event.dataTransfer.setDragImage(new Image(), 0, 0);
    originX = event.clientX;
  });

  function show_question(qn) {
    if (questions.length <= qn) {
      ele.textContent = "Done!";
      return;
    }

    var question = questions[qn];
    ele.textContent = question;
      // var myElement = document.getElementById('myElement');
      // myElement.textContent = question
      // // create a simple instance
      // // by default, it only adds horizontal recognizers
      // var mc = new Hammer(myElement);
      //
      // // listen to events...
      // mc.on("panleft panright", function(ev) {
      //     answer = ev.type == "panleft" ? "no" : "yes"
      //     console.log("test " + qn.toString() + ", " + question + " " + answer);
      //     if (qn + 1 < questions.length) {
      //         show_question(qn + 1);
      //     }
      // });
    var dragend = function(event) {
      var direction = Math.sign(event.clientX - originX);
      if (0 == direction) {
        return;
      }

      // Successfully registered response
      var response = (0 < direction ? true : false);
      console.log(question + ": " + response);
      ele.removeEventListener("dragend", dragend);
      show_question(qn + 1);
    };
    ele.addEventListener("dragend", dragend);
  }

  //show_question(0);
  var questionID = 0;
  Feedback.Question(async (error, result) => {
    if (error) {
      return;
    }

    console.log(result);
  });
})();

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 Feedback, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
  }

  App.start();
});
