import React from 'react';
import { ComparisonData } from '../types';
import { ChevronRight } from 'lucide-react';

interface StudentTableProps {
  students: ComparisonData[];
  selectedUsn: string | null;
  onSelect: (student: ComparisonData) => void;
  className?: string;
}

const StudentTable: React.FC<StudentTableProps> = ({ students, selectedUsn, onSelect, className }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col ${className || 'h-full'}`}>
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Student List</h2>
        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
          {students.length} Students
        </span>
      </div>
      
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">USN</th>
              <th className="px-4 py-3 font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Model Accuracy</th>
              <th className="px-4 py-3 font-medium text-gray-500 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => {
              const isSelected = selectedUsn === student.usn;
              const accuracyColor = 
                student.averageAccuracy >= 90 ? 'text-green-600' :
                student.averageAccuracy >= 75 ? 'text-yellow-600' : 
                'text-red-600';

              return (
                <tr 
                  key={student.usn}
                  onClick={() => onSelect(student)}
                  className={`
                    cursor-pointer transition-colors duration-150
                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{student.usn}</td>
                  <td className="px-4 py-3 text-gray-600">{student.name}</td>
                  <td className={`px-4 py-3 text-right font-bold ${accuracyColor}`}>
                    {student.averageAccuracy.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {isSelected && <ChevronRight className="w-4 h-4 text-blue-500" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;