export async function getUserPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    console.error("Error requesting microphone permission", error);
  }
}

// Call the function to request microphone permission
getUserPermission();
