// Frontend game logic: levels, model selection, chat, guesses, and popups.
    // the two models the player can switch between
    var models = ["llama3.2:1b", "llama3.2:3b"];
    var modelNames = ["1B", "3B"];

    var levelInfo = [];      // level titles and hints, loaded from the server
    var currentLevel = 0;    // which level is open (0 is level 1)
    var modelIndex = 0;      // 0 is the 1B model, 1 is the 3B model
    var chatHistory = [];    // everything said so far in this chat
    var tries = 0;           // how many messages the player sent this level
    var waiting = false;     // true while I'm waiting for the bot
    var beaten = {};         // remembers which levels were beaten, per model

    // a name for "this level on this model", like "0|1"
    function beatenKey(level, model) {
      return level + "|" + model;
    }

    // add a bubble to the chat
    // who is "you", "bot", "note", "block" or "win"
    function addBubble(text, who) {
      var log = document.getElementById("log");
      var row = document.createElement("div");
      row.className = "row " + who;
      var bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = text;   // textContent so nothing typed can run as code
      row.appendChild(bubble);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }

    // show the bouncing dots and give the row back so I can remove it later
    function addTyping() {
      var log = document.getElementById("log");
      var row = document.createElement("div");
      row.className = "row bot";
      row.innerHTML = '<div class="bubble dots"><span></span><span></span><span></span></div>';
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }

    // light up the right buttons: pink for open, green for beaten
    function refreshButtons() {
      var levelButtons = document.getElementsByClassName("lvl");
      for (var i = 0; i < levelButtons.length; i++) {
        var css = "lvl";
        if (i == currentLevel) { css = css + " active"; }
        if (beaten[beatenKey(i, modelIndex)]) { css = css + " beaten"; }
        levelButtons[i].className = css;
      }
      for (var m = 0; m < 2; m++) {
        var modelButton = document.getElementById("model" + m);
        if (m == modelIndex) { modelButton.className = "mdl active"; }
        else { modelButton.className = "mdl"; }
      }
    }

    // fill in the level name, hint and try counter
    function refreshInfo() {
      var info = levelInfo[currentLevel];
      document.getElementById("levelTitle").textContent = "LEVEL " + (currentLevel + 1) + ": " + info.title;
      document.getElementById("levelHint").textContent = info.hint;
      document.getElementById("tries").textContent = "Messages sent: " + tries + "  |  Model: " + modelNames[modelIndex];
    }

    // start a fresh chat (runs when the level or the model changes)
    function newChat() {
      chatHistory = [];
      tries = 0;
      document.getElementById("log").innerHTML = "";
      addBubble("The bot knows a secret word. Get it to leak, then type the word in the green box.", "note");
      refreshInfo();
      refreshButtons();
    }

    function selectLevel(number) { currentLevel = number; newChat(); }
    function selectModel(number) { modelIndex = number; newChat(); }

    // ask the server for the level names, then build the 10 buttons
    async function loadLevels() {
      try {
        var response = await fetch("/levels");
        levelInfo = await response.json();
        var holder = document.getElementById("levelButtons");
        for (var i = 0; i < levelInfo.length; i++) {
          var button = document.createElement("button");
          button.textContent = i + 1;
          button.className = "lvl";
          button.setAttribute("onclick", "selectLevel(" + i + ")");
          holder.appendChild(button);
        }
        newChat();
      } catch (err) {
        addBubble("Couldn't load the levels. Is server.py running?", "block");
      }
    }

    // send what the player typed and show the bot's answer
    async function send() {
      if (waiting) { return; }
      var box = document.getElementById("message");
      var text = box.value.trim();
      if (text == "") { return; }

      box.value = "";
      addBubble(text, "you");
      tries = tries + 1;
      refreshInfo();
      waiting = true;
      document.getElementById("sendBtn").disabled = true;
      var typing = addTyping();

      try {
        var response = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: currentLevel,
            model: models[modelIndex],
            message: text,
            history: chatHistory
          })
        });
        var data = await response.json();
        typing.remove();

        if (data.error) {
          addBubble("Something went wrong: " + data.error, "block");
        } else if (data.blocked) {
          addBubble(data.reply, "block");
        } else {
          addBubble(data.reply, "bot");
          // remember both sides of this exchange for the next message
          chatHistory.push({ role: "user", content: text });
          chatHistory.push({ role: "assistant", content: data.reply });

          // if the bot said the secret word, the player wins this level
          if (data.leaked) {
            beaten[beatenKey(currentLevel, modelIndex)] = true;
            addBubble("The bot leaked it! Level " + (currentLevel + 1) + " beaten on the " +
                      modelNames[modelIndex] + " model in " + tries + " messages.", "win");
            refreshButtons();
            // wait a moment so the player can read the bot's reply first
            setTimeout(showPopup, 800);
          }
        }
      } catch (err) {
        typing.remove();
        addBubble("Couldn't reach the server. Is server.py still running?", "block");
      }

      waiting = false;
      document.getElementById("sendBtn").disabled = false;
      box.focus();
    }

    // check the player's guess for the secret word
    async function submitGuess() {
      var box = document.getElementById("guess");
      var text = box.value.trim();
      if (text == "") { return; }
      box.value = "";

      try {
        var response = await fetch("/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level: currentLevel, guess: text })
        });
        var data = await response.json();

        if (data.correct) {
          beaten[beatenKey(currentLevel, modelIndex)] = true;
          addBubble("ACCESS GRANTED. Level " + (currentLevel + 1) + " beaten on the " +
                    modelNames[modelIndex] + " model in " + tries + " messages.", "win");
          refreshButtons();
          showPopup();
        } else {
          addBubble("Wrong guess. Keep digging.", "block");
        }
      } catch (err) {
        addBubble("Couldn't reach the server. Is server.py still running?", "block");
      }
    }
        // show the popup after a level is beaten
    function showPopup() {
      var isLast = (currentLevel == levelInfo.length - 1);
      var title = document.getElementById("popupTitle");
      var text = document.getElementById("popupText");
      var nextButton = document.getElementById("popupNext");

      if (isLast) {
        title.textContent = "ALL LEVELS CLEARED";
        text.textContent = "You beat the final level on the " + modelNames[modelIndex] +
                           " model in " + tries + " messages. Try the other model and see if it's easier or harder.";
        nextButton.textContent = "Close";
      } else {
        title.textContent = "LEVEL " + (currentLevel + 1) + " BEATEN";
        text.textContent = "You got it on the " + modelNames[modelIndex] + " model in " + tries +
                           " messages. Ready for level " + (currentLevel + 2) + "?";
        nextButton.textContent = "Go to level " + (currentLevel + 2);
      }

      document.getElementById("popup").style.display = "flex";
      nextButton.focus();
    }

    // hide the popup
    function closePopup() {
      document.getElementById("popup").style.display = "none";
      document.getElementById("message").focus();
    }

    // hide the popup and move on to the next level
    function nextLevel() {
      closePopup();
      if (currentLevel < levelInfo.length - 1) {
        selectLevel(currentLevel + 1);
      }
    }

    // pressing Escape closes the popup too
    document.addEventListener("keydown", function (e) {
      if (e.key == "Escape") { closePopup(); }
    });
    // pressing Enter works in both boxes
    document.getElementById("message").addEventListener("keydown", function (e) {
      if (e.key == "Enter") { send(); }
    });
    document.getElementById("guess").addEventListener("keydown", function (e) {
      if (e.key == "Enter") { submitGuess(); }
    });

    // build the level buttons and open level 1
    loadLevels();
  
