const axios = require("axios");
var MongoClient = require("mongodb").MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url =  "mongodb://localhost:27017/";

exports.redirect = (request, response) => {

    const userName = request.cookies.userName;

    if (userName == undefined) {
        response.redirect("/registration/register");
    }

    else {

        var query = { userName: userName};

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("ecommerce");
            dbo.collection("users").find(query).toArray(function(err, result) {
                if (err) throw err;
                response.cookie("userId", result[0]._id);
                response.redirect("/market/");
            });

        });

    }

}

exports.homepage = async (request, response) => {

    const profile = request.cookies.profile;
    const userId = request.cookies.userId;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, async function(err, db) {
            if (err) throw err;
            var dbo = db.db("ecommerce");
            
            var query = { "supplierID": { $ne: ObjectId(userId) }, "stock": { $gt: 0 }};
            dbo.collection("products").find(query).toArray(function(err, result) {
                if (err) throw err;
                response.render("homepage", {info : result, profile : profile});
                db.close();
    
            });
    
        });
    }

}

exports.details = (request, response) => {

    const id = request.query.id;
    const userId = request.cookies.userId;
    const profile = request.cookies.profile;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, async function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            let userInfo = async () => {

                return new Promise((resolve, reject) => {

                    var userQuery = {"_id": ObjectId(userId)};
                    dbo.collection("users").aggregate([

                        {$match: userQuery},
                        {$addFields: {"InCart": {$in: [ObjectId(id), "$cart"]}}}

                    ]).toArray(function(err, result) {
                        if (err) throw err;
                        resolve(result[0]);
                    });


                });

            }

            let reviewsInfo = async () => {

                return new Promise((resolve, reject) => {
                        
                    var productQuery = {"_id": ObjectId(id)};
                    dbo.collection("products").aggregate([

                        {$match: productQuery},
                        {$unwind: "$reviews"},
                        {$lookup: {from: "users", localField: "reviews.userId", foreignField: "_id", as: "user"}},
                        {$unwind: "$user"},
                        {$addFields: {"userName": "$user.userName", "profile": "$user.profile"}},
                        {$project: {"userName": 1, "profile": 1, "_id": 0}}

                    ]).toArray(function(err, result) {
                        if (err) throw err;
                        resolve(result);
                    });

                });
            }

            let productInfo = async () => {

                let user = await userInfo();

                return new Promise((resolve, reject) => {

                    var productQuery = {"_id": ObjectId(id)};
                    dbo.collection("products").aggregate([
        
                        {$match: productQuery},
                        {$addFields: {"reviewed": {$in: [user._id, "$reviews.userId"]}, 
                            "InCart": user.InCart, "userId": user._id, "userName": user.userName,
                            "profile": profile}},
        
                    ]).toArray(function(err, result) {
        
                        if (err) throw err;
                        resolve(result[0]);
                
                    });
        
                });

            }

            let promise = async () => {

                let reviewInfo = await reviewsInfo();
                let productInf = await productInfo();

                let revInfo = [];

                for (let i = 0; i < reviewInfo.length; i++) {

                    revInfo.push({userName : reviewInfo[i].userName, profile : reviewInfo[i].profile,
                        rating: productInf.reviews[i].rating, userId: productInf.reviews[i].userId,
                        review: productInf.reviews[i].review, userId: productInf.reviews[i].userId})

                }

                db.close();
                response.render("details", {product : productInf, reviewInfo : revInfo});

            };

            promise();

        });

    }

};

exports.sell = (request, response) => {
    const profile = request.cookies.profile;
    if (profile == undefined) {
        response.redirect("/registration/register");
    }
    else {
        response.render("supplier", {profile : profile});
    }
};

exports.addToMarket = (request, response) => {

    const image = request.file.filename;
    const {productName, price, stock, description} = request.body;

    const userId = request.cookies.userId;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");
            var myobj = { productName: productName, price: parseFloat(price), stock: parseInt(stock),
                supplierID: ObjectId(userId), description: description, image: image,
                reviews: [],  rating: null};
            dbo.collection("products").insertOne(myobj, function(err, res) {
                if (err) throw err;
                response.redirect("/market/supply");
                db.close();
            });

        });

    }
};

exports.buy = (request, response) => {

    const id = request.query.id;
    const userId = request.cookies.userId;
    const quantity = parseInt(request.query.quantity);

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, async function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            var getProduct = async () => {

                return new Promise((resolve, reject) => {

                    var productQuery = {"_id": ObjectId(id)};
                    dbo.collection("products").findOne(productQuery, function(err, result) {
                        if (err) throw err;
                        resolve(result);
                    });
                })

            }
        
            var updateStock = async () => {

                return new Promise((resolve, reject) => {

                    var productQuery = {"_id": ObjectId(id)};
                    var newvalues = { $inc: {stock: -quantity} };
                    dbo.collection("products").updateOne(productQuery, newvalues, function(err, result) {
                        if (err) throw err;
                        resolve(result);
                        db.close();
                    });

                });

            };

            var product = await getProduct();

            var insertTransaction = async () => {
                        
                return new Promise((resolve, reject) => {
                    var userQuery = {"_id": ObjectId(userId)};
                    var newvalues = { $push: {transactions: {productName: product.productName,
                        price: product.price, quantity: quantity, time: new Date(), userId: ObjectId(userId)}}};

                    dbo.collection("users").updateOne(userQuery, newvalues, function(err, result) {
                        if (err) throw err;
                        resolve(result);
                        db.close();
                    });

                });

            };

            await updateStock();
            await insertTransaction(product);
            response.redirect("/market");

            

        });
    }
};

exports.transactions = (request, response) => {

    const userId = request.cookies.userId;
    const profile = request.cookies.profile;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");
    

            // Create a query that selects the transactions array from the user with the field "_id" equal to the userId and sort the selection by time in the transactions array in descending order
            var userQuery = {"_id": ObjectId(userId)};

            dbo.collection("users").findOne(userQuery, function(err, result) {
                if (err) throw err;
                response.render("transactions", {info : result.transactions, profile : profile});
                db.close();
            })
        });
    }
};

exports.supply = (request, response) => {

    const supplierID = request.cookies.userId;
    const profile = request.cookies.profile;

    if (supplierID == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            var productQuery = {"supplierID": ObjectId(supplierID)};
            dbo.collection("products").find(productQuery).toArray(function(err, result) {
                if (err) throw err;
                response.render("supply", {info : result, profile : profile});
                db.close();
            });

        });
    }
};


exports.deleteProduct = (request, response) => {

    const id = request.query.id;

    if (request.cookies.userId == undefined) {
        response.redirect("/registration/register");
    }

    else {
    
        // Remove the product from the cart of all users
        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            var newvalues = { $pull: {InCart: ObjectId(id)} };
            dbo.collection("users").updateMany({}, newvalues, function(err, result) {
                if (err) throw err;
                db.close();
            });

        });

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            var productQuery = {"_id": ObjectId(id)};
            dbo.collection("products").deleteOne(productQuery, function(err, result) {
                if (err) throw err;
                response.redirect("/market/supply");
                db.close();
            });

        });

    }

}

exports.editProduct = (request, response) => {

    const id = request.query.id;
    const profile = request.cookies.profile;

    if (profile == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");
            var productQuery = {"_id": ObjectId(id)};
            dbo.collection("products").findOne(productQuery, function(err, result) {
                if (err) throw err;
                response.render("editProduct", {info : result, profile : profile});
                db.close();
            });
        });
    }
};

exports.confirmProduct = (request, response) => {
    
    const id = request.query.id;

    const {productName, price, stock, description} = request.body;

    if (request.cookies.userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        if (request.file) {
            var image = request.file.filename;
            MongoClient.connect(url, (err, db) => {
                
                if (err) throw err;
                var dbo = db.db("ecommerce");
                var productQuery = {"_id": ObjectId(id)};
                var newvalues = { $set: {productName: productName, price: parseFloat(price), stock: parseInt(stock),
                    description: description, image: image} };

                
                dbo.collection("products").updateOne(productQuery, newvalues, function(err, result) {
                    if (err) throw err;
                    response.redirect("/market/supply");
                    db.close();
                });

            });
        }
        else {
            MongoClient.connect(url, function(err, db) {

                if (err) throw err;
                var dbo = db.db("ecommerce");
                var productQuery = {"_id": ObjectId(id)};
                var newvalues = { $set: {productName: productName, price: parseFloat(price), stock: parseInt(stock),
                    description: description} };

                
                dbo.collection("products").updateOne(productQuery, newvalues, function(err, result) {
                    if (err) throw err;
                    response.redirect("/market/supply");
                    db.close();
                });
            });
        }

    }

};

exports.cart = (request, response) => {

    const userID = request.cookies.userId;
    const productID = request.query.id;

    if (userID == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {
                
            if (err) throw err;
            var dbo = db.db("ecommerce");
    
            var userQuery = {"_id": ObjectId(userID)};
            var newvalues = { $push: {cart: ObjectId(productID)} };
            dbo.collection("users").updateOne(userQuery, newvalues, function(err, result) {
                if (err) throw err;
                response.redirect("/market/viewCart");
                db.close();
            });
        });
    }
};

exports.viewCart = (request, response) => {

    const id = request.cookies.userId;
    const profile = request.cookies.profile;

    if (id == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {
                    
            if (err) throw err;
            var dbo = db.db("ecommerce");
            var userQuery = {"_id": ObjectId(id)};

            dbo.collection("users").findOne(userQuery, function(err, result) {
                if (err) throw err;
                var cart = result.cart;
                var cartQuery = {"_id": {$in: cart}};

                dbo.collection("products").find(cartQuery).toArray(function(err, result) {
                    if (err) throw err;

                    response.render("cart", {info : result, profile : profile});
                    
                    db.close();
                });
            });
        });
    }
};

exports.deleteCart = (request, response) => {

    const id = request.query.id;
    const userID = request.cookies.userId;

    if (userID == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {
                        
            if (err) throw err;
            var dbo = db.db("ecommerce");
    
            var userQuery = {"_id": ObjectId(userID)};
            var newvalues = { $pull: {cart: ObjectId(id)} };
            dbo.collection("users").updateOne(userQuery, newvalues, function(err, result) {
                if (err) throw err;
                response.redirect(`/market/details?id=${id}`);
                db.close();
            });
        });
    }
};

exports.review = (request, response) => {

    const productID = request.query.id;
    const review = request.body.review;
    const rating = request.body.rating;
    const userId = request.cookies.userId;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");
            var productQuery = {"_id": ObjectId(productID)};
            var newValues = { $push: {reviews: {userId: ObjectId(userId), review: review, rating: parseFloat(rating)}} };
            dbo.collection("products").updateOne(productQuery, newValues, function(err, result) {
                if (err) throw err;
                dbo.collection("products").aggregate([
                    {$match: {"_id": ObjectId(productID)}},
                    {$addFields: {avgRating: {$avg: "$reviews.rating"}}}
                ]).toArray(function(err, result) {
                    if (err) throw err;
                    var avgRating = result[0].avgRating;
                    var newvalues = { $set: {rating: avgRating} };
                    dbo.collection("products").updateOne(productQuery, newvalues, function(err, result) {
                        if (err) throw err;
                        response.redirect(`/market/details?id=${productID}`);
                        db.close();
                    })          
                });
            });
        });
    }
}

exports.confirmReview = (request, response) => {

    const {review, rating} = request.body;
    const userID = request.cookies.userId;
    const productID = request.query.id;

    if (userID == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            let updateReview = async () => {

                return new Promise((resolve, reject) => {

                    var productQuery = {"_id" : ObjectId(productID), "reviews.userId": ObjectId(userID)};
                    var newValues = {$set: {"reviews.$.review": review, "reviews.$.rating": parseFloat(rating)}};
                    dbo.collection("products").updateOne(productQuery, newValues, function(err, result) {
                        if (err) throw err;
                        resolve(result);
            
                    });

                });
            }

            let updateRating = async () => {
                    
                return new Promise((resolve, reject) => {
        
                    dbo.collection("products").aggregate([
                        {$match: {"_id": ObjectId(productID)}},
                        {$addFields: {avgRating: {$avg: "$reviews.rating"}}}
                    ]).toArray(function(err, result) {
                        if (err) throw err;
                        var avgRating = result[0].avgRating;
                        var newvalues = { $set: {rating: avgRating} };
                        var productQuery = {"_id" : ObjectId(productID)}
                        dbo.collection("products").updateOne(productQuery, newvalues, function(err, result) {
                            if (err) throw err;
                            resolve(result);
                        });
                    });
                });
            }

            let promise = async () => {

                await updateReview();
                await updateRating();
                db.close();
                response.redirect(`/market/details?id=${productID}`);
            }

            promise();

        });
    }
};

exports.deleteReview = (request, response) => {

    const productID = request.query.id;
    const userID = request.cookies.userId;

    if (userID == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {
                
            if (err) throw err;
            var dbo = db.db("ecommerce");
            var productQuery = {"_id" : ObjectId(productID)};
            var newValues = { $pull: {reviews: {userId: ObjectId(userID)}} };
            dbo.collection("products").updateOne(productQuery, newValues, function(err, result) {
                if (err) throw err;
                dbo.collection("products").aggregate([
                    {$match: {"_id": ObjectId(productID)}},
                    {$addFields: {avgRating: {$avg: "$reviews.rating"}}}
                ]).toArray(function(err, result) {
                    if (err) throw err;
                    var avgRating = result[0].avgRating;
                    var newvalues = { $set: {rating: avgRating} };
                    dbo.collection("products").updateOne(productQuery, newvalues, function(err, result) {
                        if (err) throw err;
                        response.redirect(`/market/details?id=${productID}`);
                        db.close();
                    });
                });
            });
        });
    }
};

exports.getProducts =  async (request, response) => {

    const userId = request.cookies.userId;

    if (userId == undefined) {
        response.redirect('/registration/register');
    }

    else {

        MongoClient.connect(url, function(err, db) {

            if (err) throw err;
            var dbo = db.db("ecommerce");

            var query = { "supplierID": {$ne: ObjectId(userId)},
                "stock": { $gt: 0 }, "productName": {$regex: request.query.search, $options: "i" }};
            dbo.collection("products").aggregate([
                {$match: query}
            ]).toArray(function(err, result) {
                if (err) throw err;
                response.send(result);
                db.close();
            });
        });
    }
};

exports.stocks = async (req, res) => {

    if (req.cookies.userId == undefined) {
        res.redirect('/registration/register');
    }

    else {

        async function getData() {

            var xs = [];
            var ys = [];

            const options = {
                method: 'GET',
                url: 'https://alpha-vantage.p.rapidapi.com/query',
                params: {
                    interval: '5min',
                    function: 'TIME_SERIES_INTRADAY',
                    symbol: 'MSFT',
                    datatype: 'json',
                    output_size: 'compact'
                },
                headers: {
                    'X-RapidAPI-Key': '0e1f945834mshe5dbbb5cff99d50p18fbb9jsn166d44550936',
                    'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
                }
            };

            await fetchData();

            async function fetchData() {
                await axios.request(options).then(async function (response) {
                    await convertData(response.data);
                }).catch(function (error) {
                    console.error(error);
                });
            }

            async function convertData(data) {

                json_data = data["Time Series (5min)"];

                for(var i in json_data) {
                    xs.push(i);
                    ys.push(parseFloat(json_data[i]["4. close"]));
                }
            }

            return [xs, ys]; 
        }

        async function getData2() {

            var xs = [];
            var ys = [];

            const options = {
                method: 'GET',
                url: 'https://alpha-vantage.p.rapidapi.com/query',
                params: {
                function: 'TIME_SERIES_DAILY_ADJUSTED',
                symbol: 'MSFT',
                outputsize: 'compact',
                datatype: 'json'
                },
                headers: {
                'X-RapidAPI-Key': '0e1f945834mshe5dbbb5cff99d50p18fbb9jsn166d44550936',
                'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
                }
            };

            await fetchData();

            async function fetchData() {
                await axios.request(options).then(async function (response) {
                    await convertData(response.data);
                }).catch(function (error) {
                    console.error(error);
                });
            }

            async function convertData(data) {

                json_data = data["Time Series (Daily)"];

                for(var i in json_data) {
                    xs.push(i);
                    ys.push(parseFloat(json_data[i]["4. close"]));
                }
            }

            return [xs, ys];      
            
        }

        async function getData3() {

            var xs = [];
            var ys = [];

            const options = {
                method: 'GET',
                url: 'https://alpha-vantage.p.rapidapi.com/query',
                params: {
                interval: '60min',
                function: 'TIME_SERIES_INTRADAY',
                symbol: 'MSFT',
                datatype: 'json',
                output_size: 'compact'
                },
                headers: {
                'X-RapidAPI-Key': '0e1f945834mshe5dbbb5cff99d50p18fbb9jsn166d44550936',
                'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
                }
            };

            await fetchData();

            async function fetchData() {
                await axios.request(options).then(async function (response) {
                    await convertData(response.data);
                }).catch(function (error) {
                    console.error(error);
                });
            }

            async function convertData(data) {

                json_data = data["Time Series (60min)"];

                for(var i in json_data) {
                    xs.push(i);
                    ys.push(parseFloat(json_data[i]["4. close"]));
                }
            }

            return [xs, ys];      
            
        }

        async function getData4() {

            var xs = [];
            var ys = [];

            const options = {
                method: 'GET',
                url: 'https://alpha-vantage.p.rapidapi.com/query',
                params: {
                interval: '30min',
                function: 'TIME_SERIES_INTRADAY',
                symbol: 'MSFT',
                datatype: 'json',
                output_size: 'compact'
                },
                headers: {
                'X-RapidAPI-Key': '0e1f945834mshe5dbbb5cff99d50p18fbb9jsn166d44550936',
                'X-RapidAPI-Host': 'alpha-vantage.p.rapidapi.com'
                }
            };

            await fetchData();

            async function fetchData() {
                await axios.request(options).then(async function (response) {
                    await convertData(response.data);
                }).catch(function (error) {
                    console.error(error);
                });
            }

            async function convertData(data) {

                json_data = data["Time Series (30min)"];

                for(var i in json_data) {
                    xs.push(i);
                    ys.push(parseFloat(json_data[i]["4. close"]));
                }
            }

            return [xs, ys];      
            
        }

        async function manageData() {

            var data1 = await getData();
            var data2 = await getData2();
            var data3 = await getData3();
            var data4 = await getData4();

            var data = [data1, data2, data3, data4];

            res.render("stocks", {data: data, profile: req.cookies.profile});

        }

        await manageData();
    }
};