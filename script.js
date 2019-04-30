
function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}
Array.prototype.diff = function (a) {
    return this.filter(function (i) { return a.indexOf(i) < 0; });
};
Array.prototype.getUnique = function () {
    var u = {}, a = [];
    for (var i = 0, l = this.length; i < l; ++i) {
        if (u.hasOwnProperty(this[i])) {
            continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
    }
    return a;
}


angular.module('kick', ["firebase", "ngAnimate"])
    .controller('kickeria', function ($scope, $http, $firebaseArray) {
        $scope.showPredictions = false;
        $scope.fixedPositions = true;
        $scope.showQuality = true;
        $scope.showExperimentalStats = false;
        $scope.fairMatch = true;
        $scope.orderByField = "Highscore.NumWins";
        $scope.reverseSort = true;
        $scope.showOdds = true;
        $scope.options = [{ Id: "new", Description: "New tournament" },
            { Id: "T1", Description: "Day 1 (8-Apr-2016)" },
            { Id: "T2", Description: "Day 2 (28-Apr-2016)" },
            { Id: "t3", Description: "Day 3 (2-Jun-2016)" },
            { Id: "t4", Description: "Day 4 (29-Jun-2016)" },
            { Id: "t5", Description: "Day 5 (11-Aug-2016)" },
            { Id: "tall", Description: "All (1-4)" }];
            
        $scope.selectedTournament = $scope.options[0];
            
        var margin = 0.1;
            
        // function initTrueSkillFromDb(){
        //     var myDataRef = new Firebase('https://resplendent-heat-7645.firebaseio.com/tournaments/' + 'tall' + "/games");
        //     
        //     var allgames = $firebaseArray(myDataRef);
        // }
        // 
        $scope.tournamentChange = function () {
			var firebaseUrl = 'TODO insert here' ;
            var myDataRef = new Firebase(firebaseUrl+'tournaments/' + $scope.selectedTournament.Id + "/games");
            var myDataRefPlayers = new Firebase(firebaseUrl+'tournaments/' + $scope.selectedTournament.Id + "/players");
            var prevUsedPlayerRef = new Firebase(firebaseUrl+'tournaments/' + $scope.selectedTournament.Id + "/usedplayers");

            $scope.activeplayers = $firebaseArray(myDataRefPlayers);
            $scope.games = $firebaseArray(myDataRef);
            
            $scope.previouslyUsed = $firebaseArray(prevUsedPlayerRef);


            $scope.games.$loaded().then(updateHighscore);
            $scope.scoreChanged = function (w) {
                $scope.games.$save(w);
                updateHighscore();
            };

            $scope.isDisabled = $scope.selectedTournament.Id != "new";
        };
        $scope.addplayer = function () {
            if ($scope.newplayer){
                if($scope.activeplayers.filter(function(f){ return f.Name == $scope.newplayer;}).length > 0){
                    alert('Player already added');
                }
                else{
                    $scope.activeplayers.$add({ Name: $scope.newplayer, IsActive: true });
                    $scope.newplayer = "";
                }
            }
            else
                alert("Enter player name!")
        }
        $scope.changeActive = function (player) {
            $scope.activeplayers.$save(player);
        }
        

  
         function initHS(){
             return { NumGames: 0, NumWins: 0, NumZeros: 0, NumEarned:0,  Trueskill: { Mu: initMu, Sigma: initSigma }, AttackTrueskill: { Mu: initMu, Sigma: initSigma }, DefenseTrueskill: { Mu: initMu, Sigma: initSigma } };
         }
        function gamequality(p1,p2,p3,p4){
                if( p1.Highscore === undefined || p1.Highscore.Trueskill === undefined)
                    p1.Highscore = initHS();
                if(p2.Highscore === undefined || p2.Highscore.Trueskill === undefined)
                    p2.Highscore = initHS();
                if(p3.Highscore === undefined ||p3.Highscore.Trueskill === undefined)
                    p3.Highscore = initHS();
                if(p4.Highscore === undefined ||p4.Highscore.Trueskill === undefined)
                    p4.Highscore = initHS();
                    
                var team1StdSq = sq(p1.Highscore.Trueskill.Sigma) +sq(p2.Highscore.Trueskill.Sigma);
                var team2StdSq = sq(p3.Highscore.Trueskill.Sigma) +sq(p4.Highscore.Trueskill.Sigma);
                
                var team1MeanSum = p1.Highscore.Trueskill.Mu + p2.Highscore.Trueskill.Mu;
                var team2MeanSum = p3.Highscore.Trueskill.Mu + p4.Highscore.Trueskill.Mu;
                
                var sqrtPart = Math.sqrt((4*betaSq)/(4*betaSq+team1StdSq + team2StdSq));
                var expPart = Math.exp((-1*(sq(team1MeanSum-team2MeanSum))) / (2*(4*betaSq + team1StdSq + team2StdSq)));
                return sqrtPart * expPart;
            }
         function probTeam1(p1,p2,p3,p4){                           
                var m = p1.Highscore.Trueskill.Mu+p2.Highscore.Trueskill.Mu - p3.Highscore.Trueskill.Mu-p4.Highscore.Trueskill.Mu;
                
                var s = Math.sqrt(sq(p1.Highscore.Trueskill.Sigma)+sq(p2.Highscore.Trueskill.Sigma)+sq(p3.Highscore.Trueskill.Sigma)+sq(p4.Highscore.Trueskill.Sigma))+tauSq;
                return GaussianCumulativeTo(m/s);
            }
            
        var updateHighscore = function () {
            var result=[];
            var allMentionedPlayers = [];            
            $scope.games.forEach(function (game) {
                allMentionedPlayers.push(game.Player1, game.Player2, game.Player3, game.Player4);
            });
            
            var ump = allMentionedPlayers.filter(onlyUnique);
            var missingPlayers = ump.diff($scope.activeplayers.map(function (p) { return p.Name; }));
            missingPlayers.forEach(function (m) {
                $scope.activeplayers.$add({ Name: m, IsActive: true });
            });

            var activeplayers = $scope.activeplayers;


            activeplayers.forEach(function (player) { player.Highscore = initHS() });

            var totalGames = 0;
            var totalZeros = 0;
            var friendly = [];
            var hostile = [];
                        
            /* True skill, leaderboard etc. */
            
            $scope.games.forEach(function (g) {
                totalGames = totalGames + 1;
                
                var player1 = activeplayers.filter(function (p) { return p.Name == g.Player1; })[0];
                var player2 = activeplayers.filter(function (p) { return p.Name == g.Player2; })[0];
                var player3 = activeplayers.filter(function (p) { return p.Name == g.Player3; })[0];
                var player4 = activeplayers.filter(function (p) { return p.Name == g.Player4; })[0];                
             
                g.ProbTeam1 = probTeam1(player1,player2,player3,player4);
                g.ProbTeam2 = 1-g.ProbTeam1;
                
                g.GameQuality = gamequality(player1,player2,player3,player4);
                
                g.Odds1 = Math.min(Math.max((1-margin) / g.ProbTeam1, 1.01), 50);
                g.Odds2 = Math.min(Math.max((1-margin) / (1-g.ProbTeam1), 1.01), 50);
                
                if (g.ScoreTeam1 !== undefined && g.ScoreTeam2 !== undefined) {

                    g.Player1Old = player1.Highscore.Trueskill;
                    g.Player2Old = player2.Highscore.Trueskill;
                    g.Player3Old = player3.Highscore.Trueskill;
                    g.Player4Old = player4.Highscore.Trueskill;
                    
                    var newTrueskills = calcTrueskill(player1.Highscore.Trueskill, player2.Highscore.Trueskill, player3.Highscore.Trueskill, player4.Highscore.Trueskill, g.ScoreTeam1 > g.ScoreTeam2, Math.abs(g.ScoreTeam1-g.ScoreTeam2));
                    player1.Highscore.Trueskill = newTrueskills[0];
                    player2.Highscore.Trueskill = newTrueskills[1];
                    player3.Highscore.Trueskill = newTrueskills[2];
                    player4.Highscore.Trueskill = newTrueskills[3];
                    
                     var newAttackDefenseTrueskills = calcTrueskill(player1.Highscore.AttackTrueskill, player2.Highscore.DefenseTrueskill, player3.Highscore.AttackTrueskill, player4.Highscore.DefenseTrueskill, g.ScoreTeam1 > g.ScoreTeam2, Math.abs(g.ScoreTeam1-g.ScoreTeam2));
                    player1.Highscore.AttackTrueskill = newAttackDefenseTrueskills[0];
                    player2.Highscore.DefenseTrueskill = newAttackDefenseTrueskills[1];
                    player3.Highscore.AttackTrueskill = newAttackDefenseTrueskills[2];
                    player4.Highscore.DefenseTrueskill = newAttackDefenseTrueskills[3];
                                        
                    g.Player1Diff = player1.Highscore.Trueskill.Diff;
                    g.Player2Diff = player2.Highscore.Trueskill.Diff;
                    g.Player3Diff = player3.Highscore.Trueskill.Diff;
                    g.Player4Diff = player4.Highscore.Trueskill.Diff;                    
                 
                    friendly.push({ Name: g.Player1, Ally: g.Player2 });
                    friendly.push({ Name: g.Player2, Ally: g.Player1 });
                    friendly.push({ Name: g.Player3, Ally: g.Player4 });
                    friendly.push({ Name: g.Player4, Ally: g.Player3 });
                    hostile.push({ Name: g.Player1, Enemy: g.Player3 });
                    hostile.push({ Name: g.Player1, Enemy: g.Player4 });
                    hostile.push({ Name: g.Player2, Enemy: g.Player3 });
                    hostile.push({ Name: g.Player2, Enemy: g.Player4 });
                    hostile.push({ Name: g.Player3, Enemy: g.Player1 });
                    hostile.push({ Name: g.Player3, Enemy: g.Player2 });
                    hostile.push({ Name: g.Player4, Enemy: g.Player1 });
                    hostile.push({ Name: g.Player4, Enemy: g.Player2 });
                    
                    if (g.ScoreTeam1 > g.ScoreTeam2) {
                        // winners
                        player1.Highscore.NumGames++;
                        player1.Highscore.NumWins++;
                        player2.Highscore.NumGames++;
                        player2.Highscore.NumWins++;
                        // losers
                        player3.Highscore.NumGames++;
                        player4.Highscore.NumGames++;
                        if (g.ScoreTeam2 == 0) { 
                            player3.Highscore.NumZeros++;
                            player4.Highscore.NumZeros++;
                            totalZeros += 2;
                            
                            player1.Highscore.NumEarned++;
                            player2.Highscore.NumEarned++;
                        }
                    }
                    if (g.ScoreTeam1 < g.ScoreTeam2) {
                        // losers
                        player1.Highscore.NumGames++;
                        player2.Highscore.NumGames++;

                        // winners
                        player3.Highscore.NumGames++;
                        player3.Highscore.NumWins++;
                        player4.Highscore.NumGames++;
                        player4.Highscore.NumWins++;
                        if (g.ScoreTeam1 == 0) { 
                            player1.Highscore.NumZeros++;
                            player2.Highscore.NumZeros++;
                            totalZeros += 2;
                            
                            player3.Highscore.NumEarned++;
                            player4.Highscore.NumEarned++;
                        }
                    }
                    if (g.ScoreTeam1 === g.ScoreTeam2) {
                        alert("Error, cannot have the same score!");
                    }
                }
            });
            var hs = activeplayers.map(function (player) {
                return { Name: player.Name, Highscore: player.Highscore };
            });
            // hs.sort(function(a,b){return a.Highscore.NumWins-b.Highscore.NumWins;});
            // hs.reverse();
            $scope.highScore = hs;
            $scope.highScore.totalGames = totalGames;
            $scope.highScore.totalZeros = totalZeros;


            var line1 = [{ Friends: "Friends/Enemies", Enemies: "Friends/Enemies" }];

            activeplayers.forEach(function (p) {
                line1.push({ Friends: p.Name, Enemies: p.Name });
            })

            var friends = [line1];
            activeplayers.forEach(function (p1) {
                var list = [{ Friends: p1.Name, Enemies: p1.Name }];

                activeplayers.forEach(function (p2) {
                    var f = friendly.filter(function (f) { return f.Name == p1.Name && f.Ally == p2.Name; }).length;
                    var e = hostile.filter(function (f) { return f.Name == p1.Name && f.Enemy == p2.Name; }).length;
                    list.push({ Friends: f, Enemies: e });
                })
                friends.push(list);
            })
            $scope.friends = friends;

        };

        var previouslyUsed = [];

        $scope.newmatch = function () {
            
            // alert('Only host can shuffle maps');
            // return;
            
            var matchup = [];
            var seeded = [];
            var doReseed = false;
            var allplayers = $scope.activeplayers.filter(function (p) { return p.IsActive; }).map(function (a) { return a.Name; });
            if (allplayers.length >= 4) {
                while (matchup.length < 4) {
                    var pool = allplayers.diff(matchup).diff(previouslyUsed);
                    // var pool = allplayers.diff(matchup).diff($scope.previouslyUsed);
                    if (pool.length > 0) {
                        var rnd = Math.floor((Math.random() * pool.length));
                        matchup.push(pool[rnd]);
                    }
                    else {
                        if (matchup.length > 0) {
                            seeded = matchup.slice();
                            doReseed = true;
                        }
                        previouslyUsed = [];
                        // $scope.previouslyUsed = [];
                    }
                }
               previouslyUsed.push(matchup[0], matchup[1], matchup[2], matchup[3]);
                // $scope.previouslyUsed.push(matchup[0], matchup[1], matchup[2], matchup[3]);

                if (doReseed) {
                    previouslyUsed = previouslyUsed.diff(seeded);
                    //  $scope.previouslyUsed = $scope.previouslyUsed.diff(seeded);
                }
                
                var player1 = $scope.activeplayers.filter(function (p) { return p.Name == matchup[0]; })[0];
                var player2 = $scope.activeplayers.filter(function (p) { return p.Name == matchup[1]; })[0];
                var player3 = $scope.activeplayers.filter(function (p) { return p.Name == matchup[2]; })[0];
                var player4 = $scope.activeplayers.filter(function (p) { return p.Name == matchup[3]; })[0];            
                
                // matchmaking
                var g1 = gamequality(player1,player2,player3,player4);
                var g2 = gamequality(player1,player3,player2,player4);
                var g3 = gamequality(player1,player4,player3,player2);
                
                var p1 = probTeam1(player1,player2,player3,player4);
                var p2 = probTeam1(player1,player3,player2,player4);
                var p3 = probTeam1(player1,player4,player3,player2);
                
                console.log(player1.Name,player2.Name,player3.Name,player4.Name);
                console.log(g1,g2,g3);
                
                if($scope.fairMatch){
                    if(g1 >= g2 && g1 >= g3) { // g1 is best                       
                        $scope.games.$add({
                            Player1: player1.Name,
                            Player2: player2.Name,
                            Player3: player3.Name,
                            Player4: player4.Name,
                            GameQuality: g1,
                            ProbTeam1: p1,
                            Odds1: Math.min(Math.max((1-margin) / p1, 1.0), 50),
                            Odds2: Math.min(Math.max((1-margin) / (1-p1), 1.0), 50)
                        });
                    }
                    else if (g2 >= g1 && g2 >= g3) { // g2 is best
                        $scope.games.$add({
                            Player1: player1.Name,
                            Player2: player3.Name,
                            Player3: player2.Name,
                            Player4: player4.Name,
                            GameQuality: g2,
                            ProbTeam1: p2,
                            Odds1: Math.min(Math.max((1-margin) / p2, 1.0), 50),
                            Odds2: Math.min(Math.max((1-margin) / (1-p2), 1.0), 50)
                        });
                    }
                    else{ // so, g3 is the best..
                        $scope.games.$add({
                            Player1: player1.Name,
                            Player2: player4.Name,
                            Player3: player3.Name,
                            Player4: player2.Name,
                            GameQuality: g3,
                            ProbTeam1: p3,
                            Odds1: Math.min(Math.max((1-margin) / p3, 1.0), 50),
                            Odds2: Math.min(Math.max((1-margin) / (1-p3), 1.0), 50)
                        });
                    }
                }
                else{
                     $scope.games.$add({
                            Player1: player1.Name,
                            Player2: player2.Name,
                            Player3: player3.Name,
                            Player4: player4.Name,
                            GameQuality: g1,
                            ProbTeam1: p1,
                            Odds1: Math.min(Math.max((1-margin) / p1, 1.0), 50),
                            Odds2: Math.min(Math.max((1-margin) / (1-p1), 1.0), 50)
                        });
                }
            }
            else {
                alert("Need >= 4 active players!")
            }
        }

        $scope.tournamentChange();
    });