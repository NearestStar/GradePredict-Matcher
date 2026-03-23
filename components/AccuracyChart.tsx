import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataPoint {
  subject: string;
  Actual: number;
  Predicted: number;
}

interface AccuracyChartProps {
  data: ChartDataPoint[];
  title: string;
  subtitle?: string;
  className?: string;
}

const AccuracyChart: React.FC<AccuracyChartProps> = ({ data, title, subtitle, className }) => {
  return (
    <div className={`w-full bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col ${className || 'h-[500px]'}`}>
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 line-clamp-1">
          {title}
        </h3>
        {subtitle && <p className="text-xs sm:text-sm text-gray-500 line-clamp-1">{subtitle}</p>}
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0, // Reduced bottom margin
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="subject" 
              stroke="#6b7280" 
              tick={{fontSize: 10, fontWeight: 500}}
              tickLine={false}
              dy={10}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              stroke="#6b7280" 
              tick={{fontSize: 11}} 
              tickLine={false}
              domain={[0, 'auto']} 
              width={40} // Increased width for marks like "100"
            />
            <Tooltip 
              cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [value.toFixed(1), '']}
            />
            <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: '12px' }} />
            
            <Line
              type="monotone"
              name="Actual"
              dataKey="Actual"
              stroke="#2563eb" // Blue 600
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              name="Predicted"
              dataKey="Predicted"
              stroke="#db2777" // Pink 600
              strokeWidth={3}
              strokeDasharray="5 5" // Dashed line
              dot={{ r: 4, fill: '#db2777', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AccuracyChart;