#!/usr/bin/env node
/**
 * End-to-End Test Script for Property Notes Feature
 * Tests all acceptance criteria for subtask-4-1
 *
 * Run with: node test-notes-e2e.js
 */

const API_BASE = 'http://localhost:3000/api';

// Demo users for testing
const USER_A = {
  id: 'demo-user-1',
  email: 'demo@taxdeedflow.com',
  name: 'Demo User A',
  role: 'admin'
};

const USER_B = {
  id: 'analyst-user-1',
  email: 'analyst@taxdeedflow.com',
  name: 'Analyst User B',
  role: 'analyst'
};

// Test property ID (will use first property from the database)
let TEST_PROPERTY_ID = null;
let TEST_NOTE_ID = null;

// Test counters
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}, user = USER_A) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Token': JSON.stringify(user),
    'Origin': 'http://localhost:3000',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // Response might not be JSON
  }

  return { response, data, status: response.status };
}

/**
 * Log test result
 */
function logTest(name, passed, message = '') {
  testsRun++;
  if (passed) {
    testsPassed++;
    console.log(`✅ PASS: ${name}`);
    if (message) console.log(`   ${message}`);
  } else {
    testsFailed++;
    console.log(`❌ FAIL: ${name}`);
    if (message) console.log(`   ${message}`);
  }
}

/**
 * Wait for a short period
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Get a test property to use for testing
 */
async function setupTestProperty() {
  console.log('\n=== Setup: Finding test property ===\n');

  // Try to get any property from the API
  const { response, data, status } = await apiRequest('/properties?limit=1');

  if (status === 200 && data && data.properties && data.properties.length > 0) {
    TEST_PROPERTY_ID = data.properties[0].id;
    console.log(`✅ Found test property: ${TEST_PROPERTY_ID}`);
    return true;
  }

  // If no properties exist, use a mock UUID for demo mode
  TEST_PROPERTY_ID = '00000000-0000-0000-0000-000000000001';
  console.log(`ℹ️  Using mock property ID for demo mode: ${TEST_PROPERTY_ID}`);
  return true;
}

/**
 * Test 2: Create a note (User A)
 */
async function testCreateNote() {
  console.log('\n=== Test 1: Create Note (User A) ===\n');

  const noteData = {
    note_type: 'general',
    note_text: 'This is a test note for end-to-end verification. Created by User A.'
  };

  const { response, data, status } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(noteData)
    },
    USER_A
  );

  logTest(
    'Create note returns 201',
    status === 201,
    `Status: ${status}`
  );

  logTest(
    'Created note has correct data',
    data && data.note_text === noteData.note_text && data.note_type === noteData.note_type,
    `Note: ${JSON.stringify(data)}`
  );

  if (data && data.id) {
    TEST_NOTE_ID = data.id;
    console.log(`Note ID: ${TEST_NOTE_ID}`);
  }
}

/**
 * Test 3: Retrieve note and verify persistence (User A)
 */
async function testRetrieveNote() {
  console.log('\n=== Test 2: Retrieve Note (User A) ===\n');

  const { response, data, status } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}`,
    { method: 'GET' },
    USER_A
  );

  logTest(
    'Get property returns 200',
    status === 200,
    `Status: ${status}`
  );

  const hasNotes = data && data.notes && Array.isArray(data.notes) && data.notes.length > 0;
  logTest(
    'Property has notes array with data',
    hasNotes,
    `Notes count: ${data?.notes?.length || 0}`
  );

  if (hasNotes) {
    const ourNote = data.notes.find(n => n.id === TEST_NOTE_ID);
    logTest(
      'Created note appears in notes list',
      !!ourNote,
      ourNote ? `Found: ${ourNote.note_text}` : 'Note not found'
    );
  }
}

/**
 * Test 4: Edit the note (User A)
 */
async function testEditNote() {
  console.log('\n=== Test 3: Edit Note (User A) ===\n');

  const updatedData = {
    note_type: 'concern',
    note_text: 'This note has been edited - end-to-end test verification. Updated by User A.'
  };

  const { response, data, status } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes/${TEST_NOTE_ID}`,
    {
      method: 'PUT',
      body: JSON.stringify(updatedData)
    },
    USER_A
  );

  logTest(
    'Update note returns 200',
    status === 200,
    `Status: ${status}`
  );

  logTest(
    'Updated note has new data',
    data && data.note_text === updatedData.note_text && data.note_type === updatedData.note_type,
    `Type: ${data?.note_type}, Text: ${data?.note_text?.substring(0, 50)}...`
  );

  logTest(
    'Updated note has updated_at timestamp',
    data && data.updated_at,
    `Updated at: ${data?.updated_at}`
  );
}

/**
 * Test 5: Verify edit persistence (User A)
 */
async function testEditPersistence() {
  console.log('\n=== Test 4: Verify Edit Persistence (User A) ===\n');

  // Wait a moment to ensure database has committed
  await sleep(500);

  const { response, data, status } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}`,
    { method: 'GET' },
    USER_A
  );

  if (data && data.notes) {
    const ourNote = data.notes.find(n => n.id === TEST_NOTE_ID);

    logTest(
      'Edited note persists after retrieval',
      !!ourNote,
      ourNote ? 'Note found in database' : 'Note not found'
    );

    logTest(
      'Edited note has updated type (concern)',
      ourNote && ourNote.note_type === 'concern',
      `Type: ${ourNote?.note_type}`
    );

    logTest(
      'Edited note has updated text',
      ourNote && ourNote.note_text.includes('edited'),
      `Text: ${ourNote?.note_text?.substring(0, 50)}...`
    );
  }
}

/**
 * Test 6: Test all 4 note types
 */
async function testAllNoteTypes() {
  console.log('\n=== Test 5: All Note Types ===\n');

  const noteTypes = ['general', 'concern', 'opportunity', 'action'];
  const createdNoteIds = [];

  for (const noteType of noteTypes) {
    const noteData = {
      note_type: noteType,
      note_text: `Test note of type: ${noteType}`
    };

    const { response, data, status } = await apiRequest(
      `/properties/${TEST_PROPERTY_ID}/notes`,
      {
        method: 'POST',
        body: JSON.stringify(noteData)
      },
      USER_A
    );

    logTest(
      `Create note with type "${noteType}"`,
      status === 201 && data && data.note_type === noteType,
      `Status: ${status}, Type: ${data?.note_type}`
    );

    if (data && data.id) {
      createdNoteIds.push(data.id);
    }
  }

  // Test invalid note type
  const invalidData = {
    note_type: 'invalid_type',
    note_text: 'This should fail'
  };

  const { status: invalidStatus } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(invalidData)
    },
    USER_A
  );

  logTest(
    'Invalid note type is rejected with 400',
    invalidStatus === 400,
    `Status: ${invalidStatus}`
  );

  // Store note IDs for cleanup
  return createdNoteIds;
}

/**
 * Test 7: User privacy - User B cannot see User A's notes
 */
async function testUserPrivacy() {
  console.log('\n=== Test 6: User Privacy ===\n');

  // Create a note as User A
  const userANote = {
    note_type: 'general',
    note_text: 'User A private note - should NOT be visible to User B'
  };

  const { data: noteA } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(userANote)
    },
    USER_A
  );

  console.log(`Created User A note: ${noteA?.id}`);

  // Create a note as User B
  const userBNote = {
    note_type: 'general',
    note_text: 'User B private note - should NOT be visible to User A'
  };

  const { data: noteB } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(userBNote)
    },
    USER_B
  );

  console.log(`Created User B note: ${noteB?.id}`);

  // Get property as User A - should only see User A's notes
  const { data: propertyAsUserA } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}`,
    { method: 'GET' },
    USER_A
  );

  const userACanSeeOwnNote = propertyAsUserA?.notes?.some(n => n.id === noteA?.id);
  const userACanSeeBNote = propertyAsUserA?.notes?.some(n => n.id === noteB?.id);

  logTest(
    'User A can see their own note',
    userACanSeeOwnNote,
    `Notes visible to User A: ${propertyAsUserA?.notes?.length || 0}`
  );

  logTest(
    'User A cannot see User B\'s note',
    !userACanSeeBNote,
    userACanSeeBNote ? '❌ SECURITY ISSUE: User A can see User B\'s note!' : 'Privacy enforced'
  );

  // Get property as User B - should only see User B's notes
  const { data: propertyAsUserB } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}`,
    { method: 'GET' },
    USER_B
  );

  const userBCanSeeOwnNote = propertyAsUserB?.notes?.some(n => n.id === noteB?.id);
  const userBCanSeeANote = propertyAsUserB?.notes?.some(n => n.id === noteA?.id);

  logTest(
    'User B can see their own note',
    userBCanSeeOwnNote,
    `Notes visible to User B: ${propertyAsUserB?.notes?.length || 0}`
  );

  logTest(
    'User B cannot see User A\'s note',
    !userBCanSeeANote,
    userBCanSeeANote ? '❌ SECURITY ISSUE: User B can see User A\'s note!' : 'Privacy enforced'
  );

  // Try to delete User A's note as User B (should fail)
  const { status: deleteStatus } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes/${noteA?.id}`,
    { method: 'DELETE' },
    USER_B
  );

  logTest(
    'User B cannot delete User A\'s note',
    deleteStatus === 404,
    `Status: ${deleteStatus} (404 = not found/unauthorized)`
  );

  return [noteA?.id, noteB?.id];
}

/**
 * Test 8: Delete note
 */
async function testDeleteNote() {
  console.log('\n=== Test 7: Delete Note ===\n');

  const { response, data, status } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes/${TEST_NOTE_ID}`,
    { method: 'DELETE' },
    USER_A
  );

  logTest(
    'Delete note returns 200',
    status === 200,
    `Status: ${status}`
  );

  // Verify note is gone
  await sleep(500);

  const { data: property } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}`,
    { method: 'GET' },
    USER_A
  );

  const noteStillExists = property?.notes?.some(n => n.id === TEST_NOTE_ID);

  logTest(
    'Deleted note no longer appears in notes list',
    !noteStillExists,
    noteStillExists ? '❌ Note still exists!' : 'Note successfully deleted'
  );
}

/**
 * Test 9: Markdown formatting preservation
 */
async function testMarkdownFormatting() {
  console.log('\n=== Test 8: Markdown Formatting ===\n');

  const markdownNote = {
    note_type: 'general',
    note_text: `# Test Heading

**Bold text** and *italic text*

- Bullet 1
- Bullet 2

[Link](https://example.com)

\`inline code\`

\`\`\`
code block
\`\`\`
`
  };

  const { data: created, status: createStatus } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(markdownNote)
    },
    USER_A
  );

  logTest(
    'Markdown note is created',
    createStatus === 201,
    `Status: ${createStatus}`
  );

  // Retrieve and verify markdown is preserved
  const { data: property } = await apiRequest(
    `/properties/${TEST_PROPERTY_ID}`,
    { method: 'GET' },
    USER_A
  );

  const retrievedNote = property?.notes?.find(n => n.id === created?.id);
  const markdownPreserved = retrievedNote?.note_text.includes('**Bold text**') &&
                            retrievedNote?.note_text.includes('# Test Heading');

  logTest(
    'Markdown formatting is preserved',
    markdownPreserved,
    markdownPreserved ? 'Markdown syntax intact' : 'Markdown may be corrupted'
  );

  return created?.id;
}

/**
 * Cleanup test data
 */
async function cleanup(noteIds = []) {
  console.log('\n=== Cleanup: Deleting test notes ===\n');

  for (const noteId of noteIds) {
    if (noteId) {
      try {
        await apiRequest(
          `/properties/${TEST_PROPERTY_ID}/notes/${noteId}`,
          { method: 'DELETE' },
          USER_A
        );
        console.log(`Deleted note: ${noteId}`);
      } catch (e) {
        console.log(`Failed to delete note: ${noteId}`);
      }
    }
  }

  // Also cleanup User B's notes
  try {
    const { data } = await apiRequest(
      `/properties/${TEST_PROPERTY_ID}`,
      { method: 'GET' },
      USER_B
    );

    if (data && data.notes) {
      for (const note of data.notes) {
        await apiRequest(
          `/properties/${TEST_PROPERTY_ID}/notes/${note.id}`,
          { method: 'DELETE' },
          USER_B
        );
        console.log(`Deleted User B note: ${note.id}`);
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Property Notes Feature - End-to-End Test Suite');
  console.log('='.repeat(60));

  try {
    await setupTestProperty();

    await testCreateNote();
    await testRetrieveNote();
    await testEditNote();
    await testEditPersistence();

    const typeTestNoteIds = await testAllNoteTypes();
    const privacyTestNoteIds = await testUserPrivacy();
    await testDeleteNote();
    const markdownNoteId = await testMarkdownFormatting();

    // Cleanup
    await cleanup([...typeTestNoteIds, ...privacyTestNoteIds, markdownNoteId]);

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error(error.stack);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Tests Run: ${testsRun}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Success Rate: ${testsRun > 0 ? ((testsPassed / testsRun) * 100).toFixed(1) : 0}%`);
  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
