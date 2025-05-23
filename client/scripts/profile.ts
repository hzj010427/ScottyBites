const currentUser = localStorage.getItem("user");
const userInfo = currentUser ? JSON.parse(currentUser) : null;
const myRole = userInfo?.role;
const myId = userInfo?._id;

/**
 * Parse the user id from the URL
 */
function getUserID() {
  const url = window.location.href;
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1];
}

/**
 * Add user id to the button onclick event href
 */
function addUserID() {
  const userId = getUserID();
  console.log('userId:', userId);
  const manageAccountButton = document.getElementById('manageAccountButton') as HTMLButtonElement;
  if (manageAccountButton) {
    // Condition: If myRole is "member" and myId !== userId, disable button
    if (myRole === "member" && myId !== userId) {
      manageAccountButton.disabled = true; // Disable button
      manageAccountButton.style.cursor = "not-allowed"; // Change cursor style
      manageAccountButton.style.opacity = "0.5"; // Make it visually disabled
      manageAccountButton.style.backgroundColor = "#b0b0b0"; // Grey background
      manageAccountButton.style.color = "#ffffff"; // White text for contrast
      manageAccountButton.style.border = "1px solid #9e9e9e"; // Slightly darker grey border

      // Remove existing click event to prevent redirection
      manageAccountButton.onclick = function (event) {
        event.preventDefault(); // Prevent default action
      };
    } else {
      // Reset styles if the button is enabled
      manageAccountButton.disabled = false;
      manageAccountButton.style.cursor = "pointer";
      manageAccountButton.style.opacity = "1";
      manageAccountButton.style.backgroundColor = ""; // Reset to default
      manageAccountButton.style.color = ""; // Reset text color
      manageAccountButton.style.border = ""; // Reset border

      // Set click event to redirect to the manage account page
      manageAccountButton.onclick = function () {
        window.location.href = `/account/pages/${userId}`;
      };
    }
  }
}

// Function to detect tab/window closing and mark user offline
window.addEventListener('DOMContentLoaded', async function () {
  addUserID();
});
