// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';

const os = require('os');

{
  //////////////////////////////////////////////////////////////////////////////
  //
  // Imports and groundwork
  //
  //////////////////////////////////////////////////////////////////////////////

  // Import our contract artifacts and turn them into usable abstractions.
  const artifacts = {
    Affluent: require('../../build/contracts/Affluent.json'),
    Class: require('../../build/contracts/Class.json'),
    Session: require('../../build/contracts/Session.json'),
  };

  // Affluent is our usable abstraction, which we'll use through the code below.
  const contracts = {
    Affluent: contract(artifacts.Affluent),
    Class: contract(artifacts.Class),
    Session: contract(artifacts.Session),
  };

  //////////////////////////////////////////////////////////////////////////////
  //
  // Variables
  //
  //////////////////////////////////////////////////////////////////////////////

  var accounts;
  var app;
  const gas = 4712388;  // Gas limit on transactions
  const instances = {};
  const plotData = [];
  const plotLayout = {
    title: null,
    showlegend: true,
    xaxis: {
      title: 'Session',
    },
    yaxis: {
      title: '% Yes Responses',
    },
  };
  const views = [];

  //////////////////////////////////////////////////////////////////////////////
  //
  // Additional private-scope setup for variables
  //
  //////////////////////////////////////////////////////////////////////////////

  {
    for (const id of ['viewMain', 'viewResponse', 'viewSummary']) {
      const ele = document.createElement('view');
      ele.id = id;
      views.push(ele);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Private-scope functions
  //
  //////////////////////////////////////////////////////////////////////////////

  // Generates a text description of the class
  const classDescription = async (cls) => {
    return `${await cls.getLabel.call()}: ` +
      `${await cls.getTitle.call()}<br />` +
      `Instructor: ${await cls.getInstructor.call()}<br />` +
      `Term: ${await cls.getTerm()}`;
  };

  const createModal = function(title, body, footer='') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML =
      '<div class="modal-dialog" role="document">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            `<h5 class="modal-title">${title}</h5>` +
            '<button type="button" class="close" data-dismiss="modal"' +
              '<span>&times;</span>' +
            '</button>' +
          '</div>' +
          `<div class="modal-body">${body}</div>` +
          `<div class="modal-footer">${footer}</div>` +
        '</div>' +
      '</div>';
    return modal;
  };
    
  // Syntactic sugar for document.getElementById
  const get = function(id) {
    return document.getElementById(id);
  };

  // Returns whether the given address is among the list of accounts
  const isMyAccount = function(address) {
    return 0 <= accounts.indexOf(address);
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

  const setup = async () => {
    // Bootstrap the contracts for Use.
    for (const key in contracts) {
      contracts[key].setProvider(web3.currentProvider);
    }
    instances.Affluent = await contracts.Affluent.deployed();

    // Set up views
    for (const ele of views) {
      document.body.appendChild(ele);
    }
    setupMain();

    viewMain();
  };

  const setupMain = async () => {
    const view = get('viewMain');
    for (const child of view.childNodes) {
      view.removeChild(child);
    }

    // Admin UI
    const amAdmin = isMyAccount(await instances.Affluent.admin());
    if (amAdmin) {
      const ele = document.createElement('div');
      ele.innerHTML = '<div class="modal-dialog">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h3 class="modal-title">Administrative View</h3>' +
          '</div>' +
          '<div class="modal-body">' +
            '<button id="approveClassButton">Approve classes</button>' +
          '</div>' +
        '</div>' +
      '</div>';
      view.appendChild(ele);
      const modal = createModal(
        'Approve a new class',
        '<div>Class address: <input type="text" id="approveClassAdr" /></div>' +
        '<div id="approveClassInfo"></div>',
        '<button id="approveClassActionApprove">Approve class</button>' +
        '<button id="approveClassActionReject">Reject class</button>'
      );
      document.body.appendChild(modal);

      var currentClass = null;

      get('approveClassButton').addEventListener('click', async (event) => {
        $(modal).modal('show');
        currentClass = null;
        get('approveClassAdr').value = '';
        get('approveClassInfo').innerHTML = '';
        get('approveClassActionApprove').setAttribute('disabled', '');
        get('approveClassActionReject').setAttribute('disabled', '');
      });
      const onClassAddressChange = async (event) => {
        try{
          currentClass = await contracts.Class.at(event.target.value);
          get('approveClassInfo').innerHTML =
            await classDescription(currentClass);
          get('approveClassActionApprove').removeAttribute('disabled');
          get('approveClassActionReject').removeAttribute('disabled');
        } catch (e) {
          currentClass = null;
          get('approveClassInfo').innerHTML = '';
          get('approveClassActionApprove').setAttribute('disabled', '');
          get('approveClassActionReject').setAttribute('disabled', '');
        }
      };
      get('approveClassAdr').addEventListener('change', onClassAddressChange);
      $(modal).on("shown.bs.modal", async (event) => {
        get("approveClassAdr").focus();
      });

      get('approveClassActionApprove').addEventListener(
        'click', async (event) => {
          if (currentClass) {
            instances.Affluent.activate(
              currentClass.address,
              {from: await instances.Affluent.admin(), gas: gas});
          }
          get('approveClassAdr').value = '';
          $(modal).modal('hide');
      });
      get('approveClassActionReject').addEventListener(
        'click', async (event) => {
          // TODO: remove class from consideration permanently unrevokably
          get('approveClassAdr').value = '';
          $(modal).modal('hide');
      });
      setTimeout(function(){ele.className = 'render';}, 30);
    }

    const allTaughtClasses = [];
    const allEnrolledClasses = [];
    const numClasses = await instances.Affluent.numClasses.call();
    for (var i = 0; i < numClasses; i++) {
      const cls = await contracts.Class.at(
        await instances.Affluent.getClass.call(i));
      if (isMyAccount(await cls.getInstructor.call())) {
        allTaughtClasses.unshift(cls);
      }
      for (const acct of accounts) {
        if (await cls.isEnrolled.call(acct)) {
          allEnrolledClasses.unshift(cls);
        }
      }
    }

    // Student UI
    if ((!amAdmin && !allTaughtClasses.length) || allEnrolledClasses.length) {
      // Use allEnrolledClasses to list classes
      const ele = document.createElement('div');
      ele.innerHTML = '<div class="modal-dialog">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h3 class="modal-title">Student View</h3>' +
          '</div>' +
          '<div class="modal-body">' +
          '</div>' +
        '</div>' +
      '</div>';
      view.appendChild(ele);
      setTimeout(function(){ele.className = 'render';}, 30);
    }

    // Instructor UI
    if (true || allTaughtClasses.length) {
      const currentClassAddresses = [];
      for (const acct of accounts) {
        const cls_addr = await instances.Affluent.getClassOf.call(acct);
        if (0 < cls_addr) {
          currentClassAddresses.unshift(cls_addr);
        }
      }

      // Use allTaughtClasses to list classes
      const ele = document.createElement('div');
      ele.innerHTML = '<div class="modal-dialog">' +
        '<div class="modal-content">' +
          '<div class="modal-header">' +
            '<h3 class="modal-title">Instructor View</h3>' +
          '</div>' +
          '<div class="modal-body">' +
            '<button id="createClassButton">Create a class</button>' +
            '<hr />' +
            '<div id="activeClasses">' +
              '<h5>Active classes</h5>' +
            '</div>' +
            '<hr />' +
            '<div id="inactiveClasses">' +
              '<h5>Inactive classes</h5>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
      view.appendChild(ele);

      const manageModal = createModal(
        'Manage a class',
        '<div id="manageClassBody"></div>',
        '<div id="manageClassFooter"></div>'
      );
      document.body.appendChild(manageModal);
      const manageClass = async (cls) => {
      };

      for (const cls_addr of currentClassAddresses) {
        const cls = await contracts.Class.at(cls_addr);
        const ele = document.createElement('button');
        ele.innerHTML = await classDescription(cls);
        ele.addEventListener('click', async (event) => {
        });
        get('activeClasses').appendChild(ele);
      }

      for (const cls of allTaughtClasses) {
        if (0 <= currentClassAddresses.indexOf(cls.address)) {
          continue;
        }
        const ele = document.createElement('button');
        ele.innerHTML = await classDescription(cls);
        get('inactiveClasses').appendChild(ele);
      }

      const createClassModal = createModal(
        'Create a new class',
        '<div>Instructor Address: ' +
          '<select id="createClassInstructor" required></select>' +
        '</div>' +
        '<div>Class Label: ' +
          '<input id="createClassLabel" placeholder="CS244r" required type="text" />' +
        '</div>' +
        '<div>Class Title: ' +
          '<input id="createClassTitle" placeholder="Network Design Projects" required type="text" />' +
        '</div>' +
        '<div>Class Term: ' +
          '<input id="createClassTerm" placeholder="Spring 2018" required type="text" />' +
        '</div>' +
        '<div id="createClassNotes"></div>',
        '<button id="createClassAction">Submit class for approval</button>'
      );
      document.body.appendChild(createClassModal);

      for (const acct of accounts) {
        const ele = document.createElement('option');
        ele.value = acct.toString();
        ele.textContent = acct.toString();
        get('createClassInstructor').appendChild(ele);
      }

      get('createClassButton').addEventListener('click', async (event) => {
        $(createClassModal).modal('show');
      });

      get('createClassAction').addEventListener('click', async (event) => {
        const instructor = get('createClassInstructor').value;  // TODO: validate instructor address
        const label = get('createClassLabel').value;
        const title = get('createClassTitle').value;
        const term = get('createClassTerm').value;

        get('createClassNotes').innerHTML = '';

        var valid = true;
        if (!instructor.length) {
          get('createClassNotes').innerHTML += 'Invalid instructor address.<br />';
          valid = false;
        }
        if (!label.length) {
          get('createClassNotes').innerHTML += 'Invalid class label.<br />';
          valid = false;
        }
        if (!title.length) {
          get('createClassNotes').innerHTML += 'Invalid class title.<br />';
          valid = false;
        }
        if (!term.length) {
          get('createClassNotes').innerHTML += 'Invalid class term.<br />';
          valid = false;
        }

        if (valid) {
          try{
            const instance = await contracts.Affluent.deployed();
            const cls = await contracts.Class.new(
              instance.address, label, term, title,
              {from: instructor, gas: gas});
            get('createClassNotes').innerHTML = 'Your class address is: ' +
              cls.address.toString();
          } catch (e) {
            get('createClassNotes').innerHTML = `An error occurred: ${e}.`;
          }
        }
      });
      setTimeout(function(){ele.className = 'render';}, 30);
    }
  };

  // Toggles all views off except the matched DOM object activeView
  const viewActivate = async (activeView) => {
    for (const ele of views) {
      if (ele == activeView) {
        ele.className = 'active';
      } else {
        ele.className = '';
      }
    }
  };

  // Toggles to the main view
  const viewMain = async () => {
    viewActivate(get('viewMain'));
  };

  //////////////////////////////////////////////////////////////////////////////
  //
  // Public-scope functions
  //
  //////////////////////////////////////////////////////////////////////////////

  window.App = {
    replot: async () => {
      Plotly.newPlot('summaryView', plotData, plotLayout);
    },
    start: function() {
      app = this;

      // Get the initial account balance so it can be displayed.
      web3.eth.getAccounts(async (err, accs) => {
        if (err != null) {
          alert('There was an error fetching your accounts.');
          return;
        }

        if (accs.length == 0) {
          alert('Couldn\'t get any accounts! Make sure your Ethereum client is configured correctly.');
          return;
        }

        accounts = accs;
        setup();
      });
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
          console.log(r);
          data[today] = self.ratioToPercent(r[2] / (r[1] + r[2]));
        } else {
          data[today] = 0.0;
        }
        plotData.push(makePlotQuestion(r[0], data));
        qnum++;
      }
    },
    launch: async (self) => {
      self.launchSummary(self);
      if (account == accounts[0]) {
        self.launchInstructor(self);
      } else {
        self.launchStudent(self);
      }
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
        console.log(event.screenX, window.innerWidth, originX);
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
    if (false && typeof web3 !== 'undefined') {
      //console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 Affluent, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
      // Use Mist/MetaMask's provider
      window.web3 = new Web3(web3.currentProvider);
    } else {
      //console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
      // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
      //window.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:9545"));
      window.web3 = new Web3(new Web3.providers.HttpProvider(
        "http://" + location.hostname + ":8545"));
    }

    App.start();
  });
}
