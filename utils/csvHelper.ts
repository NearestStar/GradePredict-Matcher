import { StudentMarks, ParsedFile, ComparisonData, OverallAnalysis, SubjectStat } from '../types';

// Helper to clean strings for comparison
// aggressive normalization: lowercase, remove special chars
const normalizeHeader = (str: string) => {
  if (!str) return '';
  return str.trim().toLowerCase()
    .replace(/\s+total$/, '') // Remove " Total" at the end if present
    .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric (e.g. "BCS-501" -> "bcs501")
};

const normalizeUsn = (str: string) => {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Robust CSV Line Splitter to handle quoted fields containing commas
const splitCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, '').trim());
  return result;
};

export const parseCSV = async (file: File): Promise<ParsedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target?.result as string;
      if (!text) return resolve({ data: [], subjects: [] });

      // Remove Byte Order Mark (BOM) if present
      text = text.replace(/^\uFEFF/, '');

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 1) return resolve({ data: [], subjects: [] });

      // --- SMART HEADER DETECTION ---
      // We scan the first 15 lines to find a row that looks like a header.
      // A header row is defined as having a column that matches 'usn' or 'name'.
      
      let headerRowIndex = -1;
      let headers: string[] = [];
      let usnIndex = -1;
      let nameIndex = -1;

      // Common aliases
      const usnAliases = ['usn', 'roll', 'reg', 'id', 'studentid', 'rollno', 'registernumber', 'studentusn', 'usnno', 'regno', 'uid', 'admissionno', 'register no'];
      const nameAliases = ['name', 'studentname', 'fullname', 'student', 'candidate', 'student name', 'candidate name'];

      for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const row = splitCSVLine(lines[i]);
        const normalizedRow = row.map(normalizeHeader);

        // Check for USN column
        let uIdx = normalizedRow.findIndex(h => usnAliases.includes(h));
        // Weak check: contains 'usn'
        if (uIdx === -1) uIdx = normalizedRow.findIndex(h => h.includes('usn') || h.includes('roll'));

        // Check for Name column
        let nIdx = normalizedRow.findIndex(h => nameAliases.includes(h));
        // Weak check: contains 'name'
        if (nIdx === -1) nIdx = normalizedRow.findIndex(h => h.includes('name') || h.includes('student'));

        // Criteria: If we find USN, we are 90% sure. If we find Name, we are 50% sure.
        // We prioritize rows that have USN.
        if (uIdx !== -1) {
            headerRowIndex = i;
            headers = row;
            usnIndex = uIdx;
            nameIndex = nIdx; // might be -1, that's ok
            break;
        }
      }

      // Fallback: If no USN found, look for Name only (maybe unique ID is missing?)
      if (headerRowIndex === -1) {
          for (let i = 0; i < Math.min(lines.length, 15); i++) {
            const row = splitCSVLine(lines[i]);
            const normalizedRow = row.map(normalizeHeader);
            
            const nIdx = normalizedRow.findIndex(h => nameAliases.includes(h) || h.includes('name'));
            
            if (nIdx !== -1) {
                headerRowIndex = i;
                headers = row;
                nameIndex = nIdx;
                break;
            }
          }
      }

      // Final Fallback: Assume first row is header
      if (headerRowIndex === -1) {
          headerRowIndex = 0;
          headers = splitCSVLine(lines[0]);
          const normalizedHeaders = headers.map(normalizeHeader);
          usnIndex = normalizedHeaders.findIndex(h => h.includes('usn'));
          nameIndex = normalizedHeaders.findIndex(h => h.includes('name'));
      }

      // Identify Subject Columns (Anything that isn't USN or Name)
      // We also filter out empty header names
      const potentialSubjectIndices = headers.map((h, i) => i)
        .filter(i => i !== usnIndex && i !== nameIndex && headers[i].trim() !== '');
      
      const subjectNames = potentialSubjectIndices.map(i => headers[i].replace(/ Total$/i, '').trim());

      const data: StudentMarks[] = [];

      // Start parsing data from the row AFTER the header
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const row = splitCSVLine(lines[i]);
        
        // Skip empty rows or rows with drastically different column counts (metadata footer?)
        if (row.length === 0 || row.every(c => c === '')) continue;
        
        // Skip rows that don't have enough columns to cover the USN index
        if (usnIndex !== -1 && !row[usnIndex]) continue;

        const usn = usnIndex !== -1 ? row[usnIndex] : `Unknown-${i}`;
        const name = nameIndex !== -1 ? row[nameIndex] : `Student ${i}`;
        
        const subjects: Record<string, number> = {};
        let hasValidMarks = false;

        potentialSubjectIndices.forEach((index, arrIdx) => {
          const valStr = row[index] || '0';
          // aggressive number cleaning: "68 / 100" -> "68", "Absent" -> "0"
          const valClean = valStr.replace(/[^0-9.]/g, ''); 
          // If empty string after clean, it was probably text like "Ab", "Fail"
          const val = valClean === '' ? 0 : parseFloat(valClean);
          
          const subjectName = subjectNames[arrIdx];
          subjects[subjectName] = isNaN(val) ? 0 : val;
          
          if (!isNaN(val)) hasValidMarks = true;
        });

        // Only add if USN is valid or Name is valid
        if (normalizeUsn(usn).length > 0 || name.trim().length > 0) {
            data.push({ usn: usn.trim(), name: name.trim(), subjects });
        }
      }

      resolve({ data, subjects: subjectNames });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const mergeDatasets = (actual: ParsedFile, predicted: ParsedFile): { students: ComparisonData[], subjectList: string[], overall: OverallAnalysis } => {
  const subjectMap: Record<string, string> = {}; 
  const commonSubjects: string[] = [];

  const predSubjectsLower = predicted.subjects.map(s => ({ 
    original: s, 
    lower: normalizeHeader(s) 
  }));
  
  // Map subjects between files
  actual.subjects.forEach(actSub => {
    const actSubLower = normalizeHeader(actSub);
    if (!actSubLower) return;

    // Fuzzy Match subjects
    const match = predSubjectsLower.find(p => p.lower === actSubLower);
    
    if (match) {
      subjectMap[actSub] = match.original;
      commonSubjects.push(actSub);
    }
  });

  if (commonSubjects.length === 0) {
      // Diagnostic info
      const actualSample = actual.subjects.slice(0, 3).join(', ');
      const predSample = predicted.subjects.slice(0, 3).join(', ');
      throw new Error(`No matching subjects found. 
        Actual file has: [${actualSample}...], 
        Predicted file has: [${predSample}...]. 
        Ensure column names are similar (e.g., 'BCS501' matches 'BCS501 Total').`);
  }

  // Helper to process a match
  const processMatch = (actStudent: StudentMarks, predStudent: StudentMarks) => {
    let totalDiff = 0;
    let subjectCount = 0;
    const matchedPredictedSubjects: Record<string, number> = {};
    
    commonSubjects.forEach(sub => {
      const predSubName = subjectMap[sub];
      const actMark = actStudent.subjects[sub] || 0;
      const predMark = predStudent.subjects[predSubName] || 0;
      
      matchedPredictedSubjects[sub] = predMark;
      
      totalDiff += Math.abs(actMark - predMark);
      subjectCount++;
    });

    if (subjectCount === 0) return null;

    const mae = totalDiff / subjectCount;
    const accuracy = Math.max(0, 100 - mae);

    return {
      usn: actStudent.usn,
      name: actStudent.name,
      subjects: commonSubjects,
      actual: actStudent.subjects,
      predicted: matchedPredictedSubjects,
      totalError: totalDiff,
      averageAccuracy: accuracy
    };
  };

  // Strategy 1: Match by USN (Primary)
  let merged = actual.data.map(actStudent => {
    const actUsnNorm = normalizeUsn(actStudent.usn);
    if (!actUsnNorm) return null;

    const predStudent = predicted.data.find(p => normalizeUsn(p.usn) === actUsnNorm);
    if (!predStudent) return null;
    return processMatch(actStudent, predStudent);
  }).filter((item): item is ComparisonData => item !== null);

  // Strategy 2: If USN matching failed (0 matches), try Name matching (Fallback)
  if (merged.length === 0 && actual.data.length > 0) {
      console.warn("USN matching returned 0 results, attempting Name matching...");
      merged = actual.data.map(actStudent => {
        const actNameNorm = normalizeUsn(actStudent.name); // reusing normalizeUsn for strict alpha-numeric check
        if (!actNameNorm) return null;

        const predStudent = predicted.data.find(p => normalizeUsn(p.name) === actNameNorm);
        if (!predStudent) return null;
        return processMatch(actStudent, predStudent);
      }).filter((item): item is ComparisonData => item !== null);
  }

  // --- Calculate Overall Stats ---
  const subjectStats: SubjectStat[] = [];
  let totalSumAbsDiff = 0;
  let totalSumSqDiff = 0;
  let totalCount = 0;

  // Variables for R2 calculation
  let sumActual = 0;
  let sumActualSq = 0;
  let sumPredicted = 0;
  
  commonSubjects.forEach(sub => {
      let sumSubActual = 0;
      let sumSubPredicted = 0;
      let sumSubAbsDiff = 0;
      let sumSubSqDiff = 0;
      let subCount = 0;

      merged.forEach(student => {
          const act = student.actual[sub] ?? 0;
          const pred = student.predicted[sub] ?? 0;
          const diff = act - pred;

          sumSubActual += act;
          sumSubPredicted += pred;
          sumSubAbsDiff += Math.abs(diff);
          sumSubSqDiff += diff * diff;
          subCount++;

          // Global accumulators
          sumActual += act;
          sumActualSq += act * act;
          sumPredicted += pred;
      });

      if (subCount > 0) {
          subjectStats.push({
              subject: sub,
              meanActual: sumSubActual / subCount,
              meanPredicted: sumSubPredicted / subCount,
              mae: sumSubAbsDiff / subCount,
              rmse: Math.sqrt(sumSubSqDiff / subCount)
          });
      }

      totalSumAbsDiff += sumSubAbsDiff;
      totalSumSqDiff += sumSubSqDiff;
      totalCount += subCount;
  });

  const overallMAE = totalCount > 0 ? totalSumAbsDiff / totalCount : 0;
  const overallRMSE = totalCount > 0 ? Math.sqrt(totalSumSqDiff / totalCount) : 0;
  
  // R2 Score Calculation
  let overallR2 = 0;
  if (totalCount > 0) {
      const meanActual = sumActual / totalCount;
      const ssTotal = merged.reduce((acc, student) => {
          return acc + commonSubjects.reduce((subAcc, sub) => {
              const act = student.actual[sub] ?? 0;
              return subAcc + Math.pow(act - meanActual, 2);
          }, 0);
      }, 0);
      const ssRes = totalSumSqDiff;
      overallR2 = ssTotal !== 0 ? 1 - (ssRes / ssTotal) : 0;
  }

  const overall: OverallAnalysis = {
      mae: overallMAE,
      rmse: overallRMSE,
      r2: overallR2,
      subjectStats
  };

  return { students: merged, subjectList: commonSubjects, overall };
};

export const generateCSVReport = (students: ComparisonData[]): string => {
  if (students.length === 0) return '';

  const subjects = students[0].subjects;

  // Header: USN, Name, Model Accuracy, Subject1 (Actual), Subject1 (Predicted), ...
  let csvContent = "USN,Student Name,Model Accuracy (%)";
  
  subjects.forEach(sub => {
    csvContent += `,${sub} (Actual),${sub} (Predicted)`;
  });
  csvContent += "\n";

  // Data Rows
  students.forEach(student => {
    // Escape quotes in names
    const safeName = student.name.replace(/"/g, '""');
    let row = `"${student.usn}","${safeName}",${student.averageAccuracy.toFixed(2)}`;
    
    subjects.forEach(sub => {
      const act = student.actual[sub] ?? 0;
      const pred = student.predicted[sub] ?? 0;
      row += `,${act},${pred}`;
    });
    
    csvContent += row + "\n";
  });

  return csvContent;
};