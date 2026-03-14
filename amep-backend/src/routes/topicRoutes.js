const router = require("express").Router();
const auth = require("../middleware/auth");

// GET /api/topics/:topicId/notes — AI-generated notes
router.get("/:topicId/notes", auth, async (req, res) => {
  try {
    const { topicId } = req.params;

    // Map topic IDs to display names
    const topicNames = {
      arrays: "Arrays",
      "linked-lists": "Linked Lists",
      trees: "Trees",
      graphs: "Graphs",
      "dynamic-programming": "Dynamic Programming",
      sorting: "Sorting Algorithms",
      searching: "Searching Algorithms",
    };

    const topicName = topicNames[topicId] || topicId;

    const prompt = `You are an expert computer science tutor. Generate concise, clear study notes for the topic "${topicName}" in Data Structures & Algorithms.

Provide exactly 5 key concepts as separate notes. Each note should be 2-4 sentences explaining a core concept. Use markdown formatting where helpful (bold, code blocks, etc).

Format: Return ONLY a JSON array of 5 strings, each being one note. Do not include any text before or after the JSON array.`;

    let notes;
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock_key_for_now") {
        throw new Error("Invalid or missing Gemini API Key");
      }

      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Try to parse JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        notes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse notes JSON");
      }
    } catch (aiErr) {
      console.warn("Using fallback notes. Reason:", aiErr.message);
      // Fallback notes
      notes = getFallbackNotes(topicId);
    }

    res.json({ topic: topicName, notes });
  } catch (err) {
    console.error("Topic notes error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

function getFallbackNotes(topicId) {
  const fallbacks = {
    arrays: [
      "**Arrays** are contiguous blocks of memory that store elements of the same type. They provide O(1) access by index, making them one of the fastest data structures for random access.",
      "**Array traversal** involves visiting each element sequentially. Common patterns include two-pointer technique, sliding window, and prefix sums for optimization.",
      "**Insertion and deletion** in arrays are O(n) operations because elements must be shifted. Dynamic arrays (like JavaScript arrays) handle resizing automatically by doubling capacity.",
      "**Searching in arrays**: Linear search is O(n), but if the array is sorted, **binary search** reduces it to O(log n). Always check if sorting first would optimize your solution.",
      "**Common array problems** include Two Sum, Maximum Subarray (Kadane's algorithm), Merge Intervals, and Rotate Array. These build fundamental problem-solving skills.",
    ],
    "linked-lists": [
      "**Linked Lists** store elements as nodes, each pointing to the next. Unlike arrays, they don't require contiguous memory, allowing O(1) insertions and deletions at known positions.",
      "**Singly vs Doubly**: Singly linked lists have a `next` pointer; doubly linked lists add a `prev` pointer. Doubly linked lists allow backward traversal but use more memory.",
      "**The runner (two-pointer) technique** is essential: use a fast and slow pointer to detect cycles (Floyd's algorithm), find the middle element, or determine the nth node from the end.",
      "**Reversal** of a linked list is a classic problem. It can be done iteratively with three pointers (prev, curr, next) in O(n) time and O(1) space.",
      "**Common problems** include Merge Two Sorted Lists, Remove Nth Node From End, Detect Cycle, and LRU Cache implementation using a doubly linked list with a hash map.",
    ],
    trees: [
      "**Trees** are hierarchical data structures with a root node and child nodes. A **Binary Tree** has at most 2 children per node. **Binary Search Trees (BST)** maintain ordering: left < parent < right.",
      "**Tree traversals** come in three main types: **Inorder** (left-root-right), **Preorder** (root-left-right), and **Postorder** (left-right-root). **Level-order** uses BFS with a queue.",
      "**BST operations** (search, insert, delete) average O(log n) but degrade to O(n) for skewed trees. **Balanced BSTs** like AVL and Red-Black trees guarantee O(log n).",
      "**Recursion** is the natural approach for tree problems. Most tree algorithms follow the pattern: process root, recurse left, recurse right (or variations thereof).",
      "**Common problems** include Maximum Depth, Validate BST, Lowest Common Ancestor, Serialize/Deserialize, and Path Sum. Understanding subtree decomposition is key.",
    ],
  };

  return fallbacks[topicId] || [
    `**${topicId}** is an important concept in computer science. Study the core operations and their time complexities.`,
    "Practice implementing basic operations from scratch to build intuition.",
    "Analyze time and space complexity for each operation.",
    "Study common interview problems related to this topic.",
    "Compare this data structure with alternatives to understand when to use it.",
  ];
}

module.exports = router;
