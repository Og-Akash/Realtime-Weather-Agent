require("dotenv").config()

async function getWeatherDetails(city){
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API}`);
        const result = await response.text();
        // console.log(result);
        return result
    } catch (error) {
        console.error(error);
    }
}
// getWeatherDetails()
module.exports = {
    getWeatherDetails
}