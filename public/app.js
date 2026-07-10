const fileInput = document.querySelector('#photo');
const preview = document.querySelector('#preview');
const previewFrame = document.querySelector('.preview-frame');
const analyzeButton = document.querySelector('#analyze');
const statusText = document.querySelector('#status');
const results = document.querySelector('#results');
const modelName = document.querySelector('#modelName');

let selectedFile = null;

const labels = {
  species: 'Species',
  breed: 'Breed',
  coat_colours: 'Coat colours',
  visible_traits: 'Visible traits',
  raw: 'Raw analysis'
};

fileInput.addEventListener('change', () => {
  const [file] = fileInput.files;
  selectedFile = file || null;
  analyzeButton.disabled = !selectedFile;
  statusText.textContent = '';

  if (!selectedFile) {
    preview.removeAttribute('src');
    previewFrame.classList.remove('has-image');
    return;
  }

  preview.src = URL.createObjectURL(selectedFile);
  preview.alt = selectedFile.name;
  previewFrame.classList.add('has-image');
});

analyzeButton.addEventListener('click', async () => {
  if (!selectedFile) return;

  const formData = new FormData();
  formData.append('photo', selectedFile);

  setLoading(true);
  statusText.textContent = 'Analyzing photo...';

  try {
    const response = await fetch('/api/analyze-pet', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Analysis failed.');
    }

    modelName.textContent = payload.model || '';
    renderAnalysis(payload.analysis || {});
    statusText.textContent = 'Analysis complete.';
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  analyzeButton.disabled = isLoading || !selectedFile;
  analyzeButton.textContent = isLoading ? 'Analyzing...' : 'Analyze photo';
}

function renderAnalysis(analysis) {
  const entries = Object.entries(labels)
    .filter(([key]) => Object.prototype.hasOwnProperty.call(analysis, key))
    .map(([key, label]) => [label, formatValue(analysis[key])]);

  results.replaceChildren(
    ...entries.map(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');

      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      return row;
    })
  );
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Unknown';
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value ? String(value) : 'Unknown';
}
