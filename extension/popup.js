document.addEventListener("DOMContentLoaded", () => {
  const cardFrontInput = document.getElementById("cardFront");
  const cardBackDisplay = document.getElementById("cardBackDisplay");
  const cardHintInput = document.getElementById("cardHint");
  const cardTagsInput = document.getElementById("cardTags");
  const saveCardButton = document.getElementById("saveCardButton");
  const statusMessageDiv = document.getElementById("statusMessage");

  let storedCardBack = ""; // To store the retrieved card back text

  // 1. Retrieve and display the stored 'cardBack' text
  chrome.storage.local.get(["cardBack"], (result) => {
    if (chrome.runtime.lastError) {
      console.error(
        "Error retrieving cardBack:",
        chrome.runtime.lastError.message
      );
      cardBackDisplay.textContent = "Error loading selected text.";
      return;
    }
    if (result.cardBack) {
      storedCardBack = result.cardBack; // Store it for submission
      cardBackDisplay.textContent = result.cardBack;
      // Clear the stored value after retrieving it,
      // so it's not accidentally reused if the popup is opened directly.
      chrome.storage.local.remove("cardBack");
    } else {
      cardBackDisplay.textContent =
        "No text selected, or popup opened directly.";
    }
  });

  // Function to display status messages
  function showStatusMessage(message, isError = false) {
    statusMessageDiv.textContent = message;
    statusMessageDiv.className =
      "status-message " + (isError ? "error" : "success");
    statusMessageDiv.style.display = "block";
  }

  // Add event listener to the "Save Card" button
  saveCardButton.addEventListener("click", async () => {
    const frontText = cardFrontInput.value.trim();
    const hintText = cardHintInput.value.trim();
    const tagsText = cardTagsInput.value.trim();

    // Basic validation
    if (!frontText) {
      showStatusMessage('Error: "Front" text cannot be empty.', true);
      return;
    }
    if (!storedCardBack) {
      showStatusMessage(
        'Error: "Back" text (selected text) is missing. Please select text on a page first.',
        true
      );
      return;
    }

    const payload = {
      front: frontText,
      back: storedCardBack, // Use the retrieved selected text
      hint: hintText || undefined, // Send undefined if empty, so backend uses default
      tags: tagsText
        ? tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [], // Process tags
    };

    console.log("Sending payload to backend:", payload);
    saveCardButton.disabled = true; // Disable button to prevent multiple clicks
    showStatusMessage("Saving...", false);

    try {
      const response = await fetch("http://localhost:3001/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        showStatusMessage(
          "Success: Flashcard saved! You can close this popup.",
          false
        );
        cardFrontInput.value = "";
        cardHintInput.value = "";
        cardTagsInput.value = "";
        chrome.storage.local.remove("cardBack", () => {
          console.log("cardBack cleared from storage after successful save.");
        });
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        const errorMessage =
          responseData.message ||
          `Error: ${response.status} - ${response.statusText}`;
        showStatusMessage(errorMessage, true);
        console.error("Error from backend:", response.status, responseData);
      }
    } catch (error) {
      console.error("Network error or failed to fetch:", error);
      showStatusMessage(
        "Error: Could not connect to the server. Make sure it is running.",
        true
      );
    } finally {
      saveCardButton.disabled = false; 
    }
  });
});
