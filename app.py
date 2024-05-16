import os

import datetime
from cs50 import SQL
from flask import Flask, flash, jsonify, redirect, render_template,request,session, url_for
from flask_session import Session
from helpers import validate_string
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///trivia.db")



@app.route("/", methods=["GET","POST"])
def hello_world():
    userName = session.get("userName")
    return render_template("landing.html", userName=userName)

@app.route("/register", methods=["GET","POST"])
def register():
    if request.method == "GET":
        return render_template("register.html")
    if request.method =="POST":
        userName = request.form.get("user").strip()
        password = request.form.get("password").strip()
        repeated_password = request.form.get("repeated_password").strip()
        if not validate_string(userName):
            return render_template("register.html",error="User name 6-12 characters without spaces.")
        if not validate_string(password):
            return render_template("register.html",error="Password 6-12 characters without spaces.")
        if password != repeated_password:
            return render_template("register.html",error="The passwords don't match")
        hashPass = generate_password_hash(password,method='pbkdf2', salt_length=16)
        try:
            existUser = db.execute("SELECT userName FROM users WHERE userName = ?",userName)
            if existUser:
                return render_template("register.html",error="The selected user name is already in use")
            db.execute("INSERT INTO users (userName,hashCode,creationDate,experience,level) VALUES (?,?,?,?,?)",userName,hashPass,datetime.datetime.now(),0,1)
        except:
            return render_template("register.html",error="Error in register")
        flash("Register successful")
        session["userName"] = userName
        return redirect("/")
    
@app.route("/login",methods=["GET","POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")
    if request.method == "POST":
        user = request.form.get("user")
        password = request.form.get("password")
        if not user or not password:
            return render_template("login.html",error="Must provide user name and password")
        existUser = db.execute("SELECT * FROM users WHERE userName = ?",user)
        if len(existUser) != 1 or not check_password_hash(existUser[0]["hashCode"], password):
            return render_template("login.html", error="invalid username and/or password")
        session["userName"] = existUser[0]["userName"]
        return redirect("/")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

@app.route("/play")
def play():    
    userName = session.get("userName")
    return render_template("game.html",userName = userName)

@app.route("/EndGame", methods= ["POST"])
def EndGame():       
    data = request.json    
    if data is not None:
        points = data['points']
        easy_correct = data['easyCorrect']
        easy_total = data['easyTotal']
        medium_correct = data['mediumCorrect']
        medium_total = data['mediumTotal']
        hard_correct = data['hardCorrect']
        hard_total = data['hardTotal']
        userName = session.get("userName")
    try:
        db.execute("BEGIN TRANSACTION")
        statId = db.execute("INSERT INTO stats (userName,easyCorrect,easyTotal,mediumCorrect,mediumTotal,hardCorrect,hardTotal) values (?,?,?,?,?,?,?)",
                userName,easy_correct,easy_total,medium_correct,medium_total,hard_correct,hard_total)
        totalCorrect = easy_correct + medium_correct + hard_correct
        db.execute("INSERT INTO games (userName,statId,score,date,totalCorrect) values (?,?,?,?,?)",userName,statId,points,datetime.datetime.now(),totalCorrect)
        db.execute("COMMIT")
        response_data = {"message": "Success"}
        return jsonify(response_data), 200
    except:
        flash("An error ocurred while submiting your score")
        db.execute("ROLLBACK")
        response_data = {"message": "Error"}
        return jsonify(response_data), 400
    
@app.route("/scores")
def scores():   
    scores = db.execute("SELECT userName, score, date,totalCorrect FROM games ORDER BY score DESC, date ASC LIMIT 100")
    for index, score in enumerate(scores, start=1):
        score['index'] = index
    page = request.args.get('page',1,type=int)
    per_page = 10
    start = (page - 1) * per_page
    end = start + per_page
    total_pages = (len(scores) + per_page - 1) // per_page
    scores_on_page = scores[start:end]
    total = len(scores)
    return render_template("scores.html",scores=scores_on_page,total_pages=total_pages,page=page,total=total)

@app.route("/stats")
def stats():
    userName = session.get("userName")
    if userName:
        stats = db.execute("SELECT SUM(easyCorrect) as easyCorrect, SUM(easyTotal) as easyTotal, \
                        SUM(mediumCorrect) as mediumCorrect, SUM(mediumTotal) as mediumTotal, \
                        SUM(hardCorrect) as hardCorrect, SUM(hardTotal) as hardTotal \
                        FROM STATS WHERE userName = ?",userName)
        topScore = db.execute("SELECT score FROM games WHERE userName = ? ORDER BY score DESC, date ASC LIMIT 1",userName)    
        if stats[0]["easyCorrect"] is not None:
            return render_template("stats.html",stats=stats[0],userName=userName,topScore=topScore[0])
        else:
            return render_template("stats.html",userName=userName)
    else:
        return redirect("/")
    
@app.route("/user_games")
def user_games():
    userName = session.get("userName")
    user_games = db.execute("SELECT * FROM games WHERE userName = ? ORDER BY score DESC",userName)
    for index, game in enumerate(user_games, start=1):
        game['index'] = index
    page = request.args.get('page',1,type=int)
    per_page = 5
    start = (page - 1) * per_page
    end = start + per_page
    total_pages = (len(user_games) + per_page - 1) // per_page
    games_on_page = user_games[start:end]    
    if games_on_page:
        return render_template("user_games.html",games = games_on_page,total_pages=total_pages,page=page)
    else:
        return redirect("/stats")

    
    
    




if __name__ == "__main__":
    app.run(debug=True)

