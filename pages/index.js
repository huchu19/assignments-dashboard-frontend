// pages/index.js
import { useEffect, useState } from 'react';
import Head from 'next/head';



export default function Home() {
  const [enrollment, setEnrollment] = useState('');
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
  
    try {
      
      // Correct API route
      const res = await fetch("/api/fetchAssignments");

      // If API call fails (404, 500, etc)
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
  
      const json = await res.json();
  
      // Validate structure
      if (!json.data || !Array.isArray(json.data)) {
        throw new Error("Invalid data format from API");
      }
  
      const data = json.data;  
      const headers = data[0];
      const rows = data.slice(1);
  
      // Filter by enrollment number
      const matches = rows.filter(
        
        (row) => row[0]?.trim() === enrollment.trim()
      );
  
      if (!matches.length) {
        setFilteredData(null);
        return;
      }
  
      // Process best marks per assignment
      const assignmentMap = new Map();
      matches.forEach((row) => {
        const assignment = row[4];
        const marks = parseFloat(row[5]);
        if (!assignmentMap.has(assignment) || marks > assignmentMap.get(assignment)) {
          assignmentMap.set(assignment, marks);
        }
      });
  
      const bestAttempts = Array.from(assignmentMap.entries()).map(
        ([assignment, marks]) => ({ assignment, marks })
      ).sort((a, b) => Number(a.assignment) - Number(b.assignment));
  
      const totalMarks = bestAttempts.reduce((sum, a) => sum + a.marks, 0);
      const averageMarks = (totalMarks / bestAttempts.length).toFixed(2);
  
      const result = {
        name: matches[0][1]?.trim() || "Unknown",
        phone: matches[0][3]?.trim() || "N/A",
        assignments: bestAttempts,
        totalMarks,
        averageMarks,
        attempted: bestAttempts.length,
      };
  
      setFilteredData(result);
  
    } catch (err) {
      alert("An error occurred while fetching assignment data. Check console for details.");
      setFilteredData(null);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <>
      <Head>
        <title>Assignment Dashboard</title>
        <meta name="description" content="Check student assignment marks and attempts" />
      </Head>

      <main className="dashboard-container">
        <h1 className="dashboard-header">Assignment Dashboard</h1>

        <div className="input-row">
          <input
            className="input-field"
            placeholder="Enter Enrollment No"
            value={enrollment}
            onChange={(e) => setEnrollment(e.target.value)}
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>

        {loading && <p className="text-gray-500 text-center">Loading...</p>}

        {filteredData && (
          <div className="student-card">
            <h2 className="student-info-title">Student Info</h2>
            <p><strong>Name:</strong> {filteredData.name}</p>
            <p><strong>Phone:</strong> {filteredData.phone}</p>
            <p><strong>Total Marks:</strong> {filteredData.totalMarks}</p>
            <p><strong>Average Marks:</strong> {filteredData.averageMarks}</p>
            <p><strong>Assignments Attempted:</strong> {filteredData.attempted}</p>

            <h3 className="student-info-title mt-6">Assignment Best Marks</h3>
            <table className="assignment-table">
              <thead>
                <tr>
                  <th className="assignment-th">Assignment</th>
                  <th className="assignment-th">Best Marks</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.assignments.map((a, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="assignment-td">{a.assignment}</td>
                    <td className="assignment-td">{a.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredData === null && enrollment && (
          <p className="error-message">
            No records found for Enrollment No: <strong>{enrollment}</strong>
          </p>
        )}
      </main>

    </>
  );
  
}
