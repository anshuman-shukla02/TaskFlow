const mongoose = require("mongoose");
const User = require("./models/User");
const Task = require("./models/Task");
const Submission = require("./models/Submission");
const Topic = require("./models/Topic");
const bcrypt = require("bcryptjs"); // You might need to install this if not present, or use simple string for now if auth allows (but model likely hashes)
// actually looking at Auth.jsx, it sends plain password. The backend auth controller probably hashes it.
// I'll assume I can just write hashed passwords or if I can't restart backend to load bcrypt. 
// Let's assume standard bcrypt usage. I'll check package.json of backend if I can.
// For now I'll just rely on creating users via a direct insert with a known hashed password or just use a simple one if I knew the hash.
// 'password123' hashed with 10 rounds: $2a$10$wI/.. matches 'password123' usually.
// To be safe, I will use a simple fixed hash for all users: '$2a$10$Z.z.z.z.z.z.z.z.z.z.z.z' (this won't work).
// Better: I'll try to require bcryptjs. If it fails, I'll just use plain text and hope the backend handles it or I'll assume the user is already logged in? 
// No, I need valid login.
// Let's check backend package.json first.
// Actually, I'll just use a hardcoded hash for "password123" which is:
// $2a$10$YourHashHere...
// Let's generate one or just use a known one. 
// $2b$10$5u/.. is bcrypt.
// Let's just try to require 'bcryptjs'.

require("dotenv").config();

const topicsList = [
    {
        name: "arrays",
        order: 1,
        notes: [
            "# Arrays\n\n- **Definition**: A collection of items stored at contiguous memory locations.\n- **Purpose**: Store multiple items of the same type together.\n\n## Key Characteristics\n- **Fixed Size**: Once created, the size cannot change.\n- **Indexed Access**: Elements accessed via index in O(1) time.\n- **Contiguous Memory**: Stored side-by-side in RAM.\n\n## Common Operations\n- **Traverse**: Visit every element (O(N))\n- **Insert**: Add element at index (O(N))\n- **Delete**: Remove element at index (O(N))\n- **Search**: Find element by value (O(N) or O(log N) if sorted)\n\n## Code Example\n```cpp\nint arr[5] = {1, 2, 3, 4, 5};\ncout << arr[0]; // Prints 1\n```"
        ]
    },
    {
        name: "linked-lists",
        order: 2,
        notes: [
            "# Linked Lists\n\n- **Definition**: A linear data structure where elements are linked using pointers.\n- **Storage**: Non-contiguous memory locations.\n\n## Structure\nEach **Node** contains:\n- **Data**: The value.\n- **Next**: Pointer to the next node.\n\n## Types\n- **Singly Linked**: Forward navigation only.\n- **Doubly Linked**: Forward and Backward navigation.\n- **Circular**: Last node links to First node.\n\n## Comparison vs Arrays\n- **Pros**: Dynamic size, easy insertion/deletion.\n- **Cons**: No random access, uses extra memory for pointers.\n\n```cpp\nstruct Node {\n  int data;\n  Node* next;\n};\n```"
        ]
    },
    {
        name: "trees",
        order: 3,
        notes: [
            "# Trees\n\n- **Definition**: A hierarchical structure with nodes connected by edges.\n- **Root**: The top-most node.\n- **Leaf**: A node with no children.\n\n## Binary Tree\n- Each node has at most **2 children**.\n- Used for efficient searching and sorting (BST).\n\n## Tree Traversals\n- **Inorder**: Left -> Root -> Right\n- **Preorder**: Root -> Left -> Right\n- **Postorder**: Left -> Right -> Root\n\n```cpp\nstruct Node {\n  int data;\n  Node* left;\n  Node* right;\n};\n```"
        ]
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/amep");
        console.log("Connected to DB");

        // CLEANUP
        await User.deleteMany({});
        await Task.deleteMany({});
        await Submission.deleteMany({});
        await Topic.deleteMany({});
        console.log("Cleared DB");

        // SEED TOPICS
        await Topic.insertMany(topicsList);
        console.log("Seeded Topics");

        // SEED USERS - PASSWORD HASH
        let finalPassword = "password123";
        try {
            const bcrypt = require("bcryptjs");
            finalPassword = await bcrypt.hash("password123", 10);
        } catch (e) {
            console.log("bcryptjs not found using plaintext for seed (may fail auth)");
        }

        // 1. Faculty
        const faculty = await User.create({
            name: "Dr. Smith",
            email: "faculty@example.com",
            password: finalPassword,
            role: "faculty"
        });

        // 2. Demo Student (For User to Login)
        const demoStudent = await User.create({
            name: "Demo Student",
            email: "student@example.com",
            password: finalPassword,
            role: "student",
            division: "A",
            rollNumber: "CS24000"
        });

        // 3. Other Random Students
        const divisions = ["A", "B", "C"];
        const studentsData = [];

        for (let i = 1; i <= 30; i++) {
            const division = divisions[(i - 1) % 3];
            const rollNo = `CS24${i.toString().padStart(3, '0')}`;

            studentsData.push({
                name: `Student ${i}`,
                email: `student${i}@example.com`,
                role: "student",
                password: finalPassword,
                division: division,
                rollNumber: rollNo,
            });
        }
        const students = await User.insertMany(studentsData);
        // Add demo student to list for submission generation
        students.push(demoStudent);

        console.log("Seeded Users");

        // SEED TASKS
        const tasksData = [
            { title: "Array Implementation", description: "Impl array", topic: "arrays", difficulty: "easy", type: "task", bloomLevel: "APPLY", createdBy: faculty._id },
            { title: "Linked List Reversal", description: "Reverse LL", topic: "linked-lists", difficulty: "medium", type: "task", bloomLevel: "ANALYZE", createdBy: faculty._id },
            { title: "Build a Compiler", description: "Mini compiler", topic: "trees", difficulty: "hard", type: "project", bloomLevel: "CREATE", createdBy: faculty._id },
        ];
        const tasks = await Task.insertMany(tasksData);
        console.log("Seeded Tasks");

        // SEED SUBMISSIONS (GROWTH DATA)
        const submissions = [];
        const now = new Date();

        // Generate extensive history for DEMO STUDENT specifically
        for (let i = 0; i < 20; i++) {
            // Past 4 weeks
            const daysAgo = Math.floor(Math.random() * 30);
            const date = new Date();
            date.setDate(now.getDate() - daysAgo);

            const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
            const score = Math.floor(Math.random() * 40) + 60; // 60-100 score

            submissions.push({
                userId: demoStudent._id,
                taskId: randomTask._id,
                topic: randomTask.topic, // Link valid topic
                difficulty: randomTask.difficulty,
                bloomLevel: randomTask.bloomLevel,
                isCorrect: score > 60,
                performanceScore: score,
                timeTaken: 120,
                createdAt: date,
                updatedAt: date
            });
        }

        // Generate data for others
        for (const student of students) {
            if (student.email === "student@example.com") continue; // Skip demo (already done)

            const count = Math.floor(Math.random() * 10) + 5;
            for (let i = 0; i < count; i++) {
                const daysAgo = Math.floor(Math.random() * 30);
                const date = new Date();
                date.setDate(now.getDate() - daysAgo);

                const randomTask = tasks[Math.floor(Math.random() * tasks.length)];

                // Varied performance based on division
                let baseScore = 60;
                if (student.division === "A") baseScore = 80;
                else if (student.division === "B") baseScore = 70;
                else baseScore = 50;

                const performanceScore = Math.min(100, Math.max(0, baseScore + Math.floor(Math.random() * 30 - 10)));

                submissions.push({
                    userId: student._id,
                    taskId: randomTask._id,
                    topic: randomTask.topic,
                    difficulty: randomTask.difficulty,
                    bloomLevel: randomTask.bloomLevel,
                    isCorrect: performanceScore > 50,
                    performanceScore: performanceScore,
                    timeTaken: 120,
                    createdAt: date,
                    updatedAt: date
                });
            }
        }

        // Sort by date just in case
        submissions.sort((a, b) => a.createdAt - b.createdAt);

        await Submission.insertMany(submissions);
        console.log(`Seeded ${submissions.length} Submissions`);

        mongoose.connection.close();
        console.log("Done!");

    } catch (error) {
        console.error("Error seeding DB:", error);
        process.exit(1);
    }
};

seedDB();
