import React, { useState, useMemo } from 'react';
import FileUploader from './components/FileUploader';
import StudentTable from './components/StudentTable';
import AccuracyChart from './components/AccuracyChart';
import { parseCSV, mergeDatasets, generateCSVReport } from './utils/csvHelper';
import { ComparisonData, OverallAnalysis } from './types';
import { generateStudentInsight } from './services/geminiService';
import { BarChart3, Calculator, Sparkles, AlertTriangle, FileText, Download, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [predictedFile, setPredictedFile] = useState<File | null>(null);
  
  const [data, setData] = useState<ComparisonData[]>([]);
  const [overallAnalysis, setOverallAnalysis] = useState<OverallAnalysis | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Computed overall stats
  const overallAccuracy = useMemo(() => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => acc + curr.averageAccuracy, 0);
    return sum / data.length;
  }, [data]);

  const handleProcessFiles = async () => {
    if (!actualFile || !predictedFile) return;
    setLoading(true);
    setError(null);
    setData([]);
    setOverallAnalysis(null);
    setSelectedStudent(null);
    setAiInsight(null);

    try {
      const [actualParsed, predictedParsed] = await Promise.all([
        parseCSV(actualFile),
        parseCSV(predictedFile)
      ]);

      if (actualParsed.data.length === 0) {
        throw new Error("The 'Actual Marks' file appears empty or could not be parsed. Please check if it contains a header row with 'USN' or 'Name'.");
      }
      if (predictedParsed.data.length === 0) {
        throw new Error("The 'Predicted Marks' file appears empty or could not be parsed. Please check if it contains a header row with 'USN' or 'Name'.");
      }

      const { students, overall } = mergeDatasets(actualParsed, predictedParsed);
      
      if (students.length === 0) {
        throw new Error("Matched subjects found, but NO matched students. \nHint: Ensure 'USN' or 'Student Name' columns contain identical values in both files (ignoring case/spaces).");
      }

      setData(students);
      setOverallAnalysis(overall);
      // Don't auto-select student anymore, show Dashboard by default
    } catch (err: any) {
      console.error(err);
      // Clean up error message
      const msg = err.message || "An error occurred while processing files.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (data.length === 0) return;
    const csvContent = generateCSVReport(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Detailed_Prediction_Analysis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGetInsight = async () => {
    if (!selectedStudent) return;
    setInsightLoading(true);
    try {
      const insight = await generateStudentInsight(selectedStudent);
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Failed to retrieve insights.");
    } finally {
      setInsightLoading(false);
    }
  };

  const handleStudentSelect = (student: ComparisonData) => {
    setSelectedStudent(student);
    setAiInsight(null); // Reset insight when student changes
  };

  const handleDeselectStudent = () => {
    setSelectedStudent(null);
  };

  // Prepare Chart Data
  const chartData = useMemo(() => {
    if (selectedStudent) {
      return selectedStudent.subjects.map(subject => ({
        subject,
        Actual: selectedStudent.actual[subject],
        Predicted: selectedStudent.predicted[subject]
      }));
    } else if (overallAnalysis) {
      return overallAnalysis.subjectStats.map(stat => ({
        subject: stat.subject,
        Actual: stat.meanActual,
        Predicted: stat.meanPredicted
      }));
    }
    return [];
  }, [selectedStudent, overallAnalysis]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer truncate" onClick={handleDeselectStudent}>
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 truncate">
              GradePredict
            </h1>
          </div>
          
          {data.length > 0 && (
            <div className="flex items-center gap-3">
              {/* Desktop Button */}
              <button 
                onClick={handleDownloadReport}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
              {/* Mobile Button */}
              <button 
                onClick={handleDownloadReport}
                className="flex sm:hidden items-center justify-center p-2 text-white bg-green-600 rounded-lg shadow-sm"
                title="Download Report"
              >
                <Download className="w-5 h-5" />
              </button>

              <div className="h-8 w-px bg-gray-200 mx-1 sm:mx-2"></div>
              
              {selectedStudent ? (
                <div className="flex flex-col items-end">
                   <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold">Student Acc.</span>
                   <span className={`font-bold text-base sm:text-lg ${selectedStudent.averageAccuracy > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedStudent.averageAccuracy.toFixed(1)}%
                   </span>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold">Global Acc.</span>
                  <span className={`font-bold text-base sm:text-lg ${overallAccuracy > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {overallAccuracy.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-hidden flex flex-col">
        
        {/* Upload Section */}
        {data.length === 0 ? (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="max-w-3xl mx-auto mt-6 sm:mt-12">
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
                <div className="text-center mb-8 sm:mb-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">Marks Prediction Evaluator</h2>
                  <p className="text-gray-500 text-base sm:text-lg">Upload your <strong>Actual</strong> and <strong>Predicted</strong> Marks CSV files.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8">
                  <FileUploader 
                    label="1. Actual Marks CSV" 
                    file={actualFile} 
                    onFileSelect={setActualFile} 
                  />
                  <FileUploader 
                    label="2. Predicted Marks CSV" 
                    file={predictedFile} 
                    onFileSelect={setPredictedFile} 
                  />
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm font-medium whitespace-pre-line">{error}</div>
                  </div>
                )}

                <button
                  onClick={handleProcessFiles}
                  disabled={!actualFile || !predictedFile || loading}
                  className={`
                    w-full py-3 sm:py-4 px-6 rounded-xl font-bold text-white shadow-lg text-lg
                    flex items-center justify-center gap-3 transition-all transform
                    ${(!actualFile || !predictedFile || loading) 
                      ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] hover:shadow-xl'}
                  `}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-5 h-5" />
                      Evaluate Accuracy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            
            {/* Left Sidebar: Student List (Desktop Only) */}
            <div className="hidden lg:flex lg:col-span-3 h-full flex-col min-h-0">
              <div 
                onClick={handleDeselectStudent}
                className={`
                  mb-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center gap-3 flex-shrink-0
                  ${!selectedStudent 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
                `}
              >
                <LayoutDashboard className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">Overall Dashboard</h3>
                  <p className={`text-xs ${!selectedStudent ? 'text-blue-100' : 'text-gray-400'}`}>
                    Global Metrics & Aggregates
                  </p>
                </div>
              </div>

              <StudentTable 
                students={data} 
                selectedUsn={selectedStudent?.usn || null}
                onSelect={handleStudentSelect}
                className="flex-1 min-h-0"
              />
            </div>

            {/* Right Main: Chart & Details */}
            <div className="col-span-1 lg:col-span-9 h-full flex flex-col gap-4 overflow-y-auto pb-4 pr-1 min-h-0">
              
              {/* Mobile Student Selector Dropdown */}
              <div className="lg:hidden flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select View</label>
                <div className="relative">
                  <select
                    value={selectedStudent?.usn || 'overall'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'overall') handleDeselectStudent();
                      else {
                        const st = data.find(s => s.usn === val);
                        if (st) handleStudentSelect(st);
                      }
                    }}
                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg shadow-sm bg-white"
                  >
                    <option value="overall">📊 Overall Dashboard</option>
                    <optgroup label="Students">
                      {data.map((student) => (
                        <option key={student.usn} value={student.usn}>
                          👤 {student.name} ({student.averageAccuracy.toFixed(1)}%)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {selectedStudent ? (
                /* ---------------- INDIVIDUAL STUDENT VIEW ---------------- */
                <>
                  <AccuracyChart 
                    data={chartData} 
                    title={`Performance: ${selectedStudent.name}`} 
                    subtitle={`Comparing Actual vs Predicted marks for ${selectedStudent.usn}`}
                    className="h-[300px] sm:h-[350px] lg:h-[400px] flex-shrink-0"
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Raw Data Table */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col order-2 xl:order-1">
                      <div className="mb-4 pb-2 border-b border-gray-100 flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            Subject-wise Breakdown
                          </h3>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left">
                              <th className="px-3 py-2 font-semibold text-gray-600 rounded-l-lg whitespace-nowrap">Subject</th>
                              <th className="px-3 py-2 font-semibold text-gray-600 text-right whitespace-nowrap">Actual</th>
                              <th className="px-3 py-2 font-semibold text-gray-600 text-right whitespace-nowrap">Predicted</th>
                              <th className="px-3 py-2 font-semibold text-gray-600 text-right rounded-r-lg whitespace-nowrap">Diff</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {selectedStudent.subjects.map(sub => {
                              const act = selectedStudent.actual[sub];
                              const pred = selectedStudent.predicted[sub];
                              const diff = pred - act;
                              const absDiff = Math.abs(diff);
                              
                              return (
                                <tr key={sub} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{sub}</td>
                                  <td className="px-3 py-2 text-right text-blue-600 font-medium font-mono">{act}</td>
                                  <td className="px-3 py-2 text-right text-pink-600 font-medium font-mono">{pred}</td>
                                  <td className={`px-3 py-2 text-right font-bold font-mono ${absDiff > 10 ? 'text-red-500' : absDiff > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {diff > 0 ? `+${diff}` : diff}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* AI Insights Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden flex flex-col order-1 xl:order-2">
                      <div className="relative z-10 flex-1 flex flex-col">
                        <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                          Gemini Analysis
                        </h3>
                        {!aiInsight && !insightLoading && (
                          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                            <button onClick={handleGetInsight} className="px-5 py-2.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-50 shadow-sm transition-colors">
                              Generate Insights
                            </button>
                            <p className="text-xs text-indigo-400 mt-2 max-w-xs">AI-powered breakdown of student performance trends.</p>
                          </div>
                        )}
                        {insightLoading && (
                          <div className="flex-1 flex flex-col items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                            <p className="text-sm text-indigo-600 animate-pulse font-medium">Analyzing...</p>
                          </div>
                        )}
                        {aiInsight && (
                          <div className="prose prose-sm prose-indigo text-indigo-800 bg-white/70 p-4 rounded-lg backdrop-blur-sm border border-indigo-100 flex-1 overflow-y-auto max-h-[250px] shadow-sm">
                             {aiInsight.split('\n').map((line, i) => (
                               <p key={i} className="mb-2 leading-relaxed last:mb-0">{line}</p>
                             ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ---------------- OVERALL DASHBOARD VIEW ---------------- */
                <>
                  <AccuracyChart 
                    data={chartData} 
                    title="Overall Performance by Subject" 
                    subtitle="Average Actual vs. Average Predicted Marks"
                    className="h-[300px] sm:h-[350px] lg:h-[400px] flex-shrink-0" 
                  />

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Subject-wise Statistics</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-4 py-3 font-semibold text-gray-600 rounded-l-lg whitespace-nowrap">Subject Code</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right whitespace-nowrap">Avg Actual</th>
                            <th className="px-4 py-3 font-semibold text-gray-600 text-right rounded-r-lg whitespace-nowrap">Avg Predicted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {overallAnalysis?.subjectStats.map(stat => (
                            <tr key={stat.subject} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{stat.subject}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{stat.meanActual.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{stat.meanPredicted.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;