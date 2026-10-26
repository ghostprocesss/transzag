import React, { useState, useEffect } from 'react';
import { FileText, Save, Download, Eye, Clock, ShieldCheck, Check } from 'lucide-react';
import { saveReport, listSavedReports } from '../api';
import { DatasetStats, InvestigationFinding } from '../types';
import { formatTimestamp } from '../utils/formatters';

interface Props {
  stats: DatasetStats | null;
  findings: InvestigationFinding[];
}

export const ReportsView: React.FC<Props> = ({ stats, findings }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [title, setTitle] = useState('BlockScope Investigation Dossier - ' + new Date().toISOString().substring(0, 10));
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await listSavedReports();
      setReports(res);
      if (res.length > 0) {
        setSelectedReport(res[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAndSave = async () => {
    const findingsSummary = findings.map((f, i) => `
### ${i + 1}. [${f.severity}] ${f.title}
- **Pattern Type:** ${f.pattern_type}
- **Rule Description:** ${f.description}
- **Detection Metric:** ${f.detection_rule}
- **Involved Wallets (${f.involved_wallets.length}):**
${f.involved_wallets.map((w) => `  - \`${w}\``).join('\n')}
- **Evidentiary Note:** ${f.disclaimer}
`).join('\n');

    const markdown = `
# BLOCKSCOPE FORENSIC INVESTIGATION REPORT
**Generated:** ${new Date().toISOString()}  
**Classification:** RESTRICTED CYBER-INTELLIGENCE SUMMARY  
**System Engine:** BlockScope DAA Platform v1.0.4  

---

## 1. Executive Summary & Ledger Statistics
- **Total Transactions Analyzed:** ${stats?.total_transactions ?? 0}
- **Unique Wallets (Vertices |V|):** ${stats?.unique_wallets ?? 0}
- **Flagged Wallets for Review:** ${stats?.flagged_wallets_count ?? 0}
- **Detected Graph Anomalies:** ${stats?.detected_patterns_count ?? 0}
- **Adjacency Network Density:** ${stats?.density ?? 0}
- **Weakly Connected Components:** ${stats?.connected_components_count ?? 0}

---

## 2. Token Volume Distribution
${stats?.total_volume_by_token ? Object.entries(stats.total_volume_by_token).map(([k, v]) => `- **${k}:** ${v.toLocaleString()}`).join('\n') : 'No records'}

---

## 3. Detected Topological Graph Signals
${findingsSummary}

---

## 4. Legal & Forensic Notice
NOTICE: Algorithmic findings reflect mathematical graph anomalies (rings, rapid peeling chains, clustering) and do not constitute legal proof of illicit activity. Manual verification is required.
`;

    try {
      const res = await saveReport(title, markdown, {
        total_txs: stats?.total_transactions,
        total_findings: findings.length,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadMarkdown = (reportContent: string) => {
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blockscope_report_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Action Strip */}
      <div className="border border-[#132e1f] bg-[#050a07] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[280px]">
          <span className="text-[10px] text-[#5a8a6e]">REPORT DOSSIER TITLE:</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#030604] border border-[#132e1f] px-2 py-1 text-xs text-[#00ff66] focus:outline-none focus:border-[#00ff66] mt-1"
          />
        </div>

        <button
          onClick={handleGenerateAndSave}
          className="border border-[#00ff66] bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] px-4 py-2 font-bold transition-colors flex items-center space-x-1.5"
        >
          {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span>{savedSuccess ? 'SAVED TO SQLITE!' : '[GENERATE & SAVE TO SQLITE]'}</span>
        </button>
      </div>

      {/* Reports Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left List */}
        <div className="lg:col-span-4 border border-[#132e1f] bg-[#050a07] p-3 space-y-2 max-h-[600px] overflow-y-auto">
          <div className="text-[11px] text-[#00f0ff] font-bold border-b border-[#132e1f] pb-1 mb-2">
            PERSISTED INVESTIGATION DOSSIERS ({reports.length})
          </div>

          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedReport(r)}
              className={`border p-2.5 cursor-pointer transition-all ${
                selectedReport?.id === r.id
                  ? 'border-[#00f0ff] bg-[#00f0ff]/10'
                  : 'border-[#132e1f] bg-[#040805] hover:border-[#5a8a6e]'
              }`}
            >
              <div className="text-[#00ff66] font-bold text-xs">{r.title}</div>
              <div className="text-[10px] text-[#5a8a6e] mt-1 flex justify-between">
                <span>{r.report_type}</span>
                <span>{formatTimestamp(r.created_at)}</span>
              </div>
            </div>
          ))}

          {reports.length === 0 && (
            <div className="text-center p-6 text-[#5a8a6e]">
              No saved reports in database. Click generate above.
            </div>
          )}
        </div>

        {/* Right Preview */}
        <div className="lg:col-span-8 border border-[#132e1f] bg-[#050a07] p-4 flex flex-col justify-between">
          {selectedReport ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#132e1f] pb-2">
                <div>
                  <h3 className="text-[#00ff66] font-bold text-sm">{selectedReport.title}</h3>
                  <span className="text-[10px] text-[#5a8a6e]">
                    ID: {selectedReport.id} | CREATED: {formatTimestamp(selectedReport.created_at)}
                  </span>
                </div>

                <button
                  onClick={() => handleDownloadMarkdown(selectedReport.content_markdown || '')}
                  className="flex items-center space-x-1.5 border border-[#00f0ff] hover:bg-[#00f0ff]/10 text-[#00f0ff] px-3 py-1 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>EXPORT .MD</span>
                </button>
              </div>

              <div className="bg-[#030604] border border-[#132e1f] p-4 max-h-[480px] overflow-y-auto text-xs font-mono leading-relaxed select-text">
                <pre className="whitespace-pre-wrap text-[#88c5a0]">
                  {selectedReport.content_markdown || JSON.stringify(selectedReport, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#5a8a6e]">
              Select a report from the list to preview forensic markdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
