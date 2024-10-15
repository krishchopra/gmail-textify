import { useState, useEffect } from "react";
import logo from "../public/image.png";

function App() {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === "updateRecordingState") {
        setIsRecording(message.isRecording);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    chrome.runtime.sendMessage({ action: "getRecordingState" }, (response) => {
      setIsRecording(response.isRecording);
    });

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  return (
    <div className="w-80 p-4 bg-gray-100 rounded-lg shadow-md">
      <img
        src={logo}
        className="w-16 h-16 mx-auto mb-4"
        alt="Gmail Textify Logo"
      />
      <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Gmail Textify
      </h1>
      <div
        className={`flex items-center justify-center mb-4 ${
          isRecording ? "text-red-500" : "text-green-500"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full mr-2 ${
            isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
          }`}
        ></div>
        <p className="font-semibold">
          {isRecording ? "Recording in progress" : "Ready to record"}
        </p>
      </div>
      <p className="text-sm text-gray-600">
        {isRecording
          ? "Click the dictation button again to stop."
          : "Click the dictation button in Gmail to start recording."}
      </p>
    </div>
  );
}

export default App;
