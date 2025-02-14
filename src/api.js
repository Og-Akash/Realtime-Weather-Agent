const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': process.env.WEATHER_API,
    'x-rapidapi-host': 'open-weather13.p.rapidapi.com'
  }
};

async function getWeatherDetails(city){
    try {
        const response = await fetch(`https://open-weather13.p.rapidapi.com/city/${city}/EN`, options);
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