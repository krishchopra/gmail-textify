function injectDictationButton() {
  const composeBoxes = document.querySelectorAll(
    'div[role="textbox"][aria-label]'
  );
  composeBoxes.forEach((box) => {
    if (!box.parentElement.querySelector(".dictation-button")) {
      const button = document.createElement("button");
      button.innerHTML = '🎙️ <span class="pulse-indicator"></span> Dictate';
      button.className = "dictation-button";
      button.style.cssText = `
        position: absolute;
        bottom: 5px;
        left: 5px;
        z-index: 1000;
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        padding: 5px 10px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: background-color 0.2s, transform 0.2s;
      `;
      button.addEventListener("click", toggleDictation);

      // Hover and active effects
      const style = document.createElement("style");
      style.textContent = `
        .dictation-button:hover {
          background-color: #e0e0e0 !important;
        }
        .pulse-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ff0000;
          margin: 0 5px;
          display: none;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        .pulse-indicator.active {
          display: inline-block;
          animation: pulse 1s infinite;
        }
      `;
      document.head.appendChild(style);

      // Ensure the parent element is positioned relatively
      box.parentElement.style.position = "relative";
      box.parentElement.appendChild(button);
    }
  });
}

let isRecording = false;
let mediaRecorder;
let audioChunks = [];

function toggleDictation() {
  if (isRecording) {
    chrome.runtime.sendMessage({ action: "stopDictation" });
    this.textContent = "🎙️ Dictate";
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  } else {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          const reader = new FileReader();
          reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            chrome.runtime.sendMessage({
              action: "transcribeAudio",
              audioData: Array.from(new Uint8Array(arrayBuffer)),
            });
          };
          reader.readAsArrayBuffer(audioBlob);
          audioChunks = [];
        };
        mediaRecorder.start();
        chrome.runtime.sendMessage({ action: "startDictation" });
        this.textContent = "⏹️ Stop";
      })
      .catch((error) => console.error("Error accessing microphone:", error));
  }
  isRecording = !isRecording;
}

// Run the injection when the page loads and whenever it changes
injectDictationButton();
new MutationObserver(injectDictationButton).observe(document.body, {
  childList: true,
  subtree: true,
});

function messageListener(request, sender, sendResponse) {
  if (request.action === "insertTranscription") {
    const activeElement = document.activeElement;
    if (activeElement.isContentEditable) {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      let textToInsert = request.text;

      // Check if we need to add a space
      if (range.startOffset > 0) {
        const textBefore = range.startContainer.textContent;
        if (/[.!?]\s*$/.test(textBefore) || /[.!?]$/.test(request.text)) {
          textToInsert = " " + textToInsert;
        }
      }

      const textNode = document.createTextNode(textToInsert);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "INPUT"
    ) {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeText = activeElement.value.substring(0, startPos);
      const afterText = activeElement.value.substring(endPos);

      // Check if we need to add a space
      let textToInsert = request.text;
      if (
        beforeText.length > 0 &&
        (/[.!?]\s*$/.test(beforeText) || /[.!?]$/.test(request.text))
      ) {
        textToInsert = " " + textToInsert;
      }

      activeElement.value = beforeText + textToInsert + afterText;
      const newCursorPos = startPos + textToInsert.length;
      activeElement.setSelectionRange(newCursorPos, newCursorPos);
    }
  } else if (request.action === "updateRecordingState") {
    const dictationButton = document.querySelector(".dictation-button");
    if (dictationButton) {
      if (request.isRecording) {
        dictationButton.innerHTML =
          '<span class="pulse-indicator active"></span> Stop';
      } else {
        dictationButton.innerHTML =
          '🎙️ <span class="pulse-indicator"></span> Dictate';
      }
    }
  }
  sendResponse({ status: "Message received" });
}

chrome.runtime.onMessage.addListener(messageListener);
