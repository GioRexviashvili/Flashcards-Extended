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
