import { useState } from "react";

const API_URL = "http://localhost:8000/upload-video";

function App() {
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (event) => {
    event.preventDefault();
    setError("");
    setOutput("");

    if (!file) {
      setError("Please choose a video file first.");
      return;
    }

    const formData = new FormData();
    formData.append("video", file);

    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Upload failed");
      }

      setOutput(data.OUTPUT || "");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <h1>Lab 31 Video Upload</h1>
      <form onSubmit={handleUpload} className="upload-form">
        <input
          type="file"
          accept="video/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload Video"}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
      {output ? (
        <section className="output-section">
          <h2>OUTPUT</h2>
          <pre>{output}</pre>
        </section>
      ) : null}
    </main>
  );
}

export default App;
