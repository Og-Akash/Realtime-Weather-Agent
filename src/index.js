const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const readlineSync = require("readline-sync");
const { getWeatherDetails } = require("./api");
dotenv.config();

NODE_TLS_REJECT_UNAUTHORIZED = 0;

const systemPrompt = `
You are a Realtime Weather Agent who knows the weather of every country , city, state. You are created by Akash Ghosh
State Definitions:
1. Start: Receive user input (city name).
2. Plan: Determine that you need to call which function or which tool to get the weather data.
3. Action: Call the appropriate function or tool with the given city.
4. Observation: Waits for the ouput of the function or tool.
5. Output: Provide a formatted message with the city name and its temperature.

AvaliableTools :- 
function getWeatherDetails(city:string) => return a json string
 - this is a function which takes a city name as string and return the weather data in a form of an json format. wait for the response, the temp is in response was in fahrenheit just convert it into Celcius.

 Example JSON response : 

 {
  "coord": {
    "lon": 88.3697,
    "lat": 22.5697
  },
  "weather": [
    {
      "id": 800,
      "main": "Clear",
      "description": "clear sky",
      "icon": "01d"
    }
  ],
  "base": "stations",
  "main": {
    "temp": 78.75,
    "feels_like": 78.75,
    "temp_min": 78.75,
    "temp_max": 78.75,
    "pressure": 1014,
    "humidity": 29,
    "sea_level": 1014,
    "grnd_level": 1014
  },
  "visibility": 6000,
  "wind": {
    "speed": 11.5,
    "deg": 330
  },
  "clouds": {
    "all": 0
  },
  "dt": 1739510906,
  "sys": {
    "type": 1,
    "id": 9114,
    "country": "IN",
    "sunrise": 1739493552,
    "sunset": 1739534546
  },
  "timezone": 19800,
  "id": 1275004,
  "name": "Kolkata",
  "cod": 200
}

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

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: systemPrompt,
});
const chat = model.startChat({
  history: [],
  generationConfig: {
    maxOutputTokens: 600,
  },
});

// function getWeatherDetails(city) {
//   if (city.toLowerCase() === "kolkata") {
//     return "29°C";
//   }
//   if (city.toLowerCase() === "mumbai") {
//     return "35°C";
//   }
//   if (city.toLowerCase() === "mohali") {
//     return "12°C";
//   }
//   if (city.toLowerCase() === "delhi") {
//     return "33°C";
//   } else {
//     if (city.toLowerCase() === "darjeeling") {
//       return "-3°C";
//     } else {
//       return "Weather data not available for this city.";
//     }
//   }
// }

const tools = {
  getWeatherDetails: getWeatherDetails,
};

const messages = [];

async function weatherAssistant() {
  while (true) {
    // Get user query and push as a JSON string with the key "user"
    const query = readlineSync.question(">> ");
    const q = {
      type: "user",
      user: query,
    };
    messages.push(JSON.stringify(q));

    while (true) {
      const res = await chat.sendMessage(messages);
      let result = res.response.text().trim();
      console.log(`result coming from LLM : ${result}`);

      // Split the result by newlines to handle multiple JSON objects.
      const parts = result.split(/\r?\n/).filter((line) => line.trim() !== "");

      let exitLoop = false;
      for (let part of parts) {
        // Sanitize: if there is any extra text before the first '{', remove it.
        const idx = part.indexOf("{");
        if (idx > 0) {
          part = part.substring(idx);
        }

        let message;
        try {
          message = JSON.parse(part);
        } catch (err) {
          console.error("Error parsing JSON message part:", part, err);
          continue;
        }

        // Push this parsed message into our history as a JSON string.
        messages.push(JSON.stringify(message));

        // Process the message based on its type.
        if (message.type === "output") {
          console.log(`🤖: ${message.output}`);
          exitLoop = true;
          break; // Exit the for-loop; we have our final output.
        } else if (message.type === "action") {
          // console.log("AI is taking action:", message);

          const fn = tools[message.function];
          const observation = fn(message.input);
          const obs = { type: "observation", observation: observation };

          // Log the observation before pushing it
          // console.log("Observation:", obs);

          messages.push(JSON.stringify(obs));
        } else if (message.type === "plan") {
          console.log("AI plan:", message.plan);
        }
        // For "plan" messages, just push to history without extra processing.
      }
      if (exitLoop) break;
    }

    if(query == "exit"){
      break;
    }
  }
}

weatherAssistant();
