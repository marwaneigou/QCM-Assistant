# QCM Assistant

> **DISCLAIMER**: This tool is provided for educational and research purposes only. The creator is not responsible if this tool is used for cheating on exams, tests, or any academic assessments. Using this application in violation of academic integrity policies may result in serious consequences. Use responsibly and ethically.

QCM Assistant is a desktop application that helps you analyze multiple choice questions (QCM) quickly using AI. Select a question with your mouse, press Ctrl+Shift+C, and get the answer directly in your clipboard.

## Features

- **Quick Analysis**: Analyze multiple choice questions with a simple keyboard shortcut (Ctrl+Shift+C)
- **Clipboard Integration**: Works with your clipboard to capture questions and return answers
- **System Tray App**: Runs in the background without interfering with your workflow
- **Auto-Detection**: Automatically detects when you've copied question-like content
- **AI-Powered**: Uses Groq's powerful LLama models to analyze questions

## Requirements

- Node.js (v14 or later)
- npm (v6 or later)
- Electron
- A Groq API key

## Installation

1. Clone this repository or download the source code
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root or modify the existing one:

```
GROQ_API_KEY=your_groq_api_key_here
```

4. Start the application:

```bash
npm start
```

## How to Use

1. **Start the app**: Run `npm start` to launch QCM Assistant
2. **Copy a question**: Select a multiple choice question with your mouse
3. **Analyze**: Press `Ctrl+Shift+C` to analyze the selected text
4. **Get results**: The answer will be copied to your clipboard automatically

## Changing the API Key

You have two options to change the API key:

1. **Environment File (Recommended)**:
   - Edit the `.env` file in the project root
   - Update the `GROQ_API_KEY` value with your new key
   - Restart the application

2. **Direct Code Modification**:
   - Open `qcm-assistant.js`
   - Find the line that starts with `const token = process.env.GROQ_API_KEY ||`
   - Replace the fallback key with your new key
   - Save the file and restart the application

To get a Groq API key:
1. Sign up at [https://console.groq.com](https://console.groq.com)
2. Navigate to the API Keys section
3. Create a new API key
4. Copy the key value to your clipboard
5. Update your `.env` file or code as described above

## Changing the AI Model

The application is configured to use `llama3-70b-8192` by default. To change the model:

1. Open `qcm-assistant.js`
2. Find the line `const model = "llama3-70b-8192";`
3. Replace with another model name (e.g., "mixtral-8x7b-32768", "gemma-7b-it", etc.)
4. Save and restart the application

## Troubleshooting

- **Application won't start**: Check that all dependencies are installed and that Node.js is up to date
- **API errors**: Verify that your Groq API key is valid and has sufficient quota
- **Copy/paste not working**: The app uses system commands to trigger copy operations. Make sure you have the necessary permissions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This application uses the Groq API for AI analysis
- Built with Electron for cross-platform compatibility
