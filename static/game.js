document.addEventListener("DOMContentLoaded", function() {
    // Your code here
    let lives = 3
    let points = 0
    let easyCorrect = 0
    let easyTotal = 0
    let mediumCorrect = 0
    let mediumTotal = 0
    let hardCorrect = 0
    let hardTotal = 0

    const easyValue = 100
    const mediumValue = 150
    const hardValue = 200

    


    async function fetchQuestions(amount, token) {
        let url = `https://opentdb.com/api.php?amount=${amount}&encode=base64`;
        
        // If token is provided, append it to the URL
        if (token) {
            url += `&token=${token}`;
        }
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching questions:', error);
            return null;
        }
    }

    async function retrieveToken() {
        try {
            const response = await fetch('https://opentdb.com/api_token.php?command=request');
            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Error retrieving session token:', error);
            return null;
        }
    }

    function resetCountdownAnimation() {
        let countdown = document.getElementById('countdown');
        countdown.classList.remove('countdown');
        void countdown.offsetWidth; // Trigger reflow
        countdown.classList.add('countdown');
    }    

    async function startGame() {
        let token = await retrieveToken();
        
        if (token) {
            // Fetch 10 questions using the retrieved token
            let questions = await fetchQuestions(10, token);
            let container = document.getElementById("answers-container")
            let livesContainer = document.getElementById("lives")
            let difficultyContainer = document.getElementById("difficulty")
            let pointsContainer = document.getElementById("points")

            
            if (questions && questions.response_code === 0) {                
                question = document.getElementById("question");
                
                for (let i = 0; i < questions.results.length; i++){
                    if(lives === 0){                        
                        break;
                    }
                    
                    question.innerText = atob(questions.results[i].question);
                    // Get the possible answers array
                    let possibleAnswers = [
                        questions.results[i].correct_answer,
                        ...questions.results[i].incorrect_answers
                    ];

                    // Shuffle the possible answers array
                    possibleAnswers = shuffleArray(possibleAnswers);

                    // Populate the answers into the HTML
                    for (let j = 0; j < possibleAnswers.length; j++) {
                        let answerElement = document.createElement("span")
                        let answerContainer = document.createElement("div")
                        answerContainer.appendChild(answerElement)                        
                        container.appendChild(answerContainer)
                        answerElement.innerText = atob(possibleAnswers[j]);
                        let difficulty = atob(questions.results[i].difficulty)

                        answerContainer.addEventListener('click',function(){
                            if (answerElement.innerText === atob(questions.results[i].correct_answer)){
                                console.log('Correct!');
                                
                                switch(difficulty){
                                    case "easy":
                                        points += easyValue
                                        easyCorrect += 1
                                        easyTotal += 1
                                        break;
                                    case "medium":
                                        points += mediumValue
                                        mediumCorrect += 1
                                        mediumTotal += 1
                                        break;
                                    case "hard":
                                        points += hardValue
                                        hardCorrect += 1
                                        hardTotal += 1
                                        break;
                                }
                            } else{
                                console.log("Incorrect!");
                                switch(difficulty){
                                    case "easy":                                        
                                        easyTotal += 1
                                        console.log(easyTotal)
                                        break;
                                    case "medium":                                       
                                        mediumTotal += 1
                                        console.log(mediumTotal)
                                        break;
                                    case "hard":                                        
                                        hardTotal += 1
                                        console.log(hardTotal)
                                        break;
                                }                             
                                lives --;
                            }
                        })

                        pointsContainer.innerText = `POINTS: ${points}`

                        let livesText = "LIVES: "
                        for (let i = 0; i < lives; i++){
                            livesText += "*"
                        }                   
                        livesContainer.innerText = livesText

                        let difficultyText = atob(questions.results[i].difficulty)                        
                        difficultyContainer.innerText = `DIFFICULTY: ${difficultyText}`                        
                        
                        resetCountdownAnimation();
                    }

                    

                    let result = await waitForAnswer();
                    if (result === "timeout")
                        lives--
                    container.innerHTML = "";
                    question.innerHTML = "";      
                    livesContainer.innerText = "LIVES: "
                    difficultyContainer.innerText = "DIFFICULTY: "            
                }                
            } else {
                console.error('Error fetching questions:', questions ? questions.response_message : 'Unknown error');
            }

            if (lives > 0){
                startGame();
            }
        } else {
            console.error('Failed to retrieve session token');
        }
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function waitForAnswer() {
        return new Promise(resolve => {
            let answerContainers = document.querySelectorAll('#answers-container > div');
    
            // Event listener function
            function onClick(event) {
                // Remove event listeners to prevent further clicks
                answerContainers.forEach(container => {
                    container.removeEventListener('click', onClick);
                });
                resolve(event.target.innerText);
            }
    
            // Add event listeners
            answerContainers.forEach(answerContainer => {
                answerContainer.addEventListener('click', onClick);
            });
    
            // Set a timer for 7 seconds
            setTimeout(() => {
                // Remove event listeners if time limit exceeded
                answerContainers.forEach(container => {
                    container.removeEventListener('click', onClick);
                });
                // Resolve with a special value indicating timeout
                resolve('timeout');
            }, 7000); // 7 seconds
        });
    }

    async function endGame() {
        let container = document.getElementById("answers-container")
        let userName = document.getElementById("userName").innerText;
        console.log(userName)
        if (userName){
            let button = document.createElement("button");
            button.innerText = "Submit Score";
            button.type = "button";
            // Set the button's onclick event to send data to the '/EndGame' route
            button.onclick = function() {
                sendData();
            };
            // Append the button to the container
            container.appendChild(button);
        }
        else{
            let p = document.createElement("p")
            p.innerText = "You have to be signed in to submit a score"
            container.appendChild(p)
        }
        
    
        // Data to be sent to the route
        const data = {
            points: points,
            easyCorrect: easyCorrect,
            easyTotal: easyTotal,
            mediumCorrect: mediumCorrect,
            mediumTotal: mediumTotal,
            hardCorrect: hardCorrect,
            hardTotal: hardTotal
        };
    
        // Function to send data to the route
        async function sendData() {
            try {
                const response = await fetch('/EndGame', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    // Redirect to the specified URL
                    window.location.href = "/";
                } else {
                    // Handle other response statuses (e.g., 4xx, 5xx)
                    console.error('Error:', response.statusText);
                    window.location.href = "/";
                }                
            } catch (error) {
                console.error('Error:', error);
                window.location.href = "/";
            }
        }
    }


    async function runGame() {
        await startGame();
        endGame();
    }
    
    runGame();
});