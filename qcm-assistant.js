import { config } from 'dotenv';
import clipboardy from 'clipboardy';
import electron from 'electron';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// Destructure Electron components after ensuring they're available
const { app, globalShortcut, Tray, Menu, nativeImage } = electron;

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

// Groq API configuration
const token = process.env.GROQ_API_KEY || 'gsk_ijBXpNCHSp7AEbfnAuTx';
const endpoint = "https://api.groq.com/openai/v1/chat/completions";
const model = "llama3-70b-8192"; 

class QCMAssistant {
  constructor() {
    this.tray = null;
    this.isProcessing = false;
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // 2 seconds between requests
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
    
    // Verify Electron is available
    if (!app || !globalShortcut) {
      console.error('❌ Electron components not properly initialized');
      process.exit(1);
    }
    
    this.init();
  }

  init() {
    console.log('🚀 Initializing QCM Assistant...');
    console.log('Token available:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.error('❌ GROQ_API_KEY not found in environment variables');
      return;
    }

    // Setup Electron app
    this.setupElectronApp();
  }

  setupElectronApp() {
    try {
      app.whenReady().then(() => {
        this.createTray();
        this.registerGlobalShortcut();
        console.log('✅ QCM Assistant is ready!');
        console.log('📋 Select QCM text and press Ctrl+Shift+C to analyze');
      }).catch(err => {
        console.error('❌ Error in app.whenReady:', err);
      });

      app.on('window-all-closed', (e) => {
        e.preventDefault(); // Prevent app from quitting
      });

      app.on('before-quit', () => {
        globalShortcut.unregisterAll();
      });
    } catch (err) {
      console.error('❌ Error setting up Electron app:', err);
      process.exit(1);
    }
  }

  createTray() {
    // Create a simple tray icon
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    if (icon.isEmpty()) {
      // Fallback to a blank image if icon.png doesn't exist
      this.tray = new Tray(nativeImage.createEmpty());
    } else {
      this.tray = new Tray(icon);
    }
    this.tray.setToolTip('QCM AI Assistant');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'QCM Assistant',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: 'Status: Ready',
        enabled: false
      },
      {
        label: 'Select text + Ctrl+Shift+C to analyze',
        enabled: false
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }

  registerGlobalShortcut() {
    // Use Ctrl+Shift+C for QCM analysis
    const registered = globalShortcut.register('CommandOrControl+Shift+C', async () => {
        if (this.isProcessing) {
          console.log('⏳ Already processing a request...');
          return;
        }

        try {
            console.log('📋 Copying selected text...');
            this.isProcessing = true;
            this.updateTrayStatus('Copying...');
            
            // Store current clipboard content to restore later if needed
            let previousClipboard = '';
            try {
              previousClipboard = await clipboardy.read();
            } catch (e) {
              // Ignore errors reading previous clipboard
            }
            
            // Clear clipboard first to ensure we detect new content
            await clipboardy.write('');
            
            // Simulate Ctrl+C to copy current selection
            const { exec } = await import('child_process');
            const util = await import('util');
            const execPromise = util.promisify(exec);
            
            // Use different copy commands based on platform
            if (process.platform === 'win32') {
              // Windows: Use PowerShell to send Ctrl+C
              await execPromise('powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^c\')"');
            } else if (process.platform === 'darwin') {
              // macOS: Use osascript to send Cmd+C
              await execPromise('osascript -e "tell application \\"System Events\\" to keystroke \\"c\\" using command down"');
            } else {
              // Linux: Use xdotool to send Ctrl+C
              await execPromise('xdotool key ctrl+c');
            }
            
            // Wait a bit longer for the copy operation to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Get the copied content
            const copiedText = await clipboardy.read();
            
            // Check if we actually got new content
            if (!copiedText || copiedText.trim().length === 0 || copiedText === previousClipboard) {
              console.log('📭 No text was selected or copied');
              this.updateTrayStatus('No text selected');
              setTimeout(() => {
                this.updateTrayStatus('Ready');
              }, 2000);
              return;
            }
            
            console.log('✅ Text copied successfully');
            console.log('🤖 Analyzing with AI...');
            
            // Process the copied text
            await this.handleQCMAnalysis(copiedText);
            
        } catch (error) {
            console.error('❌ Error in copy-then-process:', error);
            this.updateTrayStatus('Copy failed');
            setTimeout(() => {
              this.updateTrayStatus('Ready');
            }, 3000);
        } finally {
            this.isProcessing = false;
        }
    });

    if (!registered) {
      console.error('❌ Failed to register global shortcut');
    } else {
      console.log('✅ Global shortcut registered: Ctrl+Shift+C');
      console.log('💡 Select text first, then press Ctrl+Shift+C to analyze');
    }
    
    // Keep the clipboard monitoring for auto-detection
    this.startClipboardMonitoring();
  }

  startClipboardMonitoring() {
    let lastClipboard = '';
    let clipboardCheckCount = 0;
    
    // Check clipboard every 500ms for changes
    setInterval(async () => {
      try {
        const currentClipboard = await clipboardy.read();
        
        // If clipboard changed and it looks like a question
        if (currentClipboard !== lastClipboard && 
            currentClipboard.length > 20 && 
            (currentClipboard.includes('?') || 
             currentClipboard.includes('A)') || 
             currentClipboard.includes('a)') ||
             currentClipboard.toLowerCase().includes('which') ||
             currentClipboard.toLowerCase().includes('what'))) {
          
          clipboardCheckCount++;
          
          // If the same question-like content persists for 2 checks (1 second)
          // and user hasn't used it yet, suggest analysis
          if (clipboardCheckCount >= 2) {
            console.log('📋 Detected potential QCM in clipboard. Use Ctrl+Shift+C to analyze!');
            this.updateTrayStatus('QCM detected - Ctrl+Shift+C');
            clipboardCheckCount = 0;
          }
        } else if (currentClipboard !== lastClipboard) {
          clipboardCheckCount = 0;
          this.updateTrayStatus('Ready');
        }
        
        lastClipboard = currentClipboard;
        
      } catch (error) {
        // Ignore clipboard read errors
      }
    }, 500);
  }

  async handleQCMAnalysis(questionText) {
    this.updateTrayStatus('Processing...');

    try {
      console.log('🤖 Analyzing QCM with AI...');
      const answer = await this.analyzeQCMWithRetry(questionText);
      
      console.log('📤 Putting answer back to clipboard...');
      await clipboardy.write(answer);
      
      console.log('✅ QCM analysis complete!');
      this.updateTrayStatus('Complete!');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        this.updateTrayStatus('Ready');
      }, 3000);

    } catch (error) {
      console.error('❌ Error processing QCM:', error.message);
      
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        this.updateTrayStatus('Rate limited - wait');
        await clipboardy.write(`Rate limit exceeded. Please wait a moment and try again.`);
      } else {
        this.updateTrayStatus('Error occurred');
        await clipboardy.write(`Error: ${error.message}`);
      }
      
      setTimeout(() => {
        this.updateTrayStatus('Ready');
      }, 5000);
    }
  }

  async analyzeQCMWithRetry(questionText, attempt = 1) {
    // Rate limiting: ensure minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before request...`);
      this.updateTrayStatus(`Waiting ${Math.ceil(waitTime/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      this.lastRequestTime = Date.now();
      return await this.analyzeQCM(questionText);
      
    } catch (error) {
      if ((error.message.includes('429') || error.message.includes('Too Many Requests')) && attempt <= this.retryAttempts) {
        console.log(`⏳ Rate limited (attempt ${attempt}/${this.retryAttempts}). Retrying in ${this.retryDelay/1000}s...`);
        this.updateTrayStatus(`Retry ${attempt}/${this.retryAttempts} in ${this.retryDelay/1000}s`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Exponential backoff: increase delay for next retry
        this.retryDelay *= 1.5;
        
        return await this.analyzeQCMWithRetry(questionText, attempt + 1);
      }
      
      throw error;
    }
  }

  async analyzeQCM(questionText) {
    const systemPrompt = `You are an expert at analyzing multiple choice questions (QCM). 
Your task is to:
1. Read the question carefully
2. Analyze each option
3. Provide the correct answer with a brief explanation
4. Format your response as: "Answer: [Letter] - [Brief explanation]"

Be concise but accurate. If the question is unclear or incomplete, say so.`;

    const requestPayload = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: questionText }
      ],
      temperature: 0.1, // Lower temperature for more deterministic responses
      max_tokens: 150
    };

    console.log('🔄 Sending request to Groq API...');
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'QCM-Assistant/1.0'
        },
        body: JSON.stringify(requestPayload),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '60';
          const waitTime = parseInt(retryAfter) * 1000;
          throw new Error(`Rate limit exceeded. Retry after ${waitTime/1000} seconds.`);
        }
        
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error('Invalid API response:', data);
        throw new Error('Invalid response format from API');
      }

      return data.choices[0].message.content.trim();
      
    } catch (error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Request timeout - API is slow, try again later');
      }
      
      console.error('Fetch error:', error);
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  updateTrayStatus(status) {
    if (this.tray) {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'QCM AI Assistant',
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: `Status: ${status}`,
          enabled: false
        },
        {
          label: 'Select text + Ctrl+Shift+C to analyze',
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ]);
      
      this.tray.setContextMenu(contextMenu);
    }
  }
}

// Start the application
new QCMAssistant();