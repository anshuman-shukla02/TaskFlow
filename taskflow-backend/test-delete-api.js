require('dotenv').config({ path: __dirname + '/.env' });
const jwt = require('jsonwebtoken');

async function testDelete() {
  const token = jwt.sign({ id: "69c0eb0e8f0210d955469992", role: "faculty" }, process.env.JWT_SECRET);
  
  const resList = await fetch('http://localhost:5002/api/materials', { 
    headers: { Authorization: "Bearer " + token }
  });
  const dataList = await resList.json();
  
  if (dataList.materials && dataList.materials.length > 0) {
    const matId = dataList.materials[0]._id;
    console.log("Attempting to delete:", matId);
    
    const resDel = await fetch(`http://localhost:5002/api/materials/${matId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });
    
    const dataDel = await resDel.json();
    console.log("Delete Response:", dataDel);
  } else {
    console.log("No materials to delete");
  }
}

testDelete();
