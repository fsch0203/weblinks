chrome.browserAction.onClicked.addListener(function (tab) {
    // alert(`windowId: ${tab.windowId}`);
    localStorage.setItem('windowId',tab.windowId);
    chrome.windows.create({
        url: chrome.runtime.getURL("index.html"),
        type: "popup",
        left: 5000,
        top: 50,
        width: 600,
        height: 900
    }, function (win) {
        // win represents the Window object from windows API
        // Do something after opening
    });
});

// chrome.history.onVisited.addListener(function (item){
//     console.log(`${item.url}`);
//     localStorage.setItem("url", item.url);
// })



// chrome.runtime.onMessage.addListener(
//     function(request, sender, sendResponse) {
//       console.log(sender.tab ?
//                   "from a content script:" + sender.tab.url :
//                   "from the extension");
//       if (request.greeting == "hello")
//         sendResponse({farewell: "goodbye"});
//     });



// chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
//     console.log(`${sender.tab.windowId}`);
// });

// chrome.tabs.onActivated.addListener(function (activeInfo){
//     console.log(`${activeInfo.tabId}`);
// });

// chrome.tabs.onActivated.addListener(function (){
//     chrome.tabs.query({active: true}, tabs => {
//         let url = tabs[0].url;
//         localStorage.setItem('lasturl', url);
//         // alert(`${url}`);
//         // use `url` here inside the callback because it's asynchronous!
//     });
//     chrome.tabs.getCurrent(function (tab){
//         alert(tab.url);
//     })
// });
