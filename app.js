// Application state
let currentScreen = 'welcome-screen';
let isRecording = false;
let mediaRecorder = null;
let recordingTimer = null;
let recordingStartTime = 0;
let audioBlob = null;
let currentFlashcardIndex = 0;
let quizAnswers = {};
let isEditingContent = false;

// Sample data from the application data
const sampleData = {
    "sampleLecture": {
        "title": "Introduction to Machine Learning",
        "duration": "12:34",
        "transcription": "Welcome to today's lecture on machine learning. Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without being explicitly programmed. There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Supervised learning uses labeled data to train models that can make predictions on new data. For example, we might train a model to recognize handwritten digits using thousands of examples of handwritten numbers with their correct labels. Unsupervised learning finds patterns in data without labels. Clustering algorithms like k-means can group similar data points together. Reinforcement learning involves an agent learning to make decisions through trial and error, receiving rewards or penalties for its actions.",
        "studyNotes": [
            "Machine learning is a subset of AI that enables computers to learn without explicit programming",
            "Three main types: supervised, unsupervised, and reinforcement learning",
            "Supervised learning uses labeled data to train predictive models",
            "Example: handwritten digit recognition using labeled training data",
            "Unsupervised learning finds patterns in unlabeled data",
            "K-means is a clustering algorithm for grouping similar data points",
            "Reinforcement learning uses trial and error with reward/penalty feedback"
        ],
        "quiz": [
            {
                "question": "What is machine learning?",
                "options": ["A type of computer hardware", "A subset of AI that enables computers to learn", "A programming language", "A database system"],
                "correct": 1,
                "id": 1
            },
            {
                "question": "How many main types of machine learning are there?",
                "options": ["Two", "Three", "Four", "Five"],
                "correct": 1,
                "id": 2
            },
            {
                "question": "What type of learning uses labeled data?",
                "options": ["Unsupervised learning", "Reinforcement learning", "Supervised learning", "Deep learning"],
                "correct": 2,
                "id": 3
            }
        ],
        "flashcards": [
            {
                "question": "What is supervised learning?",
                "answer": "A type of machine learning that uses labeled data to train models for making predictions on new data",
                "id": 1
            },
            {
                "question": "What is unsupervised learning?",
                "answer": "A type of machine learning that finds patterns in data without using labels",
                "id": 2
            },
            {
                "question": "What is reinforcement learning?",
                "answer": "A type of machine learning where an agent learns through trial and error, receiving rewards or penalties for actions",
                "id": 3
            }
        ]
    }
};

let currentData = null;
let settings = {
    theme: 'light',
    autoSave: true,
    exportFormat: 'pdf',
    maxRecordingTime: 3600,
    audioQuality: 'high'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadSettings();
    setupEventListeners();
    showWelcomeScreen();
}

function loadSettings() {
    // In a real app, this would load from localStorage or API
    // For demo purposes, we'll use default settings
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
        themeSelect.value = settings.theme;
    }
}

function setupEventListeners() {
    // Upload area drag and drop
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });
    }

    // File input change
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'r':
                    e.preventDefault();
                    if (currentScreen === 'welcome-screen') {
                        showRecordingScreen();
                    }
                    break;
                case 'u':
                    e.preventDefault();
                    if (currentScreen === 'welcome-screen') {
                        showUploadScreen();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    if (currentScreen === 'results-screen') {
                        saveSession();
                    }
                    break;
            }
        }
    });
}

// Screen management functions
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Show the target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        currentScreen = screenId;
    }
}

function showWelcomeScreen() {
    showScreen('welcome-screen');
}

function showRecordingScreen() {
    showScreen('recording-screen');
    initializeRecording();
}

function showUploadScreen() {
    showScreen('upload-screen');
}

function showProcessingScreen() {
    showScreen('processing-screen');
    startProcessing();
}

function showResultsScreen() {
    showScreen('results-screen');
    displayResults();
}

// Recording functionality
function initializeRecording() {
    resetRecordingUI();
    requestMicrophoneAccess();
}

function resetRecordingUI() {
    document.getElementById('recording-text').textContent = 'Ready to record';
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('status-indicator').classList.remove('recording');
    document.getElementById('record-btn').innerHTML = '<span class="record-icon">🔴</span> Start Recording';
    stopAudioVisualization();
}

async function requestMicrophoneAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                sampleRate: 44100,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioBlob = event.data;
            }
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            if (audioBlob) {
                showProcessingScreen();
            }
        };

    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please check your permissions and try again.');
    }
}

function toggleRecording() {
    if (!mediaRecorder) {
        alert('Microphone not available. Please refresh and try again.');
        return;
    }

    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'recording') return;

    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = Date.now();
    
    // Update UI
    document.getElementById('recording-text').textContent = 'Recording...';
    document.getElementById('status-indicator').classList.add('recording');
    document.getElementById('record-btn').innerHTML = '<span class="record-icon">⏹</span> Stop Recording';
    
    // Start timer
    startRecordingTimer();
    startAudioVisualization();
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    mediaRecorder.stop();
    isRecording = false;
    
    // Update UI
    document.getElementById('recording-text').textContent = 'Processing...';
    document.getElementById('status-indicator').classList.remove('recording');
    document.getElementById('record-btn').disabled = true;
    
    // Stop timer and visualization
    stopRecordingTimer();
    stopAudioVisualization();
}

function startRecordingTimer() {
    recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopRecordingTimer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function startAudioVisualization() {
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => bar.classList.add('active'));
}

function stopAudioVisualization() {
    const bars = document.querySelectorAll('.bar');
    bars.forEach(bar => bar.classList.remove('active'));
}

// File upload functionality
function handleFileUpload(file) {
    if (!file.type.startsWith('audio/')) {
        alert('Please select a valid audio file (MP3, WAV, M4A).');
        return;
    }

    // Show upload progress
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    uploadProgress.classList.remove('hidden');
    
    // Simulate upload progress
    let progress = 0;
    const uploadInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Uploading... ${Math.round(progress)}%`;
        
        if (progress >= 100) {
            clearInterval(uploadInterval);
            setTimeout(() => {
                audioBlob = file; // Store the file
                showProcessingScreen();
            }, 500);
        }
    }, 200);
}

// Processing functionality
function startProcessing() {
    // Reset all steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });

    // Start processing steps
    processStep('transcription', 0);
}

function processStep(stepName, delay) {
    setTimeout(() => {
        const step = document.getElementById(`step-${stepName}`);
        const progressBar = document.getElementById(`${stepName}-progress`);
        
        step.classList.add('active');
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 100) progress = 100;
            
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                step.classList.remove('active');
                step.classList.add('completed');
                
                // Move to next step
                switch (stepName) {
                    case 'transcription':
                        processStep('notes', 500);
                        break;
                    case 'notes':
                        processStep('quiz', 500);
                        break;
                    case 'quiz':
                        processStep('flashcards', 500);
                        break;
                    case 'flashcards':
                        setTimeout(() => {
                            showResultsScreen();
                        }, 1000);
                        break;
                }
            }
        }, 100 + Math.random() * 200);
    }, delay);
}

// Results display
function displayResults() {
    // Use sample data for demo
    currentData = sampleData.sampleLecture;
    
    // Update title
    document.getElementById('lecture-title').textContent = currentData.title;
    
    // Display transcription
    document.getElementById('transcription-content').textContent = currentData.transcription;
    
    // Display notes
    const notesList = document.getElementById('notes-content');
    notesList.innerHTML = '';
    currentData.studyNotes.forEach(note => {
        const li = document.createElement('li');
        li.textContent = note;
        notesList.appendChild(li);
    });
    
    // Display quiz
    displayQuiz();
    
    // Display flashcards
    displayFlashcards();
    
    // Show first tab
    showTab('transcription');
}

function displayQuiz() {
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = '';
    
    currentData.quiz.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';
        questionDiv.innerHTML = `
            <h4>Question ${index + 1}: ${question.question}</h4>
            <div class="quiz-options">
                ${question.options.map((option, optionIndex) => `
                    <label class="quiz-option">
                        <input type="radio" name="q${question.id}" value="${optionIndex}" onchange="saveQuizAnswer(${question.id}, ${optionIndex})">
                        ${option}
                    </label>
                `).join('')}
            </div>
        `;
        quizContent.appendChild(questionDiv);
    });
}

function displayFlashcards() {
    if (currentData.flashcards.length > 0) {
        currentFlashcardIndex = 0;
        updateFlashcardDisplay();
    }
}

function updateFlashcardDisplay() {
    const flashcard = currentData.flashcards[currentFlashcardIndex];
    document.getElementById('flashcard-question').textContent = flashcard.question;
    document.getElementById('flashcard-answer').textContent = flashcard.answer;
    document.getElementById('flashcard-counter').textContent = `${currentFlashcardIndex + 1} / ${currentData.flashcards.length}`;
    
    // Reset flip state
    document.getElementById('current-flashcard').classList.remove('flipped');
}

// Tab management - FIXED VERSION
function showTab(tabName) {
    // Update tab buttons - remove active from all first
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the correct tab button
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        const onClickAttr = btn.getAttribute('onclick');
        if (onClickAttr && onClickAttr.includes(`'${tabName}'`)) {
            btn.classList.add('active');
        }
    });
    
    // Hide all tab panels first
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    // Show the selected tab panel
    const targetPanel = document.getElementById(`${tabName}-tab`);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
        targetPanel.classList.add('active');
    }
}

// Content editing
function editContent(contentType) {
    const contentElement = document.getElementById(`${contentType}-content`);
    const isEditing = contentElement.contentEditable === 'true';
    
    if (!isEditing) {
        contentElement.contentEditable = 'true';
        contentElement.focus();
        contentElement.style.border = '2px solid var(--color-primary)';
        
        // Change button text
        const editBtn = event.target;
        editBtn.textContent = 'Save';
        editBtn.classList.remove('btn--outline');
        editBtn.classList.add('btn--primary');
    } else {
        contentElement.contentEditable = 'false';
        contentElement.style.border = '1px solid var(--color-border)';
        
        // Change button text back
        const editBtn = event.target;
        editBtn.textContent = 'Edit';
        editBtn.classList.remove('btn--primary');
        editBtn.classList.add('btn--outline');
        
        // Save the edited content (in a real app, this would sync to a server)
        console.log('Content saved:', contentElement.textContent || contentElement.innerHTML);
    }
}

// Search functionality
function searchContent(query) {
    const transcriptionContent = document.getElementById('transcription-content');
    const originalText = currentData.transcription;
    
    if (!query.trim()) {
        transcriptionContent.textContent = originalText;
        return;
    }
    
    const regex = new RegExp(`(${query})`, 'gi');
    const highlightedText = originalText.replace(regex, '<mark>$1</mark>');
    transcriptionContent.innerHTML = highlightedText;
}

// Quiz functionality
function saveQuizAnswer(questionId, answerIndex) {
    quizAnswers[questionId] = answerIndex;
}

function checkQuizAnswers() {
    let correct = 0;
    const total = currentData.quiz.length;
    
    currentData.quiz.forEach(question => {
        const userAnswer = quizAnswers[question.id];
        const options = document.querySelectorAll(`input[name="q${question.id}"]`);
        
        options.forEach((option, index) => {
            const label = option.parentElement;
            label.classList.remove('correct', 'incorrect');
            
            if (index === question.correct) {
                label.classList.add('correct');
            } else if (index === userAnswer && index !== question.correct) {
                label.classList.add('incorrect');
            }
        });
        
        if (userAnswer === question.correct) {
            correct++;
        }
    });
    
    // Show score
    const scoreDiv = document.getElementById('quiz-score');
    scoreDiv.innerHTML = `
        <h4>Quiz Complete!</h4>
        <p>You scored ${correct} out of ${total} questions correctly.</p>
        <p>Accuracy: ${Math.round((correct / total) * 100)}%</p>
    `;
    scoreDiv.classList.remove('hidden');
}

function resetQuiz() {
    quizAnswers = {};
    document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.checked = false;
        input.parentElement.classList.remove('correct', 'incorrect');
    });
    document.getElementById('quiz-score').classList.add('hidden');
}

// Flashcard functionality
function flipFlashcard() {
    document.getElementById('current-flashcard').classList.toggle('flipped');
}

function nextFlashcard() {
    if (currentFlashcardIndex < currentData.flashcards.length - 1) {
        currentFlashcardIndex++;
        updateFlashcardDisplay();
    }
}

function previousFlashcard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        updateFlashcardDisplay();
    }
}

// Modal management
function showExportModal() {
    document.getElementById('export-modal').classList.remove('hidden');
}

function hideExportModal() {
    document.getElementById('export-modal').classList.add('hidden');
}

function showSettingsModal() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

function hideSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function showHistoryModal() {
    document.getElementById('history-modal').classList.remove('hidden');
    loadHistory();
}

function hideHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

// Export functionality
function exportContent() {
    const selectedContent = [];
    const checkboxes = document.querySelectorAll('#export-modal input[type="checkbox"]');
    const format = document.querySelector('input[name="format"]:checked').value;
    
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            switch (index) {
                case 0: selectedContent.push('transcription'); break;
                case 1: selectedContent.push('notes'); break;
                case 2: selectedContent.push('quiz'); break;
                case 3: selectedContent.push('flashcards'); break;
            }
        }
    });
    
    // Simulate export
    const exportData = generateExportData(selectedContent, format);
    downloadFile(exportData, `lecture-${Date.now()}.${format}`);
    
    hideExportModal();
    alert(`Content exported successfully as ${format.toUpperCase()}!`);
}

function generateExportData(contentTypes, format) {
    let content = `# ${currentData.title}\n\n`;
    
    contentTypes.forEach(type => {
        switch (type) {
            case 'transcription':
                content += `## Transcription\n${currentData.transcription}\n\n`;
                break;
            case 'notes':
                content += `## Study Notes\n${currentData.studyNotes.map(note => `- ${note}`).join('\n')}\n\n`;
                break;
            case 'quiz':
                content += `## Quiz Questions\n`;
                currentData.quiz.forEach((q, i) => {
                    content += `${i + 1}. ${q.question}\n`;
                    q.options.forEach((opt, j) => {
                        const marker = j === q.correct ? '*' : ' ';
                        content += `  ${marker} ${opt}\n`;
                    });
                    content += '\n';
                });
                break;
            case 'flashcards':
                content += `## Flashcards\n`;
                currentData.flashcards.forEach((card, i) => {
                    content += `${i + 1}. Q: ${card.question}\n   A: ${card.answer}\n\n`;
                });
                break;
        }
    });
    
    return content;
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Settings management
function changeTheme(theme) {
    settings.theme = theme;
    
    if (theme === 'auto') {
        document.documentElement.removeAttribute('data-color-scheme');
    } else {
        document.documentElement.setAttribute('data-color-scheme', theme);
    }
}

function toggleAutoSave(enabled) {
    settings.autoSave = enabled;
}

// Session management
function saveSession() {
    if (!currentData) return;
    
    const session = {
        id: Date.now(),
        title: currentData.title,
        date: new Date().toLocaleDateString(),
        data: currentData
    };
    
    // In a real app, this would save to localStorage or send to server
    console.log('Session saved:', session);
    alert('Session saved successfully!');
}

function loadHistory() {
    const historyList = document.getElementById('history-list');
    
    // Demo history data
    const demoHistory = [
        { id: 1, title: 'Introduction to Machine Learning', date: '2025-09-29', duration: '12:34' },
        { id: 2, title: 'Data Structures and Algorithms', date: '2025-09-28', duration: '15:22' },
        { id: 3, title: 'Web Development Fundamentals', date: '2025-09-27', duration: '18:45' }
    ];
    
    historyList.innerHTML = demoHistory.map(item => `
        <div class="history-item" onclick="loadHistoryItem(${item.id})">
            <div class="history-info">
                <h5>${item.title}</h5>
                <p>${item.date} • ${item.duration}</p>
            </div>
        </div>
    `).join('');
}

function loadHistoryItem(id) {
    // In a real app, this would load the actual session data
    alert(`Loading session ${id}...`);
    hideHistoryModal();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        document.getElementById('history-list').innerHTML = '<p>No history items found.</p>';
    }
}

// Demo functionality
function loadDemoData() {
    currentData = sampleData.sampleLecture;
    showResultsScreen();
}