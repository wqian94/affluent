var class_name = "CS 144r/244r"

var questions = [
    `Was the lecture entertaining?`,
    `Was the lecture valuable?`,
    `Was the lecturer engaging?`,
    `Was the pace too slow?`,
    `Did you just use your computer?`,
];

function show_question(qn) {
    // var question = questions[qn];
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
}

show_question(0);
