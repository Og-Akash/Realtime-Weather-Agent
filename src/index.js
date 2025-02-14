const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const readlineSync = require("readline-sync");
const { getWeatherDetails } = require("./api");
dotenv.config();

NODE_TLS_REJECT_UNAUTHORIZED = 0;

const systemPrompt = fs.readFileSync("./prompt.txt", "utf-8");

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

const cached = {};

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
          console.log("AI is taking action:", message);

          if (cached[message.input]) {
            console.log(`Using cached data for ${message.input}`);
            const obs = {
              type: "observation",
              observation: cached[message.input],
            };
            messages.push(JSON.stringify(obs));
          } else {
            const fn = tools[message.function];
            const observation = await fn(message.input);
            const obs = { type: "observation", observation: observation };

            // Log the observation before pushing it
            // console.log("Observation:", obs);

            messages.push(JSON.stringify(obs));
          }
        } else if (message.type === "plan") {
          console.log("AI plan:", message.plan);
        }
        // For "plan" messages, just push to history without extra processing.
      }
      if (exitLoop) break;
    }

    if (query == "exit") {
      break;
    }
  }
}

weatherAssistant();
