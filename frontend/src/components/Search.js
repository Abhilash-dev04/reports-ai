import React, { useState } from "react";
import {
  Search as SearchIcon,
  Database,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Mail,
  X
} from "lucide-react";
import searchService from "../services/searchService";
import "./Search.css";

const Search = () => {
  const [activeTab, setActiveTab] = useState("traditional");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [newReport, setNewReport] = useState({
    report_id: "",
    report_name: "",
    functional_area: "",
    package_name: "",
    frequency: "",
    report_type: "",
    state: "NH",
    data_source: "MMIS"
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchService.search(query, activeTab);
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    try {
      await searchService.addReport(newReport);
      setShowAddForm(false);
      setNewReport({
        report_id: "",
        report_name: "",
        functional_area: "",
        package_name: "",
        frequency: "",
        report_type: "",
        state: "NH",
        data_source: "MMIS"
      });
      alert("Report added successfully!");
    } catch (err) {
      console.error("Add report error:", err);
      alert("Failed to add report");
    }
  };

  const handleContactDev = async (e) => {
    e.preventDefault();
    try {
      await searchService.contactDevTeam(contactMessage);
      setShowContactForm(false);
      setContactMessage("");
      alert("Message sent to dev team!");
    } catch (err) {
      console.error("Contact dev error:", err);
      alert("Failed to send message");
    }
  };

  return (
    <div className="search-container">
      <h1 className="search-title">Search Reports</h1>

      <div className="search-tabs">
        <button
          className={`search-tab ${activeTab === "traditional" ? "active" : ""}`}
          onClick={() => setActiveTab("traditional")}
        >
          <Database size={16} /> Traditional
        </button>
        <button
          className={`search-tab ${activeTab === "nlp" ? "active" : ""}`}
          onClick={() => setActiveTab("nlp")}
        >
          <SearchIcon size={16} /> NLP
        </button>
        <button
          className={`search-tab ${activeTab === "results" ? "active" : ""}`}
          onClick={() => setActiveTab("results")}
        >
          <FileSpreadsheet size={16} /> Results
        </button>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder={activeTab === "nlp" ? "e.g., show me daily claims" : "Search by report name, ID, or module..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : <><SearchIcon size={16} /> Search</>}
        </button>
      </div>

      {results.length === 0 && !loading && query && (
        <div className="no-results">
          <AlertCircle size={48} />
          <h3>Data Not Available</h3>
          <p>No reports found matching your search.</p>
          <div className="no-results-actions">
            <button onClick={() => setShowAddForm(true)}>
              <Plus size={16} /> Add Missing Data
            </button>
            <button onClick={() => setShowContactForm(true)}>
              <Mail size={16} /> Contact Cognos Dev Team
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Report Name</th>
                <th>Module</th>
                <th>Package</th>
                <th>Frequency</th>
                <th>State</th>
                <th>Data Source</th>
              </tr>
            </thead>
            <tbody>
              {results.map((report) => (
                <tr key={report.report_id}>
                  <td>{report.report_id}</td>
                  <td>{report.report_name}</td>
                  <td>{report.functional_area}</td>
                  <td>{report.package_name}</td>
                  <td>{report.frequency}</td>
                  <td>{report.state}</td>
                  <td>{report.data_source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Missing Report</h2>
              <button onClick={() => setShowAddForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddReport}>
              <div className="form-group">
                <label>Report ID</label>
                <input value={newReport.report_id} onChange={(e) => setNewReport({...newReport, report_id: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Report Name</label>
                <input value={newReport.report_name} onChange={(e) => setNewReport({...newReport, report_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Module</label>
                <input value={newReport.functional_area} onChange={(e) => setNewReport({...newReport, functional_area: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Package</label>
                <input value={newReport.package_name} onChange={(e) => setNewReport({...newReport, package_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <input value={newReport.frequency} onChange={(e) => setNewReport({...newReport, frequency: e.target.value})} />
              </div>
              <div className="form-group">
                <label>State</label>
                <select value={newReport.state} onChange={(e) => setNewReport({...newReport, state: e.target.value})}>
                  <option value="AK">AK</option>
                  <option value="NH">NH</option>
                  <option value="ND">ND</option>
                </select>
              </div>
              <div className="form-group">
                <label>Data Source</label>
                <select value={newReport.data_source} onChange={(e) => setNewReport({...newReport, data_source: e.target.value})}>
                  <option value="MMIS">MMIS</option>
                  <option value="ORR">ORR</option>
                </select>
              </div>
              <button type="submit">Add Report</button>
            </form>
          </div>
        </div>
      )}

      {showContactForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Contact Cognos Dev Team</h2>
              <button onClick={() => setShowContactForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleContactDev}>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe the report you need help with..."
                  rows={5}
                  required
                />
              </div>
              <button type="submit">Send Message</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
