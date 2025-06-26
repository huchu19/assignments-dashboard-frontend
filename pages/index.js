import { useEffect, useState } from 'react';
import Head from 'next/head';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Custom tick renderer for responsive XAxis
const ResponsiveTick = (props) => {
  const { x, y, payload } = props;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor={isMobile ? 'end' : 'middle'}
        fill="#fff"
        fontSize={isMobile ? 8 : 12}
        transform={isMobile ? 'rotate(-45)' : ''}
      >
        {payload.value}
      </text>
    </g>
  );
};

export default function Home() {
  const [enrollment, setEnrollment] = useState('');
  const [secretCode, setSecretCode] = useState(''); 
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [hasSearched, setHasSearched] = useState(false); // Track if search was attempted
  const [credentialsValid, setCredentialsValid] = useState(false); // Track if credentials are valid

  // Autofocus enrollment input on page load
  useEffect(() => {
    document.getElementById("enrollment-input")?.focus();
  }, []);

  // Apply background filter when results are displayed
  useEffect(() => {
    const bodyBefore = document.querySelector('body::before');
    if (filteredData) {
      document.body.classList.add('filtered');
    } else {
      document.body.classList.remove('filtered');
    }
  }, [filteredData]);

  // Function to reset page to home state
  const resetToHome = () => {
    setFilteredData(null);
    setEnrollment('');
    setSecretCode('');
    setHasSearched(false);
    setCredentialsValid(false);
    document.body.classList.remove('filtered');
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true); 
    setCredentialsValid(false); // Reset credentials validation
  
    try {
      const res = await fetch("/api/fetchAssignments");

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
  
      const { assignments, auth } = await res.json(); 
  
      if (!assignments || !auth) throw new Error("Missing data from API");

      // Secret Code 
      const authHeader = auth[0];
      const authRows = auth.slice(1);
      const authMatch = authRows.find(
        (row) =>
          row[0]?.trim() === enrollment.trim() &&
          row[1]?.trim() === secretCode.trim()
      );

      if (!authMatch) {
        setFilteredData(null);
        return;
      }

      setCredentialsValid(true);

      // Process assignment data
      const headers = assignments[0];
      const rows = assignments.slice(1);
  
      const matches = rows.filter(
        (row) => row[0]?.trim() === enrollment.trim()
      );
  
      if (!matches.length) {
        setFilteredData(null);
        return;
      }
  
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
      console.error("❌", err); 
      setFilteredData(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper for responsive X-axis ticks
  function getXTicks(assignments) {
    if (typeof window === 'undefined' || !assignments) return [];
    const isMobile = window.innerWidth < 640;
    if (!isMobile) return assignments.map(a => a.assignment);
    // Show only first, last, and every 2nd assignment on mobile
    return assignments.map(a => a.assignment).filter((a, i, arr) => i === 0 || i === arr.length - 1 || i % 2 === 0);
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Main component
  return (
    <>
      <Head>
        <title>Assignments Dashboard</title>
        <meta name="description" content="Check student assignment marks and attempts" />
      </Head>

      <main className="dashboard-container">
        <h1 
          className={`dashboard-header ${filteredData ? 'clickable-title' : ''}`}
          onClick={filteredData ? resetToHome : undefined}
        >
          ASSIGNMENTS DASHBOARD
        </h1>

        {!filteredData && (
          <div className="input-row">
            <input
              id="enrollment-input"
              className="input-field"
              placeholder="Enter Enrollment No"
              value={enrollment}
              onChange={(e) => setEnrollment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <input
              className="input-field"
              placeholder="Enter Secret Code"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="search-button">
              Search
            </button>
          </div>
        )}

        {loading && <p className="text-gray-500 text-center">Loading...</p>}

        {filteredData && (
          <>
            <div className="animate-fadeInUp student-card">

            <div className="student-info-grid">
              <div>
                <h2>
                  <span className="student-info-label">Name:</span>{' '}
                  <span className="student-info-value">{filteredData.name}</span>
                </h2>
              </div>
              <div>
                <h2>
                  <span className="student-info-label">Phone:</span>{' '}
                  <span className="student-info-value">{filteredData.phone}</span>
                </h2>
              </div>
            
            </div>
              <table className="assignment-table">
                <thead>
                  <tr>
                    <th className="assignment-th">Assignment</th>
                    <th className="assignment-th">Best Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.assignments.map((a, i) => (
                    <tr key={i} className={i % 2 === 0 ? "assignment-td-even" : "assignment-td-odd"}>
                      <td className="assignment-td">{a.assignment}</td>
                      <td className="assignment-td">{a.marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Data Visualization Section */}
              <div className="visualization-section">
                <h3 className="viz-title">Performance Analytics</h3>
                
                {/* Assignment Performance Chart */}
                <div className="chart-container">
                  <h4 className="chart-title">Assignment Performance</h4>
                  <div className="chart-responsive-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredData.assignments}  activeIndex={-1}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={true} />
                        <XAxis 
                          dataKey="assignment" 
                          stroke="#fff" 
                          fontSize={isMobile ? 10 : 12}
                          tick={{ fill: '#fff' }}
                          ticks={getXTicks(filteredData.assignments)}
                          interval={0}
                        />
                        <YAxis 
                          stroke="#fff" 
                          fontSize={12}
                          tick={{ fill: '#fff' }}
                          domain={[0, 100]}
                          ticks={[0,10,20,30,40,50,60,70,80,90,100]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1a1a2e', 
                            border: '1px solid #444',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Bar 
                          dataKey="marks" 
                          fill="#ec4899" 
                          radius={[4, 4, 0, 0]}
                          activeBar={false}
                          activeShape={() => null}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="progress-section">
                  <h4 className="chart-title">Overall Progress</h4>
                  <div className="progress-grid">
                    <div className="progress-item">
                      <div className="progress-label">Total Score</div>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar" 
                          style={{ 
                            width: `${Math.min((filteredData.totalMarks / (filteredData.attempted * 100)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                      <div className="progress-value">{filteredData.totalMarks}/{filteredData.attempted * 100}</div>
                    </div>
                    
                    <div className="progress-item">
                      <div className="progress-label">Average Performance</div>
                      <div className="progress-bar-container">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${Math.min(parseFloat(filteredData.averageMarks), 100)}%` }}
                        ></div>
                      </div>
                      <div className="progress-value">{filteredData.averageMarks}%</div>
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="summary-section">
                  <h4 className="chart-title">Performance Summary</h4>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="summary-number">{filteredData.attempted}</div>
                      <div className="summary-label">Assignments Completed</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">{filteredData.averageMarks}%</div>
                      <div className="summary-label">Percentage</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        {filteredData.assignments.filter(a => a.marks >= 80).length}
                      </div>
                      <div className="summary-label">High Scores (80%+)</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-number">
                        {filteredData.assignments.filter(a => a.marks < 60).length}
                      </div>
                      <div className="summary-label">Needs Improvement</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              className="print-results-button"
              onClick={() => window.print()}
              style={{ display: 'block', margin: '0 auto' }}
            >
              Print Results
            </button>
          </>
        )}

        {!loading && filteredData === null && hasSearched && enrollment && (
          <p className="error-message">
            {credentialsValid 
              ? "No assignment records found for this enrollment number." 
              : "Incorrect enrollment number or secret code."
            }
          </p>
        )}
      </main>
    </>
  );
}
