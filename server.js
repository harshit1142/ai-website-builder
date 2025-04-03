const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const e = require('express');
require('dotenv').config();

const app = express();
const port = 3000;


app.use(bodyParser.json());

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-3.5-turbo';

// Function to call OpenAI API
async function callOpenAIWithRetry(prompt, maxRetries = 5, initialDelay = 1000) {
    let delay = initialDelay;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data.choices[0].message.content;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.log(`Received 429 error, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// Function to process user input and generate suggestions
async function generateSuggestions(userInput) {
    const prompt = `
    Generate suggestions for website templates, layouts, and content based on the following user input:
    Industry: ${userInput.industry}
    Preferences: ${userInput.preferences.join(', ')}
    Content: ${userInput.content}
  `;
    await callOpenAIWithRetry(prompt).then(response => {
        return JSON.parse(response);
    }).catch(error => {
        console.error('Error calling OpenAI API:', error);
        throw new Error('Failed to generate suggestions');
    });;
   
}

// API Endpoint for suggesting templates, layouts, and content
app.post('/api/suggest', async (req, res) => {
    try {
        const userInput = req.body.userInput;
        const suggestions = await generateSuggestions(userInput);
        res.json(suggestions);
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});