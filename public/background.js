const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const handleTranscription = async (audioData) => {
  const audioArrayBuffer = new Uint8Array(audioData).buffer;
  const audioBlob = new Blob([audioArrayBuffer], { type: "audio/wav" });
  if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
    console.error("Invalid audio data");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Transcription failed:", errorText);
      return;
    }

    const transcription = await response.json();
    return transcription.text;
  } catch (error) {
    console.error("Error during transcription:", error);
  }
};

let isRecording = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "transcribeAudio") {
    handleTranscription(request.audioData)
      .then((transcription) => {
        if (transcription) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "insertTranscription",
            text: transcription,
          });
        }
        sendResponse({ status: "Transcription completed" });
      })
      .catch((error) => {
        sendResponse({ status: "Error", message: error.message });
      });
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "startDictation") {
    if (!isRecording) {
      isRecording = true;
      sendResponse({ status: "Dictation started" });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateRecordingState",
            isRecording,
          });
        }
      });
    }
  } else if (request.action === "stopDictation") {
    if (isRecording) {
      isRecording = false;
      sendResponse({ status: "Stopped" });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateRecordingState",
            isRecording,
          });
        }
      });
    }
  } else if (request.action === "getRecordingState") {
    sendResponse({ isRecording: isRecording });
    return true;
  }
});
