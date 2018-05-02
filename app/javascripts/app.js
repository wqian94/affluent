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

  // Our event filters are stored here
  const events = {
    Affluent: {},
    Class: {},
    Session: {},
  };

  //////////////////////////////////////////////////////////////////////////////
  //
  // Variables
  //
  //////////////////////////////////////////////////////////////////////////////

  var account = null;  // Currently-active account
  var accounts;
  var app;
  const gas = 4712388;  // Gas limit on transactions
  const instances = {};
  var plotStreamController = null;
  const plotData = [];
  window.plotData = plotData;
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
  const plotStream = new ReadableStream({
    start(controller) {
      plotStreamController = controller;
    }
  });

  var role = null;  // Current role: student vs instructor
  const roleInstructor = 'instructor';  // enum hack
  const roleStudent = 'student';
  const views = [];

  //////////////////////////////////////////////////////////////////////////////
  //
  // Additional private-scope setup for variables
  //
  //////////////////////////////////////////////////////////////////////////////

  {
    for (const id of ['viewMain', 'viewClass', 'viewExplore', 'viewSummary',
                      'viewResponse']) {
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

  // Returns a DOM object for a modal
  const createModal = function(title, body, footer='') {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = createModalCard(title, body, footer, true);
    return modal;
  };

  // Returns a block of HTML that looks like a modal
  const createModalCard = function(title, body, footer='', full=false) {
    return '<div class="modal-dialog" role="document">' +
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          `<h5 class="modal-title">${title}</h5>` +
          (
            full ? 
              '<button type="button" class="close" data-dismiss="modal"' +
                '<span>&times;</span>' +
              '</button>':
              ''
          ) +
        '</div>' +
        `<div class="modal-body">${body}</div>` +
        (
          footer.length ?
            `<div class="modal-footer">${footer}</div>` :
            ''
        ) +
      '</div>' +
    '</div>';
  };

  // Returns a DOM object for a modal that self-destructs on close
  const createModalEphemeral = function(title, body, footer='') {
    const modal = createModal(title, body, footer);
    $(modal).on('hidden.bs.modal', async (event) => {
      modal.parentNode.removeChild(modal);
    });
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
    for (const session in data) {
      q.x.push(session);
      q.y.push(data[session]);
    }
    return q;
  };

  const prettifyDescription = function(description, headline='h4') {
    const lines = description.split('<br />');
    var pretty = "";
    for (const line of lines) {
      const parts = line.split(':');
      pretty += '<div class="descriptionLine">' +
          `<${headline}>${parts[0].toString()}</${headline}>` +
          `<div class="descriptionInfo">${parts[1].toString()}</div>` +
        '</div>' ;
    };
    return pretty;
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
    setupClass();
    setupResponse();
    setupSummary();
    setupExplore();

    viewMain();
  };

  const setupClass = async () => {
    const view = get('viewClass');
    for (const child of view.childNodes) {
      view.removeChild(child);
    }

    const summary = document.createElement('div');
    summary.className = 'render';
    summary.innerHTML = createModalCard(
      'Class summary',
      '<div id="viewClassSummaryDescription"></div>' +
      '<hr />' +
      '<button id="viewClassSummaryFeedback">View feedback</button>&nbsp;' +
      '<button id="viewClassSummaryReturnToMain">Go back</button>'
    );
    view.appendChild(summary);

    get('viewClassSummaryFeedback').addEventListener('click', async (event) => {
      get('action').textContent = 'Return to class page';
      const actionFunc = async (event) => {
        await logoFunc();
        viewClass();
      };
      const logoFunc = async (event) => {
        get('action').style.display = 'none';
        get('action').removeEventListener('click', actionFunc);
        get('logo').removeEventListener('click', logoFunc);
      };
      get('action').addEventListener('click', actionFunc);
      get('logo').addEventListener('click', logoFunc);
      get('action').style.display = 'inline-block';
      viewSummary();
    });
    get('viewClassSummaryReturnToMain').addEventListener('click', viewMain);

    const admin = document.createElement('div');
    admin.id = 'viewClassAdmin';
    admin.innerHTML = createModalCard(
      'Class administration',
      '<div class="infoText"><div id="activateInfo">Activate the course if it is currently being taught this semester.</div>' +
      '<button id="activateInfoShow" class="infoButton">i</button>' +
      '<button id="viewClassAdminActivate" class="courseAdminButton">Activate class</button>' +
      '<button id="viewClassAdminDeactivate" class="courseAdminButton">Deactivate class</button>' +
      '</div><hr />' +
      '<div class="infoText"><div id="enrollmentInfo">Enter the public addresses of accounts ' +
      'that can give feedback in the course.</div>' +
      '<button id="enrollmentInfoShow" class="infoButton">i</button>' +
      '<button id="viewClassAdminEnroll" class="courseAdminButton">Enroll students</button>' +
      '</div><hr />' +
      '<div class="infoText"><div id="addQuestionsInfo">Create a list of questions for this course. Select from this list of questions when setting up a new feedback session.</div>' +
      '<button id="addQuestionsInfoShow" class="infoButton">i</button>' +
      '<button id="viewClassAdminAdd" class="courseAdminButton">Add questions</button>' +
      '</div><hr />' +
      '<div class="infoText"><div id="newSessionInfo">Creates a new feedback session, which allows students to give feedback through instructor specified questions about one lecture or seminar.</div>' +
      '<button id="newSessionInfoShow" class="infoButton">i</button>' +
      '<button id="viewClassAdminNew" class="courseAdminButton">New session</button>' +
      '</div><hr />' +
      '<div class="infoText"><div id="manageSessionInfo">Manage a feedback session: select questions to be answered by students; allow or stop allowing feedback</div>' +
      '<button id="manageSessionInfoShow" class="infoButton">i</button>' +
      '<select id="viewClassAdminSessions" class="courseAdminButton"></select>' +
      '<button id="viewClassAdminSelectSession" class="courseAdminButton">Manage session</button></div>'
    );
    view.appendChild(admin);

    get('activateInfoShow').addEventListener('click', async (event) => {
      var displayed = get("activateInfo").style.display;
      get("activateInfo").style.display = (!displayed || displayed == 'none') ? 'block' : 'none';
    });
    get('enrollmentInfoShow').addEventListener('click', async (event) => {
      var displayed = get("enrollmentInfo").style.display;
      get("enrollmentInfo").style.display = (!displayed || displayed == 'none') ? 'block' : 'none';
    });
    get('addQuestionsInfoShow').addEventListener('click', async (event) => {
      var displayed = get("addQuestionsInfo").style.display;
      get("addQuestionsInfo").style.display = (!displayed || displayed == 'none') ? 'block' : 'none';
    });
    get('newSessionInfoShow').addEventListener('click', async (event) => {
      var displayed = get("newSessionInfo").style.display;
      get("newSessionInfo").style.display = (!displayed || displayed == 'none') ? 'block' : 'none';
    });
    get('manageSessionInfoShow').addEventListener('click', async (event) => {
      var displayed = get("manageSessionInfo").style.display;
      get("manageSessionInfo").style.display = (!displayed || displayed == 'none') ? 'block' : 'none';
    });

    const student = document.createElement('div');
    student.id = 'viewClassStudent';
    student.innerHTML = createModalCard(
      'Student actions',
      '<button id="viewClassStudentResponse">In-class responses</button>'
    );
    view.appendChild(student);

    get('viewClassAdminActivate').addEventListener('click', async (event) => {
      await instances.Class.activate({from: account, gas:gas});
      viewClass();
      const ele = get('viewMainClassButton' + instances.Class.address);
      const newParent = get('activeClasses');
      if (ele) {
        ele.parentNode.removeChild(ele);
        if (newParent.childNodes.length) {
          newParent.insertBefore(ele, newParent.childNodes[0]);
        } else {
          newParent.appendChild(ele);
        }
      }
    });
    get('viewClassAdminDeactivate').addEventListener('click', async (event) => {
      instances.Class.deactivate({from: account, gas:gas});
      viewClass();
      const ele = get('viewMainClassButton' + instances.Class.address);
      const newParent = get('inactiveClasses');
      if (ele) {
        ele.parentNode.removeChild(ele);
        if (newParent.childNodes.length) {
          newParent.insertBefore(ele, newParent.childNodes[0]);
        } else {
          newParent.appendChild(ele);
        }
      }
    });

    get('viewClassAdminAdd').addEventListener('click', async (event) => {
      const modal = createModalEphemeral(
        'Add questions',
        'Enter each question on its own line below:' +
        '<div>' +
          '<textarea id="viewClassAdminAddInput"></textarea>' +
        '</div>' +
        '<div id="viewClassAdminAddNotes"></div>',
        '<button id="viewClassAdminAddButton">Add questions</button>'
      );
      document.body.appendChild(modal);
      get('viewClassAdminAddButton').addEventListener(
        'click', async (event) => {
          get('viewClassAdminAddNotes').innerHTML = '';
          const questions = get('viewClassAdminAddInput').value.split('\n');
          for (const question of questions) {
            const text = question.trim();
            try {
              await instances.Class.newQuestion(
                text, {from: account, gas: gas});
              get('viewClassAdminAddNotes').innerHTML +=
                `<div>"${text}" successfully added.</div>`;
            } catch (e) {
              get('viewClassAdminAddNotes').innerHTML +=
                `<div>"${text}" could not be added.</div>`;
            }
          }
          get('viewClassAdminAddInput').value = '';
        }
      );
      $(modal).on('shown.bs.modal', async (event) => {
        get('viewClassAdminAddInput').value = '';
        get('viewClassAdminAddInput').focus();
      });
      $(modal).modal('show');
    });
    get('viewClassAdminEnroll').addEventListener('click', async (event) => {
      const modal = createModalEphemeral(
        'Enroll students',
        'Enter each student\'s address on its own line below:' +
        '<div>' +
          '<textarea id="viewClassAdminEnrollInput"></textarea>' +
        '</div>' +
        '<div id="viewClassAdminEnrollNotes"></div>',
        '<button id="viewClassAdminEnrollButton">Enroll students</button>'
      );
      document.body.appendChild(modal);
      get('viewClassAdminEnrollButton').addEventListener(
        'click', async (event) => {
          get('viewClassAdminEnrollNotes').innerHTML = '';
          const students = get('viewClassAdminEnrollInput').value.split('\n');
          for (const student of students) {
            const address = student.trim();
            try {
              await instances.Class.enroll(address, {from: account, gas: gas});
              get('viewClassAdminEnrollNotes').innerHTML +=
                `<div>${address} successfully enrolled.</div>`;
            } catch (e) {
              get('viewClassAdminEnrollNotes').innerHTML +=
                `<div>${address} could not be enrolled.</div>`;
            }
          }
          get('viewClassAdminEnrollInput').value = '';
        }
      );
      $(modal).on('shown.bs.modal', async (event) => {
        get('viewClassAdminEnrollInput').value = '';
        get('viewClassAdminEnrollInput').focus();
      });
      $(modal).modal('show');
    });
    get('viewClassAdminNew').addEventListener('click', async (event) => {
      instances.Class.newSession({from: account, gas: gas});
    });
    get('viewClassAdminSelectSession').addEventListener(
      'click', async (event) => {
        if (!get('viewClassAdminSessions').value.length) {
          alert('Create a new session first!');
          return;
        }
        const session_index = parseInt(
          get('viewClassAdminSessions').value.trim());
        const session = await contracts.Session.at(
          await instances.Class.getSession.call(session_index));
        const modal = createModalEphemeral(
          'Class session administration',
          createModalCard(
            'Class session summary',
            prettifyDescription(
              `${await instances.Class.getLabel.call()}: ` +
              `${await instances.Class.getTitle.call()}<br />` +
              `Term: ${await instances.Class.getTerm.call()}`
            ) +
            `<h5>Session ${session_index + 1}</h5>`
          ) +
          createModalCard(
            'Administration',
            'Responses allowed: <span id="viewClassAdminResponse">' +
              (await session.isLocked.call() ? 'no' : 'yes') +
            '</span> ' +
            '<button id="viewClassAdminResponseButton">Toggle</button><hr />' +
            'Enqueue a question:<br />' +
            '<select id="viewClassAdminQuestionSelect" size="5"></select>' +
            '<button id="viewClassAdminQuestionButton">Enqueue</button><hr />' +
            'Current questions:' +
            '<ol id="viewClassAdminQuestions"></ol>'
          )
        );
        $(modal).modal('show');
        get('viewClassAdminResponseButton').addEventListener(
          'click', async (event) => {
            if (await session.isLocked.call()) {
              await session.unlock({from: account, gas: gas});
              get('viewClassAdminResponse').textContent = 'yes';
            } else {
              await session.lock({from: account, gas: gas});
              get('viewClassAdminResponse').textContent = 'no';
            }
          }
        );
        get('viewClassAdminQuestionButton').addEventListener(
          'click', async (event) => {
            const index = get('viewClassAdminQuestionSelect').value;
            if (index) {
              await session.addQuestion(index, {from: account, gas: gas});
              const li = document.createElement('li');
              li.textContent =
                await instances.Class.getQuestionText.call(index);
              get('viewClassAdminQuestions').appendChild(li);
            }
          }
        );

        // Add questions to our possibilities
        {
          const numQuestions = await instances.Class.numQuestions.call();
          for (var i = 0; i < numQuestions; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = await instances.Class.getQuestionText.call(i);
            get('viewClassAdminQuestionSelect').appendChild(option);
          }
          get('viewClassAdminQuestionSelect').addEventListener(
            'keypress', async (event) => {
              if (('Enter' == event.key) ||
                  ('13' == (event.which || event.keyCode))) {
                get('viewClassAdminQuestionButton').click();
              }
            }
          );
        }

        // Display currently-added questions
        {
          const numQuestions = await session.numQuestions.call(
            {from: account, gas: gas});
          for (var i = 0; i < numQuestions; i++) {
            const li = document.createElement('li');
            li.textContent = await instances.Class.getQuestionText.call(
              await session.getQuestionIndex.call(i,{from: account, gas: gas}));
            get('viewClassAdminQuestions').appendChild(li);
          }
        }
      }
    );

    get('viewClassStudentResponse').addEventListener('click', async (event) => {
      const active = await instances.Class.isActive.call();
      const numSessions = (await instances.Class.numSessions.call()).toNumber();
      if (!active || !numSessions) {
        const modal = createModalEphemeral(
          'Class is currently not accepting responses',
          'Unfortunately, this class is not currently accepting responses '+
          'because:' +
          '<ul>' +
            (active ? '' : '<li>The class is not active</li>') +
            (numSessions ? '' : '<li>There are no sessions</li>') +
          '</ul>'
        );
        $(modal).modal('show');
        return;
      }

      instances.Session = await contracts.Session.at(
        await instances.Class.getSession(numSessions - 1));

      get('action').textContent = 'Return to class page';
      const actionFunc = async (event) => {
        await logoFunc();
        viewClass();
      };
      const logoFunc = async (event) => {
        get('action').style.display = 'none';
        get('action').removeEventListener('click', actionFunc);
        get('logo').removeEventListener('click', logoFunc);
      };
      get('action').addEventListener('click', actionFunc);
      get('logo').addEventListener('click', logoFunc);
      get('action').style.display = 'inline-block';
      get('responseCanvas').textContent = 'Awaiting more questions...';
      instances.Session.attend({from: account, gas: gas});

      viewResponse();
    });
  };

  const setupExplore = async () => {
    const view = get('viewExplore');
    const ele = document.createElement('div');
    ele.className = 'render';
    ele.innerHTML = createModalCard(
      '<span id="viewExploreTitle">Explore previous classes</span>',
      '<div id="viewExploreClasses"></div>'
    );
    view.appendChild(ele);

    const returnButton = document.createElement('button');
    returnButton.id = 'viewExploreReturn';
    returnButton.textContent = 'Return to homepage';
    get('viewExploreTitle').parentNode.parentNode.appendChild(returnButton);
    get('viewExploreTitle').parentNode.innerHTML =
      get('viewExploreTitle').innerHTML;

    get('viewExploreReturn').addEventListener('click', viewMain);

    const numClasses = (await instances.Affluent.numClasses.call()).toNumber();
    for (var i = 0; i < numClasses; i++) {
      const cls = await contracts.Class.at(
        await instances.Affluent.getClass(i));
      if (await cls.isActive.call()) {  // Skip active classes
        continue;
      }
      const b = document.createElement('button');
      b.id = 'viewExploreClassButton' + cls.address;
      b.innerHTML = prettifyDescription(await classDescription(cls), 'h5');
      b.addEventListener('click', async (event) => {
        get('explore').textContent = 'Return to past offerings';
        const logoFunc = async (event) => {
          get('explore').textContent = 'Explore past offerings';
          get('explore').removeEventListener('click', logoFunc);
          get('logo').removeEventListener('click', logoFunc);
        };
        get('explore').addEventListener('click', logoFunc);
        get('logo').addEventListener('click', logoFunc);

        instances.Class = cls;
        role = roleStudent;
        plotLayout.title = 
          `${await instances.Class.getLabel.call()}: ` +
          `${await instances.Class.getTitle.call()}`;
        get('viewSummaryPlot').innerHTML = 'Loading...';
        // There should be no need to live update this graph because the class
        // is supposedly inactive.
        viewSummary();
      });
      get('viewExploreClasses').appendChild(b);
    }

    // Don't show explorer until all the panels have been loaded
    get('explore').style.display = 'inline-block';
    get('explore').addEventListener('click', viewExplore);
  };

  const setupMain = async () => {
    const view = get('viewMain');
    for (const child of view.childNodes) {
      view.removeChild(child);
    }

    // Setup logo clicking
    get('logo').addEventListener('click', viewMain);

    // Admin UI
    const amAdmin = isMyAccount(await instances.Affluent.admin());
    if (amAdmin) {
      const ele = document.createElement('div');
      view.appendChild(ele);
      setupMainAdmin(ele);
    }

    var enrolledStreamController = null;
    const enrolledStream = new ReadableStream({
      start(controller) {
        enrolledStreamController = controller;
      }
    });
    var taughtStreamController = null;
    const taughtStream = new ReadableStream({
      start(controller) {
        taughtStreamController = controller;
      }
    });

    // Student UI
    {
      const ele = document.createElement('div');
      view.appendChild(ele);
      setupMainStudent(ele, amAdmin, enrolledStream);
    }

    // Instructor UI
    {
      const ele = document.createElement('div');
      view.appendChild(ele);
      setupMainInstructor(ele, taughtStream);
    }

    const numClasses = await instances.Affluent.numClasses.call();
    for (var i = 0; i < numClasses; i++) {
      const cls = await contracts.Class.at(
        await instances.Affluent.getClass.call(i));
      if (isMyAccount(await cls.getInstructor.call())) {
        taughtStreamController.enqueue(cls);
      }
      if (await cls.isActive.call()) {
        for (const acct of accounts) {
          if (await cls.isEnrolled.call(acct)) {
            enrolledStreamController.enqueue({cls: cls, acct: acct});
            break;
          }
        }
      }
    }
    enrolledStreamController.close();
    taughtStreamController.close();
  };

  // Sets up admin panel in main view
  const setupMainAdmin = async (ele) => {
    ele.innerHTML = createModalCard(
      'System administration',
      '<button id="approveClassButton">Approve classes</button>'
    );
    setTimeout(function(){ele.className = 'render';}, 30);

    const modal = createModal(
      'Approve a new class',
      '<div class="inputFormWrapper">' +
      '<div class="createLabel">Class address:</div>' +
        '<div class="createInputHolder"><input type="text" id="approveClassAdr" /></div></div>' +
      '<div id="approveClassInfo"></div>',
      '<button id="approveClassValidate">Validate address</button>' +
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
      get('approveClassValidate').setAttribute('disabled', '');
      get('approveClassInfo').innerHTML =
        'Validating class address, please wait...';
      try{
        currentClass = await contracts.Class.at(event.target.value.trim());
        let description = await classDescription(currentClass);
        let description_html = prettifyDescription(description);
        get('approveClassInfo').innerHTML = description_html;
        get('approveClassActionApprove').removeAttribute('disabled');
        get('approveClassActionReject').removeAttribute('disabled');
      } catch (e) {
        currentClass = null;
        get('approveClassInfo').innerHTML = '';
        get('approveClassActionApprove').setAttribute('disabled', '');
        get('approveClassActionReject').setAttribute('disabled', '');
        get('approveClassValidate').removeAttribute('disabled');
      }
    };
    get('approveClassAdr').addEventListener('change', onClassAddressChange);
    get('approveClassValidate').addEventListener('click', onClassAddressChange);

    $(modal).on('shown.bs.modal', async (event) => {
      get('approveClassAdr').focus();
    });

    get('approveClassActionApprove').addEventListener(
      'click', async (event) => {
        if (currentClass) {
          instances.Affluent.activate(
            currentClass.address,
            {from: await instances.Affluent.admin(), gas: gas});
        }
        get('approveClassAdr').value = '';
        get('approveClassActionApprove').setAttribute('disabled', '');
        get('approveClassActionReject').setAttribute('disabled', '');
        $(modal).modal('hide');
      }
    );
    get('approveClassActionReject').addEventListener(
      'click', async (event) => {
        // TODO: remove class from consideration permanently unrevokably
        get('approveClassAdr').value = '';
        get('approveClassActionApprove').setAttribute('disabled', '');
        get('approveClassActionReject').setAttribute('disabled', '');
        $(modal).modal('hide');
      }
    );
    setTimeout(function(){ele.className = 'render';}, 30);
  };

  // Sets up instructor panel in main view
  const setupMainInstructor = async (ele, taughtStream) => {
    // Set up panel
    ele.innerHTML = createModalCard(
      'Classes I teach',
      '<button id="createClassButton">Create a class</button>' +
      '<hr />' +
      '<h5>Active classes</h5>' +
      '<div id="activeClassesLoading">Loading...</div>' +
      '<div id="activeClasses"></div>' +
      '<hr />' +
      '<h5>Inactive classes</h5>' +
      '<div id="inactiveClassesLoading">Loading...</div>' +
      '<div id="inactiveClasses"></div>'
    );
    setTimeout(function() {ele.className = 'render';}, 30);

    // Set up class creation modal
    const createClassModal = createModal(
      'Create a new class',
      '<div id="createInstructorAddress">Instructor address:</div>' +
        '<select id="createClassInstructor" required></select>' +
      '<div class="inputFormWrapper">' +
      '<div class="createLabel">Class label:</div>' +
        '<div class="createInputHolder"><input id="createClassLabel" placeholder="CS244r" required type="text" />' +
      '</div>' +
      '<div class="createLabel">Class title:</div>' +
        '<div class="createInputHolder"><input id="createClassTitle" placeholder="Network Design Projects" required type="text" />' +
      '</div>' +
      '<div class="createLabel">Class term:</div>' +
        '<div class="createInputHolder"><input id="createClassTerm" placeholder="Spring 2018" required type="text" />' +
      '</div>' +
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

    const reader = taughtStream.getReader();
    const taughtStreamFunc = async ({done, value}) => {
      if (done) {
        if (get('activeClassesLoading')) {
          get('activeClassesLoading').parentNode.removeChild(
            get('activeClassesLoading'));
        }
        if (get('inactiveClassesLoading')) {
          get('inactiveClassesLoading').parentNode.removeChild(
            get('inactiveClassesLoading'));
        }
        return;
      }

      const cls = value;
      const parent = (await cls.isActive.call()) ?
        get('activeClasses') : get('inactiveClasses');
      const b = document.createElement('button');
      b.id = 'viewMainClassButton' + cls.address;
      b.innerHTML = prettifyDescription(await classDescription(cls), 'h5');
      b.addEventListener('click', async (event) => {
        instances.Class = cls;
        account = await cls.getInstructor.call();
        role = roleInstructor;
        get('viewSummaryPlot').innerHTML = 'Loading...';
        viewClass();
      });
      if (parent.childNodes.length) {
        parent.insertBefore(b, parent.childNodes[0]);
      } else {
        parent.appendChild(b);
      }

      reader.read().then(taughtStreamFunc);
    };
    reader.read().then(taughtStreamFunc);
  };

  // Sets up student panel in main view
  const setupMainStudent = async (ele, amAdmin, enrolledStream) => {
    const reader = enrolledStream.getReader();
    const setupMainStudentFunc = function() {
      ele.innerHTML = createModalCard(
        'Classes I attend',
        '<div id="enrolledClassesLoading">Loading...</div>' +
        '<div id="enrolledClasses"></div>'
      );
      setTimeout(function() {ele.className = 'render';}, 30);
    };
    const setupMainStudentStreamFunc = async ({done, value}) => {
      if (done) {
        if (get('enrolledClassesLoading')) {
          get('enrolledClassesLoading').parentNode.removeChild(
            get('enrolledClassesLoading'));
        }
        return;
      }

      const acct = value.acct;
      const cls = value.cls;

      const b = document.createElement('button');
      b.innerHTML = prettifyDescription(await classDescription(cls), 'h5');
      b.addEventListener('click', async (event) => {
        instances.Class = cls;
        account = acct;
        role = roleStudent;
        get('viewSummaryPlot').innerHTML = 'Loading...';
        viewClass();
      });
      if (get('enrolledClasses').childNodes.length) {
        get('enrolledClasses').insertBefore(
          b, get('enrolledClasses').childNodes[0]);
      } else {
        get('enrolledClasses').appendChild(b);
      }

      reader.read().then(setupMainStudentStreamFunc);
    };
    if (!amAdmin) {
      setupMainStudentFunc();
    }
    reader.read().then(async ({done, value}) => {
      if (amAdmin && !done) {
        setupMainStudentFunc();
      }

      setupMainStudentStreamFunc({done, value});
    });
  };

  // Sets up response view
  const setupResponse = async () => {
    const view = get('viewResponse');
    const ele = document.createElement('div');
    ele.className = "centered render";
    ele.id = "responseCanvas";
    ele.setAttribute("draggable", "true");
    view.appendChild(ele);

    const buffer = Math.max(50, 0.05 * window.innerWidth);
    var originX = null;

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

    const drag = async (event) => {
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

    const dragEnd = async (event) => {
      ele.style.background = 'white';

      const x = getDefined(
        function() { return event.screenX; },
        function() { return event.changedTouches[0].pageX; });
      const direction = getDir(x);
      if (0 == direction) {
        return;
      }

      // Successfully registered response
      if (events.Class.Question.nextQuestionReady) {
        const response = (0 < direction ? true : false);
        get('responseCanvas').textContent = 'Awaiting more questions...';
        events.Class.Question.nextQuestionReady = false;
        try {
          await instances.Session.submitResponse(
            response, {from: account, gas: gas});
        } catch (e) {}
        originX = null;
      }
    };

    const dragStart = async (event) => {
      const x = getDefined(
        function() { return event.screenX; },
        function() { return event.changedTouches[0].pageX; });
      originX = x;
      if (event.dataTransfer) {
        event.dataTransfer.setDragImage(new Image(), 0, 0);
      }
    };

    ele.addEventListener("drag", drag);
    ele.addEventListener("dragend", dragEnd);
    ele.addEventListener("dragstart", dragStart);
    ele.addEventListener("touchcancel", async (event) => {
      originX = null;
    });
    ele.addEventListener("touchend", dragEnd);
    ele.addEventListener("touchmove", drag);
    ele.addEventListener("touchstart", dragStart);
  };

  // Sets up the summary view
  const setupSummary = async () => {
    const view = get('viewSummary');
    const ele = document.createElement('div');
    ele.className = 'centered render';
    ele.id = 'viewSummaryPlot';
    view.appendChild(ele);

    const reader = plotStream.getReader();
    const summaryUpdateFunc = async ({done, value}) => {
      if (done) {
        return;
      }

      const numQuestions =
        (await instances.Class.numQuestions.call()).toNumber();
      const numSessions = (await instances.Class.numSessions.call()).toNumber();
      plotData.splice(0, plotData.length);
      for (var qi = 0; qi < numQuestions; qi++) {
        const data = {};
        for (var si = 0; si < numSessions; si++) {
          const nFalse =
            (await instances.Class.getSummary.call(false, qi, si)).toNumber();
          const nTrue =
            (await instances.Class.getSummary.call(true, qi, si)).toNumber();
          if (nFalse + nTrue) {
            data[si + 1] = parseInt(10000 * (nTrue / (nFalse + nTrue))) / 100;
          }
        }
        plotData.push(makePlotQuestion(
          await instances.Class.getQuestionText.call(qi), data));
      }
      get('viewSummaryPlot').innerHTML = '';
      summaryReplot();
      reader.read().then(summaryUpdateFunc);
    };
    reader.read().then(summaryUpdateFunc);
  };

  // Updates the summary view plot data
  const summaryUpdate = async () => {
    plotStreamController.enqueue({});
  };

  const summaryReplot = async () => {
    Plotly.newPlot('viewSummaryPlot', plotData, plotLayout);
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

  // Toggles to the class view
  const viewClass = async () => {
    const view = get('viewClass');

    for (const key in events.Class) {
      events.Class[key].stopWatching();
      delete events.Class[key];
    }

    const description = await classDescription(instances.Class);
    const active = await instances.Class.isActive.call();
    get('viewClassSummaryDescription').innerHTML =
      `${prettifyDescription(description)}<br />` +
      `<h5>Status: ${active ? 'Active' : 'Inactive'}</h5>`;

    if (roleInstructor == role) {
      get('viewClassAdmin').className = 'render';
      get('viewClassStudent').className = '';
      if (active) {
        get('viewClassAdminActivate').style.display = 'none';
        get('viewClassAdminDeactivate').style.display = '';
      } else {
        get('viewClassAdminDeactivate').style.display = 'none';
        get('viewClassAdminActivate').style.display = '';
      }

      // Add session options
      {
        while (get('viewClassAdminSessions').options.length) {
          get('viewClassAdminSessions').removeChild(
            get('viewClassAdminSessions').options[0]);
        }
        const numSessions = await instances.Class.numSessions.call();
        for (var i = 0; i < numSessions; i++) {
          const option = document.createElement('option');
          option.value = i.toString();
          option.textContent = 'Session ' + (i + 1).toString();
          if (i) {
            get('viewClassAdminSessions').insertBefore(
              option, get('viewClassAdminSessions').childNodes[0]
            );
          } else {
            get('viewClassAdminSessions').appendChild(option);
          }
        }
        get('viewClassAdminSessions').selectedIndex = 0;
        events.Class.NewSession = instances.Class.NewSession();
        events.Class.NewSession.watch(async (err, result) => {
          if (!err) {
            const index = result.args.index.toNumber();
            if (index == get('viewClassAdminSessions').length) {
              const option = document.createElement('option');
              option.value = index.toString();
              option.textContent = 'Session ' + (index + 1).toString();
              if (index >= get('viewClassAdminSessions').options.length) {
                if (index) {
                  get('viewClassAdminSessions').insertBefore(
                    option, get('viewClassAdminSessions').childNodes[0]
                  );
                } else {
                  get('viewClassAdminSessions').appendChild(option);
                }
                get('viewClassAdminSessions').selectedIndex = 0;
              }
            }
          }
        });
      }
    } else {
      get('viewClassAdmin').className = '';
      get('viewClassStudent').className = 'render';
      events.Class.Question = instances.Class.Question();
      events.Class.Question.watch(async (err, result) => {
        if (!err && account == result.args.student) {
          get('responseCanvas').textContent = result.args.text;
          events.Class.Question.nextQuestionReady = true;
        }
      });
    }
    plotLayout.title = 
      `${await instances.Class.getLabel.call()}: ` +
      `${await instances.Class.getTitle.call()}`;
    instances.Class.SummaryUpdated().watch(async (error, result) => {
      if (!error) {
        summaryUpdate();
      }
    });

    viewActivate(view);
  };

  // Toggles to the explore view
  const viewExplore = async () => {
    viewActivate(get('viewExplore'));
  };

  // Toggles to the main view
  const viewMain = async () => {
    viewActivate(get('viewMain'));
  };

  // Toggles to the response view
  const viewResponse = async () => {
    viewActivate(get('viewResponse'));
  };

  // Toggles to the summary view
  const viewSummary = async () => {
    viewActivate(get('viewSummary'));
    summaryUpdate();
  };

  //////////////////////////////////////////////////////////////////////////////
  //
  // Public-scope functions
  //
  //////////////////////////////////////////////////////////////////////////////

  window.App = {
    replot: summaryReplot,
    start: function() {
      app = this;  // Prevent external maliciousness by reassigning window.App

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
