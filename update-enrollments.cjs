const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb+srv://foxsesstudio_db_user:rjkfWO6D9DBaIn1G@all-project.c1hsiaw.mongodb.net/tutor-space?appName=all-project');
  const db = mongoose.connection.db;
  try {
    const result = await db.collection('enrollments').updateMany(
      {},
      { $set: { paymentStatus: 'completed' } }
    );
    console.log(`Updated ${result.modifiedCount} enrollments to completed.`);
  } catch (err) {
    console.error(err);
  }
  await mongoose.disconnect();
}
run();
