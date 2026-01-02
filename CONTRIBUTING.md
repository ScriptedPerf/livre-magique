# Contributing to Livre Magique

We welcome contributions! Whether you're fixing a bug, improving the docs, or adding a new feature, here's how to get started.

## 🛠️ Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ScriptedPerf/livre-magique.git
   cd livre-magique
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   You need two Google Cloud APIs enabled:
   - **Gemini API** (AI Studio or Vertex AI)
   - **Cloud Text-to-Speech API**
   
   Create a `.env.local` file:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

4. **Start the Dev Server**
   ```bash
   npm run dev
   ```

## 🧪 Testing
Currently, the project relies on manual testing. 
- **Unit Tests**: There are several standalone `.js` test scripts in the root (e.g., `test_cloud_tts.js`, `test_pro.js`) used for validating API integrations. You can run them with `node test_filename.js`.

## 🎨 Style Guide
- **CSS**: We use Vanilla CSS with Tailwind utility classes.
- **Components**: Functional React components with strong TypeScript typing.
- **Aesthetics**: Glassmorphism, rounded corners, and smooth transitions are key to the "Magic" feel.

## 📝 Pull Request Process
1. Fork the repo and create your feature branch (`git checkout -b feature/amazing-feature`).
2. Commit your changes (`git commit -m 'Add some amazing feature'`).
3. Push to the branch (`git push origin feature/amazing-feature`).
4. Open a Pull Request.

## ⚖️ License
By contributing, you agree that your contributions will be licensed under the project's MIT License.
