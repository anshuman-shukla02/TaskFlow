const router = require("express").Router();
const auth = require("../middleware/auth");

// GET /api/topics/:topicId/notes — AI-generated notes
router.get("/:topicId/notes", auth, async (req, res) => {
  try {
    const { topicId } = req.params;

    // Map topic IDs to display names
    const topicNames = {
      arrays: "Arrays",
      strings: "Strings",
      "linked-lists": "Linked Lists",
      "stacks-queues": "Stacks and Queues",
      trees: "Trees",
      graphs: "Graphs",
      "dynamic-programming": "Dynamic Programming",
    };

    const topicName = topicNames[topicId] || topicId;

    const prompt = `You are an expert computer science tutor. Generate an in-depth, structured study guide for the topic "${topicName}" in Data Structures & Algorithms.

The guide must be highly detailed and divided into logical pages (typically 2 to 5 pages) to prevent overwhelming the student. Group conceptually related information onto the same page.
Page 1 should always be Introduction and Basics.
Subsequent pages should cover Core Operations, Complexities, Advanced Techniques, and Interview Strategies.

Format: Return ONLY a JSON array of arrays. Each inner array represents a page, and should contain 3-4 strings (paragraphs) explaining the concepts deeply. Use rich markdown formatting (bold, code blocks, etc). Do not include any text before or after the JSON.`;

    let notes;
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock_key_for_now") {
        throw new Error("Invalid or missing Gemini API Key");
      }

      const { generateContentWithFallback } = require("../utils/gemini");
      const { text } = await generateContentWithFallback({ prompt });

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
      [ 
        "### Introduction to Arrays\n\nAn **Array** is one of the most fundamental data structures in computer science. It is a linear layout of memory that stores a collection of elements, typically of the same data type. Because arrays are stored contiguously (side-by-side) in memory, the operating system can easily cache them, making iteration extremely fast from a hardware perspective.",
        "### Memory Layout\n\nWhen an array is allocated, the system reserves a single continuous block of memory. For example, if you create an array of 5 integers, and each integer takes 4 bytes, the system reserves 20 continuous bytes. The starting address is known, so accessing any element at index `i` is a simple math calculation: `address = start_address + (i * element_size)`. This guarantees exactly **O(1) time complexity** for random access.",
        "### Static vs. Dynamic Arrays\n\nIn languages like C or Java, standard arrays are **static**, meaning their size is fixed at creation. Languages like Python (`list`) or JavaScript (`Array`) provide **dynamic arrays**. A dynamic array automatically resizes itself when it gets full, usually by doubling its capacity and copying all old elements to a newly allocated memory block. While append operations are generally O(1), resizing takes O(N) time."
      ],
      [ 
        "### Core Operations & Complexities\n\n- **Accessing/Reading:** O(1) time. You instantly grab elements directly using their index `arr[i]`.\n- **Searching:** O(N) time for linear search. If the array is sorted, you can use **Binary Search** to find elements in O(log N) time.\n- **Insertion/Deletion (at the end):** O(1) time for dynamic arrays, as long as capacity permits.\n- **Insertion/Deletion (in the middle):** O(N) time. If you delete the first element, every subsequent element must be shifted one position to the left to fill the gap.",
        "### Multidimensional Arrays\n\nArrays can hold other arrays. A 2D array is essentially a matrix (rows and columns). In memory, languages handle these differently: C uses row-major order (flattening the matrix into a single 1D array), while Java uses arrays of pointers (each row is a separate array scattered in memory).",
        "### Common Trade-offs\n\n**Pros:** Fast access (O(1)), cache friendly, and extremely low memory overhead (no extra pointers needed like linked lists).\n**Cons:** Fixed size (in static arrays), expensive insertions and deletions at the front, and memory fragmentation if huge contiguous blocks are required."
      ],
      [ 
        "### The Two Pointer Technique\n\nThe **Two Pointer** technique is an essential pattern for array problems. By placing one pointer at the start (`i = 0`) and one at the end (`j = n - 1`), you can efficiently reverse an array, find pairs that sum to a target in a sorted array, or partition elements. This usually reduces O(N^2) naive solutions down to O(N).",
        "### Sliding Window Pattern\n\nWhen dealing with contiguous subarrays, the **Sliding Window** is your best friend. Instead of recalculating sums or conditions from scratch for every subarray, you maintain a 'window' of elements. As you move the window to the right, you simply add the new rightmost element and subtract the old leftmost element, achieving O(N) time.",
        "### Prefix Sums\n\nThe **Prefix Sum** technique involves creating a new array where each element at index `i` stores the sum of all elements from `0` to `i`. This allows you to answer multiple query sums for any subarray `arr[L...R]` in strictly O(1) time by computing `Prefix[R] - Prefix[L-1]`. It is widely used in competitive programming."
      ]
    ],
    "linked-lists": [
      [
        "### Introduction to Linked Lists\n\nA **Linked List** is a linear collection of data elements called **nodes**. Unlike arrays, these nodes are not stored contiguously in memory. Instead, each node contains two parts: the actual data, and a reference (or pointer) to the next node in the sequence.",
        "### Singly vs Doubly Linked Lists\n\nIn a **Singly Linked List**, each node only points forward. In a **Doubly Linked List**, each node contains pointers to both the next and previous nodes, meaning you can traverse backward at the cost of extra memory per node.\n\nThere are also **Circular Linked Lists** where the last node points back to the first node instead of `null`."
      ],
      [
        "### Operations & Complexities\n\n- **Access/Search:** O(N) time. Since nodes are scattered, you must traverse from the `head` node one-by-one until you find your target.\n- **Insertion/Deletion (at head):** O(1) time. Just change the `head` pointer. Extremely fast!\n- **Insertion/Deletion (in middle):** O(N) time to find the spot, but O(1) time to perform the actual pointer swap. Unlike arrays, no elements need to be shifted."
      ],
      [
        "### The Runner Technique (Fast & Slow Pointers)\n\nThe most important algorithm for Linked Lists is the **Fast and Slow Pointer** pattern (Floyd's algorithm). If one pointer steps forward by 2 nodes and another steps forward by 1 node, you can easily detect cycles (they will meet), find the exact middle of the list, or find the Kth node from the end in a single pass.",
        "### Sentinel (Dummy) Heads\n\nWhen inserting or deleting nodes in algorithms, modifying the `head` itself often causes edge cases. Using a **Dummy Head** (a fake node that points to the actual head) simplifies code immensely so you don't need special `if` conditions for the first element."
      ]
    ],
    trees: [
      [
        "### Introduction to Trees\n\nA **Tree** is a hierarchical data structure. It starts with a **Root** node, which branches off into child nodes. Algorithms frequently focus on **Binary Trees**, where each node has at most two children (left and right).",
        "### Binary Search Trees (BST)\n\nA **Binary Search Tree** is a specialized tree that enforces a strict ordering rule: For any given node, all values in its entire **Left Subtree** are strictly smaller, and all values in its **Right Subtree** are strictly greater. This allows binary search inside a tree, cutting the search space in half with each step."
      ],
      [
        "### Tree Traversals (DFS)\n\nDepth-First Search on a tree is usually done recursively:\n- **In-order (Left, Root, Right):** Visits nodes in strictly sorted ascending order in a BST.\n- **Pre-order (Root, Left, Right):** Excellent for copying a tree or serializing it.\n- **Post-order (Left, Right, Root):** Deletes a tree, since it processes children before parents."
      ],
      [
        "### Level-Order Traversal (BFS)\n\nBreadth-First Search traverses the tree layer by layer, from top to bottom. Instead of recursion, it is heavily reliant on a **Queue**. You push the root, pull it out, push its children, and repeat. This is the optimal way to find the shortest path or analyze tree depth.",
        "### Complexity & Self-Balancing Trees\n\nIf a BST is perfectly balanced, search/insert/delete take **O(log N)** time. However, if you insert sorted data, it degrades into a slanted line (like a Linked List), dropping to O(N). **AVL Trees** and **Red-Black Trees** exist to automatically rebalance themselves during insertions, guaranteeing O(log N) operations forever."
      ]
    ],
    strings: [
      [
        "### Text as Arrays\n\nIn memory, **Strings** are generally represented as an array of characters. Depending on the language, strings may be **immutable** (like Java or Python), meaning every modification creates an entirely new string, or **mutable** (like C++ `std::string`).",
        "### Character Encoding\n\nCharacters are mapped to integers using encodings like **ASCII** or **Unicode (UTF-8)**. ASCII uses 7 bits (0-127), making it incredibly fast to use a fixed-size `int[128]` array map for frequency counting algorithms instead of a slower Hash Map."
      ],
      [
        "### Common Trade-offs\n\nBecause strings are just arrays, looping, reversing, and accessing by index operates in O(N) or O(1) time. However, if strings are immutable, concatenation inside a loop results in an O(N^2) disaster. Always use `StringBuilder` or `.join()`.",
        "### Anagrams, Palindromes, and Substrings\n\nAlgorithms heavily rely on detecting palindromes (using two pointers: `left=0`, `right=N-1`) or identifying anagrams (by sorting strings or mapping character counts). Substring matching algorithms vary from O(N^2) naive scans to O(N) patterns like **KMP** or **Rabin-Karp**."
      ]
    ],
    "stacks-queues": [
      [
        "### The Concept of Stacks (LIFO)\n\nA **Stack** is a Last-In, First-Out data structure. Imagine a stack of plates—you can only push a new plate on top, and pop the topmost plate off. It allows O(1) insertion and deletion at one end. Stacks are the core backbone behind Depth-First Search and recursion/call stacks.",
        "### The Concept of Queues (FIFO)\n\nA **Queue** is First-In, First-Out. Think of a line at a grocery store—the first person to enter the line is the first one served. Queues allow O(1) enqueuing at the back and O(1) dequeuing from the front. They are fundamental to Breadth-First Search."
      ],
      [
        "### Mono-Stacks and Mono-Queues\n\nA **Monotonic Stack** enforces that elements are strictly increasing or decreasing inside the stack. This is the golden key algorithm for 'Next Greater Element' problems, drastically dropping O(N^2) nested loop checks down to an elegant O(N) pass.",
        "### Implementations\n\nWhile dynamic arrays work flawlessly for stacks, they are terrible for queues because removing the first element causes an O(N) shift. Real queues must be implemented using **Linked Lists** or completely circular arrays."
      ]
    ],
    graphs: [
      [
        "### Introducing Graphs\n\nA **Graph** consists of **Vertices (nodes)** connected by **Edges**. They can model networks, social connections, or maps. Unlike trees, graphs do not have a defined root, and they can contain **cycles** (paths that loop back on themselves).",
        "### Representation\n\nGraphs are mapped into code mostly using **Adjacency Lists** (an array of lists, mapping nodes to neighbors) or **Adjacency Matrices** (a 2D boolean grid). Adjacency lists are highly preferred for sparse graphs to save absolute O(V^2) memory."
      ],
      [
        "### Breadth-First vs Depth-First Search\n\n**DFS** burrows deep into a graph utilizing recursion or a Stack, excellent for cycle detection, topological sorting, and solving mazes.\n\n**BFS** spreads out evenly across layers using a Queue. BFS guarantees finding the immediate **shortest path** in an unweighted graph.",
        "### Advanced Graph Algorithms\n\nFor complex pathfinding, algorithms like **Dijkstra's** (using a Priority Queue for weighted edges) or **A*** are heavily tested. **Union-Find (Disjoint Set)** is an incredibly fast, specialized tree structure mathematically optimized to detect cycles and connect disparate graph components."
      ]
    ],
    "dynamic-programming": [
      [
        "### The DP Philosophy\n\n**Dynamic Programming (DP)** solves complex problems by breaking them into simpler, overlapping subproblems. If you compute an answer, you cache it. When that question is asked again, you return the cached response. This obliterates recursive branching from exponential O(2^N) to linear O(N).",
        "### Top-Down vs Bottom-Up\n\n**Top-Down (Memoization)** starts at the final goal and recurses downwards, using a Hash Map or Array to save parameters.\n\n**Bottom-Up (Tabulation)** completely abandons recursion. It starts with the smallest base cases (e.g., index 0) and builds an array upwards in a simple `for` loop."
      ],
      [
        "### Recognizing DP\n\nDP is almost always requested when a problem asks for finding the **Maximum, Minimum, or total Number of Ways** to do something, AND involves making choices at every step (e.g., 'Take it or Leave it'). Typical markers include Fibonacci, Knapsack problems, and Longest Common Subsequence.",
        "### Stateful DP\n\nThe trick to DP is determining the state. Often, a 1D array is enough (e.g., `dp[i]` is max profit at day `i`). For tracking two constraints, a 2D matrix `dp[i][j]` is formed. Space complexity can often be optimized from O(N) to strictly O(1) if you realize you only need the 'previous two states' at any given point in your loop."
      ],
      [
        "### Classic Problem Archetypes\n\nUnderstanding DP revolves around recognizing patterns:\n1. **0/1 Knapsack**: Pick an item or skip it.\n2. **Unbounded Knapsack**: Pick an item infinitely or skip it.\n3. **String DP**: Compare two strings character by character.\n4. **Matrix DP**: Pathfinding through distinct grids calculating sums."
      ]
    ],
  };

  return fallbacks[topicId] || [
    [
      `### ${topicId}\n\n**${topicId}** is an important concept in computer science. Study the core operations and their time complexities.`,
      "Practice implementing basic operations from scratch to build intuition."
    ],
    [
      "Analyze time and space complexity for each operation.",
      "Study common interview problems related to this topic."
    ]
  ];
}

module.exports = router;
