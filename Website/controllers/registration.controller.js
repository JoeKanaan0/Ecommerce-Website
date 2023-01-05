var MongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;
var url =  "mongodb://localhost:27017/";

exports.register = (request, response) => {
    response.clearCookie("userName");
    response.clearCookie("userId");
    response.clearCookie("profile");
    response.render("register", {register: undefined});
}

exports.login = (request, response) => {
    const name = request.body.name;
    const password = request.body.password;

    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("ecommerce");
        var query = { userName: { $regex: new RegExp('^' + name + '$', 'i') } };

        dbo.collection("users").find(query).toArray(function(err, result) {
            if (err) throw err;
            if (result.length == 0) {
                response.render("register", {name: name, password: password, error: 0, register: false})
            }

            else {

                if (result[0].password == password) {
                    response.cookie("userName", name);
                    response.cookie("userId", result[0]._id);
                    response.cookie("profile", result[0].profile);
                    response.redirect(`/market/`);
                }

                else {
                    response.render("register", {name: name, password: password, error: 1, register: false})
                }
            }

            db.close();
        });
    });
};

exports.signUp = (request, response) => {

    MongoClient.connect(url, function(err, db) {

        if (err) throw err;

        const {name, email, password} = request.body;
        const profile = "default-profile.jpg";
        var user = {
            userName: name,
            email: email,
            password: password,
            profile: profile,
            cart: [],
            transactions: [],
        }

        var dbo = db.db("ecommerce");

        dbo.collection("users").find({email: { $regex: new RegExp('^' + email + '$', 'i') }}).toArray(function(err, result) {

            if (err) throw err;

            if (result.length > 0) {
                response.render("register", {name: name, password: password, email: email, error: 0, register: true})
            }

            else {

                dbo.collection("users").find({userName: { $regex: new RegExp('^' + name + '$', 'i') }}).toArray(function(err, result) {

                    if (err) throw err;

                    if (result.length > 0) {
                        response.render("register", {name: name, password: password, email: email, error: 1, register: true})
                    }

                    else {
                        dbo.collection("users").insertOne(user, function(err, result) {
                            response.cookie("userName", name);
                            response.cookie("profile", profile);
                            response.redirect(`/market/redirect`);
                            db.close();
                        });
                    }

                });

            }

        });

    });
};



exports.profile = (request, response) => {

    const userId = request.cookies.userId;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("ecommerce");
            var query = { "_id": ObjectId(userId) };
            dbo.collection("users").find(query).toArray(function(err, result) {
                if (err) throw err;
                response.render("profile", {info: result[0]});
                db.close();
            });
        });
    }
}


exports.editProfile = (request, response) => {

    const userName = request.body.userName;
    const pass1 = request.body.password;
    const pass2 = request.body.confirm;
    const userId = request.cookies.userId;

    if (userId == undefined) {
        response.redirect("/registration/register");
    }

    else {

        if (pass1 != pass2) {
            response.send("Passwords are different")
            //response.redirect("/registration/profile");
        }

        else if (userName != request.cookies.userName) {

            MongoClient.connect(url, function(err, db) {

                if (err) throw err;

                dbo = db.db("ecommerce");
                var query = { userName: userName };
                dbo.collection("users").find(query).toArray(function(err, result) {

                    if (err) {
                        throw err;
                    }
        
                    else if (result.length != 0) {
                        response.send("Name already exists.")
                    }

                    else {

                        MongoClient.connect(url, function(err, db) {

                            if (err) throw err;
                            dbo = db.db("ecommerce");
                            var query = { "_id": ObjectId(userId) };

                            var newValues;

                            if (request.file == undefined) {
                                newValues = { $set: {userName: userName, password: pass1} };
                            }
                            else {
                                newValues = { $set: {userName: userName, password: pass1, profile: request.file.filename} };
                                response.cookie("profile", request.file.filename);
                            }

                            dbo.collection("users").updateOne(query, newValues, function(err, result) {
                                if (err) throw err;
                                response.cookie("userName", userName);
                                response.redirect("/registration/profile");
                            });

                        });

                    }
                    db.close();

                });

            });

        }

        else {

            MongoClient.connect(url, function(err, db) {

                if (err) throw err;
                dbo = db.db("ecommerce");
                var query = { "_id": ObjectId(userId) };

                var newValues;

                if (request.file == undefined) {
                    newValues = { $set: {password: pass1} };
                }
                else {
                    newValues = { $set: {password: pass1, profile: request.file.filename} };
                    response.cookie("profile", request.file.filename);
                }

                dbo.collection("users").updateOne(query, newValues, function(err, result) {
                    if (err) throw err;
                    response.cookie("userName", userName);
                    response.redirect("/registration/profile");
                    db.close();
                });
            });
        }
    }
};