const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://foxsesstudio_db_user:rjkfWO6D9DBaIn1G@all-project.c1hsiaw.mongodb.net/tutor-space?appName=all-project');
  const db = mongoose.connection.db;
  try {
    const enrollments = await db.collection('enrollments').find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log(JSON.stringify(enrollments, null, 2));
  } catch (err) {
    console.error(err);
  }
  await mongoose.disconnect();
}
run();
