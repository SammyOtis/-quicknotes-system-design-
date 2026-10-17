// Constants
const API_URL = "https://jsonplaceholder.typicode.com/posts";

// DOM Element Selectors
const loadBtn = document.querySelector("#load-btn");
const statusP = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

// Global State
let notes = [];

// Helper to update status message with styling state
function setStatus(message, type = "") {
  statusP.textContent = message;
  statusP.className = "status-message";
  if (type) {
    statusP.classList.add(type);
  }
}

// Reusable Async Request Wrapper
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP Error! Status: ${response.status} (${response.statusText})`);
  }
  
  // Handle empty responses (like HTTP 204 No Content or empty DELETE payloads)
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  return {
    status: response.status,
    data: data,
  };
}

// Render Function (Safe textContent execution)
function renderNotes(items) {
  notesList.textContent = "";

  if (items.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.textContent = "No notes available to display.";
    notesList.appendChild(emptyLi);
    return;
  }

  items.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-card";

    const titleH3 = document.createElement("h3");
    titleH3.textContent = note.title;

    const bodyP = document.createElement("p");
    bodyP.textContent = note.body || "(No body provided)";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteNote(note.id, deleteBtn));

    li.appendChild(titleH3);
    li.appendChild(bodyP);
    li.appendChild(deleteBtn);

    notesList.appendChild(li);
  });
}

// Load Notes Function (GET)
async function loadNotes() {
  loadBtn.disabled = true;
  submitBtn.disabled = true;
  setStatus("Loading notes...", "loading");

  try {
    const res = await request(`${API_URL}?_limit=10`);
    notes = res.data;
    renderNotes(notes);
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error("GET Error:", error);
    setStatus("Failed to load notes from the server. Please try again.", "error");
    renderNotes([]);
  } finally {
    loadBtn.disabled = false;
    submitBtn.disabled = false;
  }
}

// Create Note Function (POST)
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: Title required and max 100 chars
  if (title.length === 0) {
    setStatus("Validation error: Title is required.", "error");
    return;
  }

  if (title.length > 100) {
    setStatus("Validation error: Title must be 100 characters or fewer.", "error");
    return;
  }

  submitBtn.disabled = true;
  loadBtn.disabled = true;
  setStatus("Creating note...", "loading");

  try {
    const payload = {
      title: title,
      body: body,
      userId: 1,
    };

    const res = await request(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(payload),
    });

    const newNote = res.data;

    // Add new note to top of list
    notes.unshift(newNote);
    renderNotes(notes);

    // Form reset and status message
    noteForm.reset();
    setStatus(`Note created (status ${res.status}, id ${newNote.id}).`, "success");
  } catch (error) {
    console.error("POST Error:", error);
    setStatus("Failed to create note. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    loadBtn.disabled = false;
  }
}

/* 
 * NOTE ON JSONPLACEHOLDER DELETE BEHAVIOR:
 * JSONPlaceholder is a mock API. When POSTing a new note, it returns a fake ID (e.g., 101).
 * Because the mock server doesn't actually store new records, sending a DELETE request 
 * for a freshly created fake ID (like 101) may return a 404 or empty success object.
 * To handle this sensibly:
 * 1. If the ID is a mock client-side ID (> 100) or if the API DELETE fails because the server 
 *    never persisted it, we intercept or fallback to removing it from our local state array.
 * 2. If it's a real server post ID (1-100), we issue the real DELETE request to https://jsonplaceholder.typicode.com/posts/{id}.
 */
async function deleteNote(id, buttonElement) {
  buttonElement.disabled = true;
  setStatus(`Deleting note ${id}...`, "loading");

  // Check if it's a mock ID generated locally by JSONPlaceholder (IDs > 100)
  const isMockCreatedNote = id > 100;

  try {
    if (!isMockCreatedNote) {
      const res = await request(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      console.log(`DELETE status for ID ${id}:`, res.status);
    }

    // Remove note from local array state and re-render
    notes = notes.filter((n) => n.id !== id);
    renderNotes(notes);
    setStatus(`Note ${id} deleted successfully.`, "success");
  } catch (error) {
    console.error("DELETE Error:", error);
    // Sensible fallback for mock server limitations
    if (isMockCreatedNote) {
      notes = notes.filter((n) => n.id !== id);
      renderNotes(notes);
      setStatus(`Locally created note ${id} removed.`, "success");
    } else {
      setStatus(`Failed to delete note ${id}. Please try again.`, "error");
      buttonElement.disabled = false;
    }
  }
}

// Event Listeners
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
