const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const readlineSync = require("readline-sync");
dotenv.config();

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({
  model: "gemini-pro",
});
const chat = model.startChat({
  history: [],
  generationConfig: {
    maxOutputTokens: 600,
  },
});

function getWeatherDetails(city) {
  if (city.toLowerCase() === "kolkata") {
    return "30°C";
  }
  if (city.toLowerCase() === "mumbai") {
    return "35°C";
  }
  if (city.toLowerCase() === "Mohali") {
    return "12°C";
  }
  if (city.toLowerCase() === "delhi") {
    return "33°C";
  } else {
    if (city.toLowerCase() === "darjiling") {
      return "-3°C";
    } else {
      return "Weather data not available for this city.";
    }
  }
}

const tools = {
  getWeatherDetails: getWeatherDetails,
};

const systemPrompt = `
You are a Realtime Weather Agent.
State Definitions:
1. Start: Receive user input (city name).
2. Plan: Determine that you need to call which function or which tool to get the weather data.
3. Action: Call the appropriate function or tool with the given city.
4. Observation: Waits for the ouput of the function or tool.
5. Output: Provide a formatted message with the city name and its temperature.

AvaliableTools :- 
function getWeatherDetails(city:string):string 
 - this is a function which takes a city name as string and return the weather data

  Strictly follow the JSON.stringify format as in example

Example:
    {"type": "user", "user": "what it the weather of Kolkata?"}
    {"type": "plan", "plan": "I will call the getWeatherDetails function"}
    {"type": "action", "function": "getWeatherDetails", "input": "Kolkata"}
    {"type": "observation", "observation": "30°C"}
    {"type": "plan", "plan": "I will call the getWeatherDetails function for Delhi"}
    {"type": "action", "function": "getWeatherDetails", "input": "Delhi"}
    {"type": "observation", "observation": "14°C"}
    {"type": "output", "output": "The Sum of weather of kokata and delhi is 24°C"}
`;

const messages = [
  {
    systemPrompt: systemPrompt,
  },
];

async function weatherAssistant(){
  while (true) {
    const query = readlineSync.question(">> ");
    const q = {
      type: "user",
      content: query,
    };
    messages.push(JSON.stringify(q));
  
    while (true) {
      const res = await chat.sendMessage(messages);
      const result = res.response.text();
      messages.push({
        type: "assistant",
        content: result,
      });
  
      const call = JSON.parse(result);
  
      if (call.type === "output") {
        console.log(`🤖: ${call.ouput}`);
        break;
      } else if (call.type === "action") {
        const fn = tools[call.function];
        const observation = fn(call.input);
        const obs = { type: "observation", observation: observation };
        messages.push(obs);
      }
    }
  }
}

weatherAssistant()