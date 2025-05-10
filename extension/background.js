// This listener fires when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(() => {
  // This menu item will only appear when text is selected on a page.
  chrome.contextMenus.create({
    id: "createFlashcard", // A unique ID for this menu item
    title: "Create Flashcard from '%s'", // The text that will appear in the menu.
    // '%s' will be replaced by the selected text.
    contexts: ["selection"], // Show this menu item only when text is selected ('selection' context).
  });
  console.log("Flashcard context menu created.");
});

// This listener fires when a context menu item created by this extension is clicked.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Check if the clicked menu item is our "createFlashcard" item
  // and if there was actually text selected.
  if (info.menuItemId === "createFlashcard" && info.selectionText) {
    const backText = info.selectionText;
    console.log(
      "Context menu clicked. Selected text (back of card):",
      backText
    );

    try {
      // Store the selected text (back of the card) in chrome.storage.local.
      // The popup will read this value.
      await chrome.storage.local.set({ cardBack: backText });
      console.log("Selected text stored in chrome.storage.local.");

      // Trigger the extension's popup.
      if (chrome.action && chrome.action.openPopup) {
        await chrome.action.openPopup();
        console.log("Attempted to open action popup.");
      } else {
        console.warn(
          "chrome.action.openPopup is not available. You might need an alternative way to show UI."
        );
        chrome.windows.create({
          url: chrome.runtime.getURL("popup.html"),
          type: "popup",
          width: 400,
          height: 300
        });
      }
    } catch (error) {
      console.error("Error processing context menu click:", error);
    }
  }
});
