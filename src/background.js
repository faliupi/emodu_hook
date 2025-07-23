
// Google Meet Detection and API Communication Script
chrome.runtime.onInstalled.addListener(function() {
    console.log("Extension installed!");
    // Add Google Meet detection and integration logic here
    // Use chrome.tabs API to detect when Google Meet is open
    chrome.tabs.query({url: "*://meet.google.com/*"}, function(tabs) {
        if (tabs.length > 0) {
            console.log("Google Meet detected");
            // Perform actions like setting up the face detection or avatar features
            fetch('http://localhost:3001/start', { method: 'POST' })
                .then(response => response.json())
                .then(data => console.log('API Response:', data))
                .catch(error => console.error('API Error:', error));
        }
    });
});
