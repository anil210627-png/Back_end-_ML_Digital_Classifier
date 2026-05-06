/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw,
  BookOpen,
  PieChart,
  School,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type SubjectStat, SUBJECT_MAP } from './types.ts';
import { cn } from './lib/utils.ts';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<Record<string, SubjectStat> | null>(null);
  const [overallPI, setOverallPI] = useState<number | null>(null);
  const [overallPassRate, setOverallPassRate] = useState<number | null>(null);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePI = (stat: SubjectStat) => {
    if (stat.totalPresent === 0) return 0;
    // Points based on your formula: A1*8, A2*7, B1*6, B2*5, C1*4, C2*3, D*2
    const points = (stat.A1 * 8) + (stat.A2 * 7) + (stat.B1 * 6) + (stat.B2 * 5) + (stat.C1 * 4) + (stat.C2 * 3) + (stat.D * 2);
    const max = stat.totalPresent * 8;
    return (points / max) * 100;
  };

  const processText = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const lines = text.split('\n');
      const subjectStats: Record<string, SubjectStat> = {};
      const uniqueRolls = new Set<string>();
      let totalPasses = 0;
      
      const rollRegex = /\b\d{7,9}\b/;
      const codeRegex = /\b\d{3}\b/g;
      const resultRegex = /\b(\d{2,3})\s+([A-E][1-2]?)\b/g;

      let currentRoll: string | null = null;
      let currentCodes: string[] = [];
      let studentResults: { code: string, grade: string }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const rollMatch = line.match(rollRegex);
        
        if (rollMatch) {
          // Finalize previous student
          if (currentRoll && studentResults.length > 0) {
            if (!studentResults.some(r => r.grade === 'E')) totalPasses++;
            uniqueRolls.add(currentRoll);
          }

          currentRoll = rollMatch[0];
          // Extract codes from this line (excluding the roll)
          const allNumbers = line.match(/\b\d{7,9}|\d{3}\b/g) || [];
          currentCodes = allNumbers.filter(n => n.length === 3);
          studentResults = [];
          
          // Scan subsequent lines for results matching these codes
          let j = i + 1;
          while (j < lines.length && studentResults.length < currentCodes.length) {
            const nextLine = lines[j].trim();
            if (nextLine.match(rollRegex)) break;
            
            const results = [...nextLine.matchAll(resultRegex)];
            results.forEach(match => {
              const [, , grade] = match;
              const idx = studentResults.length;
              if (idx < currentCodes.length) {
                const code = currentCodes[idx];
                const g = grade.toUpperCase();
                studentResults.push({ code, grade: g });

                if (!subjectStats[code]) {
                  subjectStats[code] = {
                    code,
                    name: SUBJECT_MAP[code] || `Sub ${code}`,
                    A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E: 0,
                    totalPresent: 0, passCount: 0, pointsEarned: 0, maxPoints: 0, pi: 0, passPercentage: 0
                  };
                }

                const stat = subjectStats[code];
                stat.totalPresent++;
                if (g === 'A1') stat.A1++;
                else if (g === 'A2') stat.A2++;
                else if (g === 'B1') stat.B1++;
                else if (g === 'B2') stat.B2++;
                else if (g === 'C1') stat.C1++;
                else if (g === 'C2') stat.C2++;
                else if (g.startsWith('D')) stat.D++;
                else if (g === 'E') stat.E++;

                if (g !== 'E') stat.passCount++;
              }
            });
            j++;
          }
          i = j - 1;
        }
      }

      if (currentRoll && studentResults.length > 0) {
        if (!studentResults.some(r => r.grade === 'E')) totalPasses++;
        uniqueRolls.add(currentRoll);
      }

      if (Object.keys(subjectStats).length === 0) {
        throw new Error("No data found. Ensure the file has subject codes followed by result pairs (e.g., 301 ... next line ... 081 B2).");
      }

      const totalStudents = uniqueRolls.size || (Object.values(subjectStats)[0]?.totalPresent || 0);

      const finalStats = Object.keys(subjectStats).sort().reduce((acc, code) => {
        const stat = subjectStats[code];
        stat.pointsEarned = (stat.A1 * 8) + (stat.A2 * 7) + (stat.B1 * 6) + (stat.B2 * 5) + (stat.C1 * 4) + (stat.C2 * 3) + (stat.D * 2);
        stat.maxPoints = stat.totalPresent * 8;
        stat.pi = calculatePI(stat);
        stat.passPercentage = (stat.passCount / stat.totalPresent) * 100;
        acc[code] = stat;
        return acc;
      }, {} as Record<string, SubjectStat>);

      const totalPointsEarned = Object.values(finalStats).reduce((sum, s) => sum + s.pointsEarned, 0);
      const totalMaxPossible = Object.values(finalStats).reduce((sum, s) => sum + s.maxPoints, 0);

      setData(finalStats);
      setTotalStudentsCount(totalStudents);
      setOverallPI(totalMaxPossible > 0 ? (totalPointsEarned / totalMaxPossible) * 100 : 0);
      setOverallPassRate(totalStudents > 0 ? (totalPasses / totalStudents) * 100 : 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processText(text);
      };
      reader.readAsText(uploadedFile);
    }
  };

  const exportToExcel = () => {
    if (!data) return;

    const exportData = (Object.values(data) as SubjectStat[]).map(s => ({
      'Subject Code': s.code,
      'Subject Name': s.name,
      'Total Stud.': s.totalPresent,
      'A1': s.A1,
      'A2': s.A2,
      'B1': s.B1,
      'B2': s.B2,
      'C1': s.C1,
      'C2': s.C2,
      'D': s.D,
      'E (Fail)': s.E,
      'Points Earned': s.pointsEarned,
      'Max Possible': s.maxPoints,
      'Pass %': s.passPercentage.toFixed(2),
      'PI': s.pi.toFixed(2)
    }));

    // Add overview row
    exportData.push({
      'Subject Code': 'OVERALL',
      'Subject Name': 'School Performance',
      'Total Stud.': totalStudentsCount,
      'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0, 'D': 0, 'E (Fail)': 0,
      'Pass %': overallPassRate?.toFixed(2) || '0',
      'PI': overallPI?.toFixed(2) || '0'
    } as any);

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `CBSE_PI_Report_${new Date().getFullYear()}.xlsx`);
  };

  const reset = () => {
    setFile(null);
    setData(null);
    setError(null);
    setOverallPI(null);
    setOverallPassRate(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex p-3 bg-blue-600 rounded-2xl mb-4 text-white shadow-lg shadow-blue-200">
            <School size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-800 mb-2">
            CBSE Performance Index Calculator
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Upload your Class 12 result text file to instantly calculate subject-wise and school PI metrics.
          </p>
        </motion.header>

        <AnimatePresence mode="wait">
          {!data ? (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 transition-all hover:border-blue-400 group relative">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload Result Text File</h3>
                  <p className="text-slate-400 mb-6">
                    Drag and drop your .txt file here or click to browse
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-500">Fixed Width Text</span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-500">CBSE Bulk Format</span>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-50 border border-red-100 border-l-4 border-l-red-500 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Processing Error</h4>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Overall Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                    <PieChart size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">School PI</p>
                    <p className="text-2xl font-black text-slate-800">{overallPI?.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pass Rate</p>
                    <p className="text-2xl font-black text-slate-800">{overallPassRate?.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Subjects</p>
                    <p className="text-2xl font-black text-slate-800">{Object.keys(data).length}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
                    <p className="text-2xl font-black text-slate-800">{totalStudentsCount}</p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-100 gap-4">
                <div className="flex items-center gap-2 px-2">
                  <FileText className="text-blue-500" size={20} />
                  <span className="text-sm font-medium text-slate-600 truncate max-w-[200px]">{file?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-2xl text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2"
                  >
                    <RefreshCcw size={16} /> New File
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-100 transition-all flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} /> Export to Excel
                  </button>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Code</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Subject Name</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Total</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">A1</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">A2</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">B1</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">B2</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">C1</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">C2</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">D</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center text-red-500">E</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase bg-blue-50/50 text-blue-600">Points</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase">Pass %</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase bg-blue-100/50 text-blue-800">PI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(Object.values(data) as SubjectStat[]).map((stat) => (
                        <motion.tr 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={stat.code} 
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-4">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {stat.code}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-800 text-sm">{stat.name}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-slate-600">{stat.totalPresent}</p>
                          </td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.A1}</td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.A2}</td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.B1}</td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.B2}</td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.C1}</td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.C2}</td>
                          <td className="p-2 text-center text-sm font-semibold text-slate-700">{stat.D}</td>
                          <td className="p-2 text-center text-sm font-bold text-red-600">{stat.E}</td>
                          <td className="p-4 bg-blue-50/30">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800">{stat.pointsEarned}/{stat.maxPoints}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="relative pt-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-400">
                                  {stat.passPercentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 bg-blue-100/20">
                            <p className="text-lg font-black text-blue-700">{stat.pi.toFixed(2)}</p>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Section */}
        <section className="mt-16 bg-white rounded-3xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-blue-600" />
            Calculation Methodology
          </h3>
          <div className="grid md:grid-cols-2 gap-8 text-sm text-slate-600 leading-relaxed">
            <div>
              <p className="mb-4">
                The **Performance Index (PI)** is calculated by assigning weightage points to each student based on their board grade, then dividing by the maximum possible points.
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono text-xs">
                Formula Index: <br/>
                Sum(Grade Points) / (Total Students * 8) * 100
              </div>
            </div>
            <div>
              <ul className="space-y-2">
                <li className="flex justify-between border-b border-slate-100 pb-1"><span>Grade A1</span> <span className="font-bold">8 Points</span></li>
                <li className="flex justify-between border-b border-slate-100 pb-1"><span>Grade A2</span> <span className="font-bold">7 Points</span></li>
                <li className="flex justify-between border-b border-slate-100 pb-1"><span>Grade B1</span> <span className="font-bold">6 Points</span></li>
                <li className="flex justify-between border-b border-slate-100 pb-1"><span>Grade B2</span> <span className="font-bold">5 Points</span></li>
                <li className="flex justify-between border-b border-slate-100 pb-1"><span>Grade C1</span> <span className="font-bold">4 Points</span></li>
                <li className="flex justify-between border-b border-slate-100 pb-1"><span>Grade C2</span> <span className="font-bold">3 Points</span></li>
                <li className="flex justify-between"><span>Grade D1/D2</span> <span className="font-bold">2 Points</span></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

