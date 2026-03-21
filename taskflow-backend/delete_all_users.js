// delete_all_users.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/amep';
const client = new MongoClient(uri);

async function clearDatabase() {
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const name = collection.name;
      const result = await db.collection(name).deleteMany({});
      console.log(`Deleted ${result.deletedCount} documents from ${name}.`);
    }
    
    console.log('Database cleared successfully.');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    await client.close();
  }
}

clearDatabase();
