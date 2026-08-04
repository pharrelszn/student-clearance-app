import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Clear existing data
  await connection.execute('DELETE FROM departmentSignOffs');
  await connection.execute('DELETE FROM financeChecks');
  await connection.execute('DELETE FROM labChecks');
  await connection.execute('DELETE FROM sportsChecks');
  await connection.execute('DELETE FROM classroomChecks');
  await connection.execute('DELETE FROM dormChecks');
  await connection.execute('DELETE FROM clearances');
  await connection.execute('DELETE FROM students');

  // Insert demo students
  const students = [
    ['STU001', 'Alice Johnson', 'alice@university.edu', 'Computer Science', 2024],
    ['STU002', 'Bob Smith', 'bob@university.edu', 'Engineering', 2024],
    ['STU003', 'Carol Williams', 'carol@university.edu', 'Business Administration', 2024],
    ['STU004', 'David Brown', 'david@university.edu', 'Mathematics', 2024],
    ['STU005', 'Emma Davis', 'emma@university.edu', 'Physics', 2024],
  ];

  for (const student of students) {
    await connection.execute(
      'INSERT INTO students (studentId, name, email, program, graduationYear) VALUES (?, ?, ?, ?, ?)',
      student
    );
  }

  // Get student IDs
  const [studentRows] = await connection.execute('SELECT id, studentId FROM students');

  // Create clearances and department sign-offs
  for (const student of studentRows) {
    const [result] = await connection.execute(
      'INSERT INTO clearances (studentId, status, initiatedAt) VALUES (?, ?, NOW())',
      [student.id, 'in_progress']
    );

    const clearanceId = result.insertId;

    // Create department sign-offs
    const departments = ['finance', 'lab', 'sports', 'classroom', 'dorm'];
    for (const dept of departments) {
      await connection.execute(
        'INSERT INTO departmentSignOffs (clearanceId, department, status) VALUES (?, ?, ?)',
        [clearanceId, dept, 'pending']
      );
    }

    // Add finance check
    await connection.execute(
      'INSERT INTO financeChecks (clearanceId, outstandingBalance, description) VALUES (?, ?, ?)',
      [clearanceId, '15000.00', 'Tuition fees for final semester']
    );

    // Add lab check
    await connection.execute(
      'INSERT INTO labChecks (clearanceId, equipmentName, damageAmount, description) VALUES (?, ?, ?, ?)',
      [clearanceId, 'Microscope Lens', '5000.00', 'Cracked during experiment']
    );

    // Add sports check
    await connection.execute(
      'INSERT INTO sportsChecks (clearanceId, equipmentName, quantity, returned) VALUES (?, ?, ?, ?)',
      [clearanceId, 'Basketball', 1, false]
    );

    // Add classroom check
    await connection.execute(
      'INSERT INTO classroomChecks (clearanceId, itemName, damageAmount, description) VALUES (?, ?, ?, ?)',
      [clearanceId, 'Desk', '2000.00', 'Broken leg on desk in Room 204']
    );

    // Add dorm check
    await connection.execute(
      'INSERT INTO dormChecks (clearanceId, itemName, damageAmount, description) VALUES (?, ?, ?, ?)',
      [clearanceId, 'Window Blind', '3000.00', 'Damaged blind in Room 312']
    );
  }

  console.log('✅ Demo data seeded successfully!');
  console.log(`📚 Created ${students.length} students with clearance records`);
} catch (error) {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
} finally {
  await connection.end();
}
