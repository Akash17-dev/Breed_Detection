# Pet Vision Analyzer

A small Express app for analyzing uploaded dog and cat photos with an Ollama Cloud vision model.

The app returns only the pet details currently needed by the product:

- `species`
- `breed`
- `coat_colours`
- `visible_traits`

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```env
OLLAMA_API_KEY=your_ollama_cloud_api_key
OLLAMA_MODEL=llama3.2-vision
OLLAMA_FALLBACK_MODELS=gemma3:27b,gemma3:12b,gemma3:4b
OLLAMA_BASE_URL=https://ollama.com/api
PORT=3000
```

Do not commit `.env`. It contains the Ollama API token.

## Run

Development mode:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## API

Analyze one uploaded pet photo:

```bash
curl -F photo=@/path/to/pet.jpg http://localhost:3000/api/analyze-pet
```

Example response:

```json
{
  "model": "gemma3:27b",
  "analysis": {
    "species": "dog",
    "breed": "Labrador Retriever",
    "coat_colours": ["yellow", "white"],
    "visible_traits": ["short coat", "floppy ears"]
  }
}
```

## Model Notes

The app tries `OLLAMA_MODEL` first. If Ollama Cloud reports that model is not available, it tries models from `OLLAMA_FALLBACK_MODELS` in order.

At the time this was tested, the configured Ollama Cloud account did not expose `llama3.2-vision`, so the app successfully used `gemma3:27b` as the first fallback vision model.

## Upload Limits

Accepted file types:

- PNG
- JPG / JPEG
- WEBP

Maximum upload size: 10 MB.

## Port Conflicts

If port `3000` is already in use, stop the existing process or change `PORT` in `.env`.

To find the process using port `3000`:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```
