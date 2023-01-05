const express = require("express"); // This allows us to create the web server.
const bodyParser = require("body-parser"); // This allows us to decrypt the request.
const cookieParser = require("cookie-parser");

const app = express(); // Create the server application.
app.set('view engine', 'ejs'); // This allows us to read ejs files.
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended:false})) // Set the app to decrypt responses.
app.use(cookieParser())

app.get('/', (request, response) => {
    response.redirect("/registration/register");
})

// routes

// registration routes
var registration = require("./route/registration.route");
app.use("/registration", registration);

// market routes
var market = require("./route/market.route");
app.use("/market", market);

const PORT = 3001;
app.listen(PORT);

console.log(`Server running on ${PORT}`);