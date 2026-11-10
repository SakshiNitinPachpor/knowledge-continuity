import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Document, Passage, ZipExtractionReport } from '../types';
import {
  FileText, Upload, CheckCircle2, AlertCircle,
  ChevronRight, X, FileUp, FolderArchive, Code2,
  GitBranch, Cpu, Link2, Trash2, Search, Filter,
  FileCheck2, FolderTree, ExternalLink, HelpCircle
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Active Upload Tab: 'documents' | 'zip' | 'code' | 'github' | 'hardware' | 'link'
  const [activeTab, setActiveTab] = useState<'documents' | 'zip' | 'code' | 'github' | 'hardware' | 'link'>('documents');

  // GitHub Import State
  const [githubUrl, setGithubUrl] = useState('');
  const [importingGithub, setImportingGithub] = useState(false);

  // Reference Link State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  // Passages viewer drawer
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loadingPassages, setLoadingPassages] = useState(false);

  // ZIP Extraction Report Modal
  const [zipReport, setZipReport] = useState<ZipExtractionReport | null>(null);

  const loadDocuments = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const docs = await api.listDocuments(projectId);
      setDocuments(docs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  // Standard Multi-File Upload (Documents & Code)
  const handleMultipleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isFolder: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !projectId) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const fileList = Array.from(files);
      if (fileList.length === 1) {
        const file = fileList[0];
        const folderPath = (file as any).webkitRelativePath ? (file as any).webkitRelativePath : '';
        const res = await api.uploadDocument(projectId, file, folderPath);
        setUploadSuccess(`Ingested '${res.original_name}'. Extracted ${res.claims_count} candidate claims.`);
      } else {
        const resList = await api.uploadMultipleDocuments(projectId, fileList);
        setUploadSuccess(`Batch uploaded and processed ${resList.length} files successfully.`);
      }
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ZIP Archive Upload & Safe Extraction
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Only .zip archives are supported for repository package extraction.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const report = await api.uploadZipArchive(projectId, file);
      setZipReport(report);
      setUploadSuccess(`ZIP archive extracted: ${report.processed_count} files processed into project knowledge, ${report.skipped_count} skipped.`);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'ZIP extraction failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // GitHub Import
  const handleGithubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim() || !projectId) return;

    setImportingGithub(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await api.importGithub(projectId, { repo_url: githubUrl.trim() });
      setUploadSuccess(res.message);
      setGithubUrl('');
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'GitHub import failed.');
    } finally {
      setImportingGithub(false);
    }
  };

  // Reference Link Creation
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim() || !linkTitle.trim() || !projectId) return;

    setAddingLink(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await api.addReferenceLink(projectId, {
        url: linkUrl.trim(),
        title: linkTitle.trim(),
        description: linkDesc.trim(),
        category: 'reference'
      });
      setUploadSuccess(`Reference link '${linkTitle}' added and indexed.`);
      setLinkUrl('');
      setLinkTitle('');
      setLinkDesc('');
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to add reference link.');
    } finally {
      setAddingLink(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string, name: string) => {
    if (!projectId) return;
    if (!confirm(`Are you sure you want to remove '${name}' from project knowledge?`)) return;

    try {
      await api.deleteDocument(projectId, docId);
      setUploadSuccess(`Deleted '${name}'.`);
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to delete file.');
    }
  };

  const handleViewPassages = async (doc: Document) => {
    if (!projectId) return;
    setSelectedDoc(doc);
    setLoadingPassages(true);
    try {
      const p = await api.getDocumentPassages(projectId, doc.id);
      setPassages(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPassages(false);
    }
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.folder_path && doc.folder_path.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.file_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#B9825A]" />
            Project Knowledge Ingestion Hub
          </h1>
          <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
            Ingest documents, code repositories, ZIP archives, hardware circuit diagrams, and reference links into evidence-grounded knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B] dark:text-gray-400 bg-white dark:bg-[#1B2432] px-3.5 py-1.5 rounded-xl border border-[#E5E1D8] dark:border-gray-800">
          <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>{documents.length} Assets Ingested</span>
        </div>
      </div>

      {/* Notifications */}
      {uploadSuccess && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
          <button onClick={() => setUploadSuccess(null)} className="cursor-pointer hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="cursor-pointer hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Modes Navigation Tabs */}
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft overflow-hidden">
        <div className="flex flex-wrap border-b border-[#E5E1D8] dark:border-gray-800 bg-[#F8F6F1]/50 dark:bg-gray-900/40">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'documents'
                ? 'border-[#B9825A] text-[#151923] dark:text-white bg-white dark:bg-[#1B2432]'
                : 'border-transparent text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Documents (PDF, Word, Excel, PPT)</span>
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'zip'
                ? 'border-[#B9825A] text-[#151923] dark:text-white bg-white dark:bg-[#1B2432]'
                : 'border-transparent text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <FolderArchive className="w-4 h-4 text-amber-500" />
            <span>ZIP / Project Folder Archive</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'code'
                ? 'border-[#B9825A] text-[#151923] dark:text-white bg-white dark:bg-[#1B2432]'
                : 'border-transparent text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-500" />
            <span>Source Code (Python, JS, C++, SQL...)</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'github'
                ? 'border-[#B9825A] text-[#151923] dark:text-white bg-white dark:bg-[#1B2432]'
                : 'border-transparent text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-4 h-4 text-purple-500" />
            <span>Import from GitHub</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-[#B9825A] text-[#151923] dark:text-white bg-white dark:bg-[#1B2432]'
                : 'border-transparent text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 text-rose-500" />
            <span>Hardware & Circuit Diagrams</span>
          </button>

          <button
            onClick={() => setActiveTab('link')}
            className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'link'
                ? 'border-[#B9825A] text-[#151923] dark:text-white bg-white dark:bg-[#1B2432]'
                : 'border-transparent text-[#64748B] dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4 text-indigo-500" />
            <span>Project Reference Links</span>
          </button>
        </div>

        {/* Tab 1: Documents Ingestion */}
        {activeTab === 'documents' && (
          <div className="p-8 text-center">
            <FileUp className="w-10 h-10 text-[#B9825A] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#151923] dark:text-white">Upload Project Specifications & Reports</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 mb-5 max-w-xl mx-auto">
              Supports <strong>PDF, DOCX, DOC, TXT, Markdown, CSV, XLSX, and PPTX</strong> up to 100MB. Headings, tables, and page boundaries are extracted for verifiable citations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Processing Documents...' : 'Select Documents (Multiple Supported)'}</span>
                <input
                  type="file"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleMultipleFileUpload(e, false)}
                  accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.pptx"
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: ZIP / Project Folder Ingestion */}
        {activeTab === 'zip' && (
          <div className="p-8 text-center">
            <FolderArchive className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#151923] dark:text-white">Upload ZIP Archive or Project Directory</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 mb-5 max-w-xl mx-auto">
              Extracts complete project packages safely with <strong>Zip Slip protection</strong> and <strong>compression bomb checks</strong>. Preserves original folder structures (e.g. <code>Backend/database.py</code>).
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft">
                <FolderArchive className="w-4 h-4" />
                <span>{uploading ? 'Extracting & Indexing ZIP...' : 'Select .ZIP Archive (Up to 100MB)'}</span>
                <input
                  type="file"
                  disabled={uploading}
                  onChange={handleZipUpload}
                  accept=".zip"
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-bold text-[#151923] dark:text-white hover:border-[#B9825A] transition shadow-xs">
                <FolderTree className="w-4 h-4 text-[#B9825A]" />
                <span>Upload Entire Project Folder</span>
                <input
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleMultipleFileUpload(e, true)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 3: Source Code Ingestion */}
        {activeTab === 'code' && (
          <div className="p-8 text-center">
            <Code2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#151923] dark:text-white">Upload Source Code & Architecture Files</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 mb-5 max-w-xl mx-auto">
              Supports <strong>Python (.py), JavaScript/TypeScript (.js, .ts, .tsx), C/C++ (.c, .cpp, .h), Java, SQL, JSON, YAML, Shell (.sh, .bat), and Jupyter Notebooks (.ipynb)</strong>. AST parsing extracts classes, functions, and dependencies. Code is never executed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft">
                <Code2 className="w-4 h-4" />
                <span>{uploading ? 'Parsing Source Code...' : 'Select Code Files (Multiple Supported)'}</span>
                <input
                  type="file"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleMultipleFileUpload(e, false)}
                  accept=".py,.c,.cpp,.h,.hpp,.java,.js,.jsx,.ts,.tsx,.html,.css,.sql,.json,.yaml,.yml,.xml,.sh,.bat,.ipynb"
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 4: GitHub Repository Import */}
        {activeTab === 'github' && (
          <div className="p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <GitBranch className="w-10 h-10 text-purple-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#151923] dark:text-white">Import from Public GitHub Repository</h3>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Fetches repository metadata, architecture specifications, and README without requiring third-party credentials.
              </p>
            </div>

            <form onSubmit={handleGithubImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  required
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/fastapi/fastapi"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-gray-400">
                <span>Public repositories require no setup.</span>
                <span className="italic">For private repositories, configure GITHUB_TOKEN in Settings.</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={importingGithub}
                  className="px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft cursor-pointer flex items-center gap-2"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>{importingGithub ? 'Fetching & Ingesting Repo...' : 'Import Repository'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Hardware & Circuit Diagrams */}
        {activeTab === 'hardware' && (
          <div className="p-8 text-center">
            <Cpu className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#151923] dark:text-white">Upload Circuit Diagrams & Hardware Photographs</h3>
            <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1 mb-5 max-w-xl mx-auto">
              Supports <strong>PNG, JPG, JPEG, and WEBP</strong> circuit diagrams, PCB layouts, and component photos. Automatically indexes hardware assets for component verification.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft">
                <Cpu className="w-4 h-4" />
                <span>{uploading ? 'Processing Image...' : 'Select Diagram / Hardware Image'}</span>
                <input
                  type="file"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleMultipleFileUpload(e, false)}
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Tab 6: Project Reference Links */}
        {activeTab === 'link' && (
          <div className="p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <Link2 className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#151923] dark:text-white">Add Project Reference Link</h3>
              <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
                Link technical documentation, API gateways, architecture wikis, or project management boards.
              </p>
            </div>

            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Link Title</label>
                <input
                  type="text"
                  required
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="e.g. Stripe API Integration Docs"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Target URL</label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://docs.stripe.com/api"
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#151923] dark:text-gray-200 mb-1">Context / Description</label>
                <textarea
                  rows={2}
                  value={linkDesc}
                  onChange={(e) => setLinkDesc(e.target.value)}
                  placeholder="Why this reference matters for project continuity..."
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={addingLink}
                  className="px-5 py-2.5 rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] text-xs font-bold hover:bg-black transition shadow-soft cursor-pointer flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{addingLink ? 'Indexing Link...' : 'Index Reference Link'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Ingested Documents & Assets Table */}
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft overflow-hidden">
        
        {/* Table Search & Filter Bar */}
        <div className="p-5 border-b border-[#E5E1D8] dark:border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full md:max-w-md relative">
            <Search className="w-4 h-4 text-[#64748B] dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name, relative folder path, or extension..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E1D8] dark:border-gray-700 bg-[#F8F6F1] dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#B9825A]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-[#64748B] dark:text-gray-400 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </span>
            {[
              { id: 'all', label: 'All Assets' },
              { id: 'document', label: 'Documents' },
              { id: 'code', label: 'Source Code' },
              { id: 'hardware', label: 'Hardware' },
              { id: 'link', label: 'Links' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827]'
                    : 'bg-[#F2EFE9] dark:bg-gray-800 text-[#64748B] dark:text-gray-300 hover:text-black dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {filteredDocs.length > 0 ? (
          <div className="divide-y divide-[#E5E1D8] dark:divide-gray-800">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#F8F6F1] dark:hover:bg-gray-900/40 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    doc.category === 'code'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : doc.category === 'hardware'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : doc.category === 'link'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'bg-[#F2EFE9] dark:bg-gray-800 text-[#B9825A]'
                  }`}>
                    {doc.category === 'code' ? (
                      <Code2 className="w-5 h-5" />
                    ) : doc.category === 'hardware' ? (
                      <Cpu className="w-5 h-5" />
                    ) : doc.category === 'link' ? (
                      <Link2 className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-[#151923] dark:text-white truncate">
                        {doc.original_name}
                      </h3>
                      {doc.category && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {doc.category}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#64748B] dark:text-gray-400 mt-1">
                      {doc.folder_path && (
                        <span className="font-mono text-gray-500">
                          📁 {doc.folder_path}
                        </span>
                      )}
                      <span>•</span>
                      <span className="uppercase font-semibold">{doc.file_type}</span>
                      <span>•</span>
                      <span>{Math.round(doc.file_size / 1024)} KB</span>
                      <span>•</span>
                      <span className="text-teal-600 dark:text-teal-400 font-bold">
                        {doc.claims_count} candidate claims
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    doc.status === 'processed'
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                      : doc.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {doc.status}
                  </span>

                  <button
                    onClick={() => handleViewPassages(doc)}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-[#151923] dark:text-white hover:border-[#B9825A] transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Passages</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.original_name)}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Remove asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400">
            {documents.length === 0
              ? 'No project knowledge uploaded yet. Choose an option above to ingest documents, code, or hardware diagrams.'
              : 'No assets match your search and category filter.'}
          </div>
        )}
      </div>

      {/* ZIP Extraction Report Modal */}
      {zipReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 p-6 md:p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8] dark:border-gray-800 mb-4">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-[#151923] dark:text-white">
                  ZIP Extraction & Ingestion Report
                </h3>
              </div>
              <button onClick={() => setZipReport(null)} className="p-1 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 text-center">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Files</span>
                <span className="text-xl font-mono font-bold text-[#151923] dark:text-white">{zipReport.total_files}</span>
              </div>
              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-center">
                <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-300 block">Ingested</span>
                <span className="text-xl font-mono font-bold text-teal-700 dark:text-teal-300">{zipReport.processed_count}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Skipped</span>
                <span className="text-xl font-mono font-bold text-amber-700 dark:text-amber-300">{zipReport.skipped_count}</span>
              </div>
            </div>

            {zipReport.skipped_files.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-[#151923] dark:text-gray-200 mb-2">Skipped / Security Filtered Files:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                  {zipReport.skipped_files.map((s, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-[11px] flex items-center justify-between">
                      <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-[260px]">{s.path}</span>
                      <span className="text-gray-500 text-[10px]">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setZipReport(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#151923] dark:bg-[#B9825A] text-white dark:text-[#111827] hover:bg-black transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passages Drawer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xl h-full bg-white dark:bg-[#1B2432] p-6 shadow-2xl flex flex-col border-l border-[#E5E1D8] dark:border-gray-800">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8] dark:border-gray-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#151923] dark:text-white truncate max-w-sm">
                  {selectedDoc.original_name}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {passages.length} verifiable passage blocks with exact character offsets
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {loadingPassages ? (
                <div className="text-center py-10 text-xs text-gray-400">Loading passages...</div>
              ) : passages.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">No passages extracted.</div>
              ) : (
                passages.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-[#F8F6F1] dark:bg-gray-900 border border-[#E5E1D8] dark:border-gray-800 text-xs font-mono leading-relaxed text-gray-800 dark:text-gray-200"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-gray-400 mb-1.5 font-sans">
                      <span className="font-bold text-[#B9825A]">Passage #{idx + 1} — Page {p.page_number}</span>
                      <span>Offset: {p.char_offset_start}..{p.char_offset_end}</span>
                    </div>
                    <div className="font-sans font-bold text-[11px] text-[#151923] dark:text-white mb-1">
                      {p.section_heading}
                    </div>
                    <p className="whitespace-pre-wrap text-[11px] bg-white/60 dark:bg-black/30 p-2.5 rounded-xl border border-gray-200 dark:border-gray-800">
                      {p.text_content}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
