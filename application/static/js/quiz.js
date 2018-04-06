(function() {
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
      var response = (0 < direction ? "true" : "false");
      console.log(question + ": " + response);
      ele.removeEventListener("dragend", dragend);
      show_question(qn + 1);
    };
    ele.addEventListener("dragend", dragend);
  }

  show_question(0);
})();
